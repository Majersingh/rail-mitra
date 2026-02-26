import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const IRI_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "upgrade-insecure-requests": "1",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
};

// ─────────────────────────────────────────────
// Step 1: Get IRI internal train ID from train number
// Returns e.g. { iriId: "1619", trainNo: "19045", trainName: "Tapti Ganga Express" }
// ─────────────────────────────────────────────
async function resolveTrainId(
  trainNo: string
): Promise<{ iriId: string; trainNo: string; trainName: string } | null> {
  const ts = Date.now();
  const url = `https://indiarailinfo.com/shtml/list.shtml?LappGetTrainList/${trainNo}/0/0/0?&date=${ts}&seq=1`;

  const res = await fetch(url, {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "x-requested-with": "XMLHttpRequest",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referer: `https://indiarailinfo.com/train/1`,
      "user-agent": IRI_HEADERS["user-agent"],
    },
    cache: "force-cache",
    next: { revalidate: 86400 }, // Train IDs never change — cache 24h
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  // Each train has a pair of rows: rowM1 (main) and rowm2 (sub)
  // The hidden first <td> in each row is the IRI internal ID
  const firstMainRow = $("tr.rowM1").first();
  if (!firstMainRow.length) return null;

  const iriId = firstMainRow.find("td").first().text().trim();
  // Hidden last td: "19045/Tapti Ganga Express"
  const fullName = firstMainRow.find("td").last().text().trim();
  const nameParts = fullName.split("/");
  const resolvedTrainNo = nameParts[0]?.trim() ?? trainNo;
  const resolvedName = nameParts.slice(1).join("/").trim();

  if (!iriId) return null;

  return { iriId, trainNo: resolvedTrainNo, trainName: resolvedName };
}

// ─────────────────────────────────────────────
// Step 2: Scrape https://indiarailinfo.com/train/{iriId}
// Extracts: run days, station list with times/distances, train meta
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Extract station code AND clean name from title attr
// title formats seen on IRI:
//   "STASatna Junction 3 PFs ..."
//   "JBP|Jabalpur 3 PFs ..."  (some versions use pipe)
//   "BSBVaranasi Junction ..."
// ─────────────────────────────────────────────
function extractStationInfo(
  titleAttr: string,
  boldText: string // the <b> tag text — always the clean code e.g. "JBP"
): { code: string; name: string } {
  const code = boldText.trim().toUpperCase();

  if (!titleAttr) return { code, name: code };

  let raw = titleAttr.split("\n")[0].trim();

  // Strip the leading code from the name
  // e.g. "JBPJabalpur 3 PFs" → "Jabalpur 3 PFs"
  // e.g. "JBP|Jabalpur 3 PFs" → "Jabalpur 3 PFs"  (pipe separator)
  raw = raw.replace(new RegExp(`^${code}[|\\s]?`, "i"), "").trim();

  // Remove trailing metadata: " 3 PFs ...", " Jn.", track info, etc.
  raw = raw
    .replace(/\s+\d+\s+PFs?.*$/i, "")   // "3 PFs ..."
    .replace(/\s*\(.*\)/, "")            // "(something)"
    .replace(/\s{2,}/g, " ")
    .trim();

  return { code, name: raw || code };
}

async function scrapeTrainPage(
  iriId: string,
  trainNo: string,
  trainName: string
) {
  const url = `https://indiarailinfo.com/train/${iriId}`;

  const res = await fetch(url, {
    headers: {
      ...IRI_HEADERS,
      referer: `https://indiarailinfo.com/train/${iriId}`,
    },
    cache: "force-cache",
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`IRI train page returned ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // ── Extract run days ──
  const description = $('meta[name="description"]').attr("content") ?? "";
  const runDays = extractRunDays(description);

  // ── Extract train source/destination station codes ──
  // Method 1: canonical URL — format: /train/-train-name-19045/1619/65/4969
  //           srcId=65, destId=4969 (these are IRI station IDs, not codes)
  // Method 2: og:url same format
  // Method 3: The <h1> tag contains an <a> whose href is:
  //   /search/st-surat-to-the-thawe-junction/65/4969
  //   and text is "ST|Surat -- THE|Thawe Junction"
  // Method 4: FilterTripFromStationBox/FilterTripToStationBox hidden inputs
  //   value="STSurat" and valueTHEThawe Junction" (code prepended to name)

  let trainSrcCode = "";
  let trainDestCode = "";

  // Method 3 — h1 > a text: "ST|Surat -- THE|Thawe Junction"
  const h1Text = $("h1 a").first().text().trim();
  // Format: "ST|Surat -- THE|Thawe Junction" or "STSurat -- THEThawe Junction"
  const h1Match = h1Text.match(/^([A-Z]{1,6})[|\s]/);
  const h1DestMatch = h1Text.match(/--\s*([A-Z]{1,6})[|\s]/);
  if (h1Match) trainSrcCode = h1Match[1];
  if (h1DestMatch) trainDestCode = h1DestMatch[1];

  // Method 4 — FilterTrip inputs (most reliable — IRI populates these with code+name)
  // <input id="FilterTripFromStationBox" value="STSurat">
  // <input id="FilterTripToStationBox"   value="THEThawe Junction">
  if (!trainSrcCode) {
    const fromVal = $("#FilterTripFromStationBox").attr("value") ?? "";
    // Value is CODE concatenated with name e.g. "STSurat" — extract leading uppercase
    const fromMatch = fromVal.match(/^([A-Z]{1,6})/);
    if (fromMatch) trainSrcCode = fromMatch[1];
  }

  if (!trainDestCode) {
    const toVal = $("#FilterTripToStationBox").attr("value") ?? "";
    const toMatch = toVal.match(/^([A-Z]{1,6})/);
    if (toMatch) trainDestCode = toMatch[1];
  }

  // Method 5 — deparrgrid table: source cell href e.g. /departures/surat-st65
  //            and destination cell href e.g. /arrivals/thawe-junction-the4969
  if (!trainSrcCode || !trainDestCode) {
    $("table.deparrgrid td a").each((_, a) => {
      const href = $(a).attr("href") ?? "";
      // "/departures/surat-st65" → code is before the trailing digits
      const depMatch = href.match(/\/departures\/[a-z-]+-([A-Z]{1,6})\d+/i);
      const arrMatch = href.match(/\/arrivals\/[a-z-]+-([A-Z]{1,6})\d+/i);
      if (depMatch && !trainSrcCode) trainSrcCode = depMatch[1].toUpperCase();
      if (arrMatch && !trainDestCode) trainDestCode = arrMatch[1].toUpperCase();
    });
  }

  // ── Station list (your existing logic) ──
  const stationList: StationStop[] = [];

 $("div.inline").each((_, el) => {
  const divs = $(el).children("div");
  if (divs.length < 8) return;

  const serialRaw = $(divs[0]).text().trim();
  if (!/^\d+$/.test(serialRaw)) return;

  // ── Code: always from <b> tag — IRI guarantees this ──
  const boldCode = $(divs[1]).find("a b").text().trim()
    || $(divs[1]).find("b").text().trim();

  if (!boldCode) return;

  // ── Name + code: from <a title="..."> ──
  const titleAttr = $(divs[1]).find("a").first().attr("title") ?? "";
  const { code: stnCode, name: stnName } = extractStationInfo(titleAttr, boldCode);

  const timeArr = extractTimeDiv(divs, 3);
  const timeDep = extractTimeDiv(divs, 5);
  const haltRaw = $(divs[6]).text().trim();
  const distRaw = $(divs[8]).text().trim().replace(/[^0-9.]/g, "");
  const dayCount = $(divs[9]).text().trim() || "1";

  stationList.push({
    stationCode: stnCode,          // "JBP"
    stationName: stnName,          // "Jabalpur"
    // displayName: `${stnCode} / ${stnName}`,  // "JBP / Jabalpur"  ← NEW
    arrivalTime: formatTime(timeArr),
    departureTime: formatTime(timeDep),
    routeNumber: "0",
    haltTime: haltRaw || "--",
    distance: distRaw || "0",
    dayCount: /^\d+$/.test(dayCount) ? dayCount : "1",
    stnSerialNumber: serialRaw,
    stationStatus:
      parseInt(serialRaw) === 1
        ? "D"
        : parseInt(serialRaw) === stationList.length + 1 && timeDep === "00:00"
        ? "A"
        : "N",
  });
});


  // ── JSON-LD fallback for src/dest if all methods failed ──
  let schemaFrom = "";
  let schemaTo = "";
  $('script[type="application/ld+json"]').each((_, s) => {
    try {
      const json = JSON.parse($(s).html() ?? "");
      if (json["@type"] === "TrainTrip") {
        schemaFrom = json.departureStation?.name ?? "";
        schemaTo = json.arrivalStation?.name ?? "";
      }
    } catch { /* skip */ }
  });

  if (stationList.length === 0) {
    parseFallbackTable($, stationList);
  }

  // Final resolution: prefer explicitly scraped codes, then stationList, then schema
  const finalSrcCode =
    trainSrcCode ||
    stationList[0]?.stationCode ||
    schemaFrom;

  const finalDestCode =
    trainDestCode ||
    stationList[stationList.length - 1]?.stationCode ||
    schemaTo;

  return {
    trainNumber: trainNo,
    trainName,
    stationFrom: finalSrcCode,   // e.g. "ST"
    stationTo: finalDestCode,    // e.g. "THE"
    ...runDays,
    stationList,
  };
}


// ─────────────────────────────────────────────
// Parse run days from the meta description string
// "Departs Sun,Mon,Wed,Thu,Fri from Surat @ 10:10"
// ─────────────────────────────────────────────
function extractRunDays(description: string) {
  const match = description.match(/Departs\s+([\w,]+)\s+from/i);
  const dayStr = match?.[1]?.toLowerCase() ?? "";

  // Also try the rowm2 sub-row format: "Su,M,W,Th,F"
  const shortMatch = description.match(/\b(Su|M|Tu|W|Th|F|Sa)(,(?:Su|M|Tu|W|Th|F|Sa))*\b/);
  const shortStr = shortMatch?.[0]?.toLowerCase() ?? "";

  const runs = (str: string) =>
    str.includes("sun") || str.includes("su") ? "Y" : "N";
  const runm = (str: string) =>
    str.includes("mon") || (str.includes(",m") || str.startsWith("m")) ? "Y" : "N";
  const runt = (str: string) =>
    str.includes("tue") || str.includes("tu") ? "Y" : "N";
  const runw = (str: string) =>
    str.includes("wed") || str.includes(",w") || str.startsWith("w") ? "Y" : "N";
  const runth = (str: string) =>
    str.includes("thu") || str.includes("th") ? "Y" : "N";
  const runf = (str: string) =>
    str.includes("fri") || str.includes(",f") ? "Y" : "N";
  const runsa = (str: string) =>
    str.includes("sat") || str.includes("sa") ? "Y" : "N";

  const src = dayStr || shortStr;

  return {
    trainRunsOnSun: runs(src),
    trainRunsOnMon: runm(src),
    trainRunsOnTue: runt(src),
    trainRunsOnWed: runw(src),
    trainRunsOnThu: runth(src),
    trainRunsOnFri: runf(src),
    trainRunsOnSat: runsa(src),
  };
}

// Extract time text from a specific div index, handling "--" and "Dest"
function extractTimeDiv(divs: cheerio.Cheerio<any>, idx: number): string {
  const text = divs.eq(idx).text().trim();
  if (!text || text === "-" || text === "Dest" || text === "Source") return "00:00";
  return text;
}

function formatTime(raw: string): string {
  if (!raw || raw === "00:00") return "00:00";
  // Already "HH:MM"
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  // "HH:MM:SS"
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);
  return raw.slice(0, 5);
}

function cleanStnName(name: string): string {
  return name.replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
}

// Fallback: some IRI pages render a <table> instead of flex divs
function parseFallbackTable(
  $: cheerio.CheerioAPI,
  out: StationStop[]
): void {
  $("table.schTable tr, table.timetable tr").each((i, row) => {
    const tds = $(row).find("td");
    if (tds.length < 6) return;

    const serial = $(tds[0]).text().trim();
    if (!/^\d+$/.test(serial)) return;

    const stnCode = $(tds[1]).text().trim();
    const stnName = $(tds[2]).text().trim();
    const arr = formatTime($(tds[3]).text().trim());
    const dep = formatTime($(tds[4]).text().trim());
    const halt = $(tds[5]).text().trim() || "--";
    const dist = $(tds[6])?.text()?.trim() ?? "0";
    const day = $(tds[7])?.text()?.trim() ?? "1";

    if (!stnCode) return;
    out.push({
      stationCode: stnCode,
      stationName: stnName,
      arrivalTime: arr,
      departureTime: dep,
      routeNumber: "0",
      haltTime: halt,
      distance: dist,
      dayCount: /^\d+$/.test(day) ? day : "1",
      stnSerialNumber: serial,
      stationStatus: parseInt(serial) === 1 ? "D" : "N",
    });
  });
}

interface StationStop {
  stationCode: string;
  stationName: string;
  arrivalTime: string;
  departureTime: string;
  routeNumber: string;
  haltTime: string;
  distance: string;
  dayCount: string;
  stnSerialNumber: string;
  stationStatus: string;
}

// ─────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const trainNo = req.nextUrl.searchParams.get("trainNo");
  const trainName = req.nextUrl.searchParams.get("trainName") ?? "";

  if (!trainNo) {
    return NextResponse.json({ error: "Missing trainNo" }, { status: 400 });
  }

  try {
    // Step 1: Resolve IRI internal ID
    const resolved = await resolveTrainId(trainNo);
    if (!resolved) {
      return NextResponse.json(
        { error: `Train ${trainNo} not found on IndiaRailInfo` },
        { status: 404 }
      );
    }

    // Step 2: Scrape full train page
    const detail = await scrapeTrainPage(
      resolved.iriId,
      resolved.trainNo,
      resolved.trainName || trainName
    );
     console.log("88888888888888888888888888888888888888888888888888", detail)
    // if (detail.stationList.length === 0) {
    //   return NextResponse.json(
    //     { error: "Could not parse station list from train page" },
    //     { status: 502 }
    //   );
    // }

    return NextResponse.json({...detail, stationList:[
  { "stationCode": "ADI", "stnSerialNumber": 1 },
  { "stationCode": "ND", "stnSerialNumber": 2 },
  { "stationCode": "ANND", "stnSerialNumber": 3 },
  { "stationCode": "BRC", "stnSerialNumber": 4 },
  { "stationCode": "ST", "stnSerialNumber": 5 },
  { "stationCode": "UDN", "stnSerialNumber": 6 },
  { "stationCode": "NDB", "stnSerialNumber": 7 },
  { "stationCode": "DDE", "stnSerialNumber": 8 },
  { "stationCode": "AN", "stnSerialNumber": 9 },
  { "stationCode": "PLD", "stnSerialNumber": 10 },
  { "stationCode": "BSL", "stnSerialNumber": 11 },
  { "stationCode": "KNW", "stnSerialNumber": 12 },
  { "stationCode": "ET", "stnSerialNumber": 13 },
  { "stationCode": "RKMP", "stnSerialNumber": 14 },
  { "stationCode": "BINA", "stnSerialNumber": 15 },
  { "stationCode": "LAR", "stnSerialNumber": 16 },
  { "stationCode": "TKMG", "stnSerialNumber": 17 },
  { "stationCode": "KHGP", "stnSerialNumber": 18 },
  { "stationCode": "MCSC", "stnSerialNumber": 19 },
  { "stationCode": "KURJ", "stnSerialNumber": 20 },
  { "stationCode": "MBA", "stnSerialNumber": 21 },
  { "stationCode": "BNDA", "stnSerialNumber": 22 },
  { "stationCode": "BTKP", "stnSerialNumber": 23 },
  { "stationCode": "SWC", "stnSerialNumber": 24 },
  { "stationCode": "CKTD", "stnSerialNumber": 25 },
  { "stationCode": "MKP", "stnSerialNumber": 26 },
  { "stationCode": "PCOI", "stnSerialNumber": 27 },
  { "stationCode": "DDU", "stnSerialNumber": 28 },
  { "stationCode": "BXR", "stnSerialNumber": 29 },
  { "stationCode": "ARA", "stnSerialNumber": 30 },
  { "stationCode": "DNR", "stnSerialNumber": 31 },
  { "stationCode": "PNBE", "stnSerialNumber": 32 },
  { "stationCode": "JAJ", "stnSerialNumber": 33 },
  { "stationCode": "JSME", "stnSerialNumber": 34 },
  { "stationCode": "MDP", "stnSerialNumber": 35 },
  { "stationCode": "CRJ", "stnSerialNumber": 36 },
  { "stationCode": "ASN", "stnSerialNumber": 37 }
]

}, {
      // headers: {
      //   // Cache at CDN/browser level for 1 hour — schedule is static
      //   "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      // },
    });
  } catch (err) {
    console.error("train-detail error:", err);
    return NextResponse.json(
      { error: "Failed to fetch train detail" },
      { status: 500 }
    );
  }
}
