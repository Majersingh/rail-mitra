import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// ─── Types ───────────────────────────────────
interface StationStop {
  stationCode: string;
  stationName: string;
  arrivalTime: string;
  departureTime: string;
  haltTime: string;
  distance: string;
  dayCount: string;
  stnSerialNumber: string;
  stationStatus: string;
}

// ─── Headers ─────────────────────────────────
const IRI_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  "upgrade-insecure-requests": "1",
};

// ─── Step 1: Resolve IRI train ID ────────────
async function resolveTrainId(
  trainNo: string
): Promise<{ iriId: string; trainNo: string; trainName: string } | null> {
  const url = `https://indiarailinfo.com/shtml/list.shtml?LappGetTrainList/${trainNo}/0/0/0?&date=${Date.now()}&seq=1`;

  const res = await fetch(url, {
    headers: {
      accept: "*/*",
      "x-requested-with": "XMLHttpRequest",
      referer: "https://indiarailinfo.com/",
      "user-agent": IRI_HEADERS["user-agent"],
    },
    next: { revalidate: 86400 },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const firstRow = $("tr.rowM1").first();
  if (!firstRow.length) return null;

  const tds = firstRow.find("td");
  const iriId = tds.first().text().trim();
  const fullName = tds.last().text().trim(); // "19045/Tapti Ganga Express"
  const slashIdx = fullName.indexOf("/");

  return {
    iriId,
    trainNo: slashIdx > -1 ? fullName.slice(0, slashIdx).trim() : trainNo,
    trainName: slashIdx > -1 ? fullName.slice(slashIdx + 1).trim() : "",
  };
}

// ─── Step 2: Scrape train page ────────────────
async function scrapeTrainPage(iriId: string, trainNo: string, trainName: string) {
  const res = await fetch(`https://indiarailinfo.com/train/${iriId}`, {
    headers: { ...IRI_HEADERS, referer: "https://indiarailinfo.com/" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`IRI returned ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // ── Run days from meta description ──
  const description = $('meta[name="description"]').attr("content") ?? "";
  const runDays = extractRunDays(description);

  // ── Source / Destination codes ──
  // FilterTrip inputs: value="STSurat" → extract leading uppercase code
  const fromVal = $("#FilterTripFromStationBox").attr("value") ?? "";
  const toVal   = $("#FilterTripToStationBox").attr("value") ?? "";
  const srcCode  = fromVal.match(/^([A-Z]{1,6})/)?.[1] ?? "";
  const destCode = toVal.match(/^([A-Z]{1,6})/)?.[1] ?? "";

  // ── Station rows ──
  // THE KEY FIX: IRI renders attributes WITHOUT quotes: trn1619 seqNum17
  // Cheerio parses these as boolean attributes (no value).
  // So we select by the container class "newbg" and look for child divs
  // that have a numeric first child (the serial number).
  //
  // Actual rendered HTML (from live page):
  //   <div trn1619 seqNum16 class="...brownColor">
  //     <div style="width:35px">16</div>   ← serial
  //     <div style="width:40px">...</div>  ← track
  //     <div style="width:40px"><a><b>JBP</b></a></div>  ← code
  //     <div style="width:30px">...</div>  ← XO
  //     <div style="width:45px">...</div>  ← quota
  //     <div style="width:50px">23:49</div>  ← arrival
  //     <div style="width:50px">-</div>      ← avg arr (skip)
  //     <div style="width:50px">23:59</div>  ← departure
  //     <div style="width:50px">-</div>      ← avg dep (skip)
  //     <div style="width:35px">10m</div>    ← halt
  //     <div style="width:60px">4,5</div>    ← platform
  //     <div style="width:40px">1</div>      ← day
  //     <div style="width:45px"><span title="Official Km 889.1|886.3"/></div> ← km
  //   </div>
  //
  // Since attrs are unquoted booleans, select via container + filter by serial:

  const stationList: StationStop[] = [];

  // The timetable section is inside div.newbg (or div.newschable)
  // Each halt row is a direct child div of that section
  // We identify them by: has child div[style*="width:35px"] with numeric text
  $("div.newschable > div, div.newschtable > div").each((_, el) => {
    // Skip intermediate collapsed rows (they have width:265px as first child)
    const firstChildStyle = $(el).children("div").first().attr("style") ?? "";
    if (firstChildStyle.includes("265px")) return;
    if ($(el).hasClass("intrmdtstn")) return;

    const cols = $(el).children("div");
    if (cols.length < 10) return;

    // col[0] = serial number
    const serialRaw = cols.eq(0).text().trim();
    if (!/^\d+$/.test(serialRaw)) return;

    // col[2] = station code inside <b>
    const boldCode =
      cols.eq(2).find("b").first().text().trim() ||
      cols.eq(2).find("a").first().text().trim().split(/\s/)[0];

    if (!boldCode || boldCode.length > 7) return;

    // Station name from <a title="KTEKatni Junction 6 PFs...">
    const titleAttr = cols.eq(2).find("a").first().attr("title") ?? "";
    const stnName = parseStationName(titleAttr, boldCode);

    // col[5]=arrival, col[7]=departure
    const arrTime  = parseTime(cols.eq(5).text().trim());
    const depTime  = parseTime(cols.eq(7).text().trim());

    // col[9]=halt, col[11]=day, col[12]=distance
    const haltTime = cols.eq(9).text().trim() || "--";
    const dayCount = cols.eq(11).text().trim();
    const kmTitle  = cols.eq(12).find("span").attr("title") ?? "";
    const distance = kmTitle.match(/[\d.]+/)?.[0]
      ?? cols.eq(12).text().trim().replace(/[^\d.]/g, "")
      ?? "0";

    stationList.push({
      stationCode:     boldCode.toUpperCase(),
      stationName:     stnName,
      arrivalTime:     arrTime,
      departureTime:   depTime,
      haltTime:        haltTime,
      distance:        distance || "0",
      dayCount:        /^\d+$/.test(dayCount) ? dayCount : "1",
      stnSerialNumber: serialRaw,
      stationStatus:   "N",
    });
  });

  // Fix source / destination status
  if (stationList.length > 0) {
    stationList[0].stationStatus = "D";
    stationList[stationList.length - 1].stationStatus = "A";
  }

  return {
    trainNumber:  trainNo,
    trainName,
    stationFrom:  srcCode  || stationList[0]?.stationCode  || "",
    stationTo:    destCode || stationList[stationList.length - 1]?.stationCode || "",
    ...runDays,
    stationList,
  };
}

// ─── Helpers ──────────────────────────────────
function parseTime(raw: string): string {
  if (!raw) return "00:00";
  if (["-", "–", "source", "dest", "origin"].includes(raw.toLowerCase())) return "00:00";
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function parseStationName(titleAttr: string, code: string): string {
  if (!titleAttr) return code;
  // title = "KTEKatni Junction 6 PFs..." or "KTE|Katni Junction..."
  let raw = titleAttr.split("\n")[0].trim();
  raw = raw.replace(new RegExp(`^${code}[|\\s]?`, "i"), "").trim();
  raw = raw.replace(/\s+\d+\s+PFs?.*$/i, "").replace(/\s*\(.*?\).*$/, "").trim();
  return raw || code;
}

function extractRunDays(desc: string) {
  const m = desc.match(/Departs\s+([\w,]+)\s+from/i);
  const s = (m?.[1] ?? "").toLowerCase();
  return {
    trainRunsOnSun: /sun/.test(s) ? "Y" : "N",
    trainRunsOnMon: /mon/.test(s) ? "Y" : "N",
    trainRunsOnTue: /tue/.test(s) ? "Y" : "N",
    trainRunsOnWed: /wed/.test(s) ? "Y" : "N",
    trainRunsOnThu: /thu/.test(s) ? "Y" : "N",
    trainRunsOnFri: /fri/.test(s) ? "Y" : "N",
    trainRunsOnSat: /sat/.test(s) ? "Y" : "N",
  };
}

// ─── Route Handler ────────────────────────────
export async function GET(req: NextRequest) {
  const trainNo   = req.nextUrl.searchParams.get("trainNo");
  const trainName = req.nextUrl.searchParams.get("trainName") ?? "";

  if (!trainNo) return NextResponse.json({ error: "Missing trainNo" }, { status: 400 });

  try {
    const resolved = await resolveTrainId(trainNo);
    if (!resolved) {
      return NextResponse.json({ error: `Train ${trainNo} not found` }, { status: 404 });
    }

    const detail = await scrapeTrainPage(
      resolved.iriId,
      resolved.trainNo,
      resolved.trainName || trainName
    );

    return NextResponse.json(detail, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("train-detail error:", err);
    return NextResponse.json({ error: "Failed to fetch train detail" }, { status: 500 });
  }
}
