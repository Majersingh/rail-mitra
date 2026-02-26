import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { Train } from "@/lib/types";

export async function GET(req: NextRequest) {
  const srcId  = req.nextUrl.searchParams.get("srcId");
  const destId = req.nextUrl.searchParams.get("destId");

  if (!srcId || !destId) {
    return NextResponse.json({ error: "Missing srcId or destId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://indiarailinfo.com/search/${srcId}/0/${destId}?src=&dest=&locoClass=undefined&bedroll=undefined&`,
      {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          referer: "https://indiarailinfo.com/",
        },
        cache: "no-store",
      }
    );

    const html = await res.text();
    const $ = cheerio.load(html);
    const trains: Train[] = [];

    // Real column layout (confirmed from actual HTML):
    //  [0]  width:45px   → trainNo       (TEXT)         e.g. "19578"
    //  [1]  width:200px  → trainName     (TEXT)         e.g. "Jamnagar - Tirunelveli Express (PT)"
    //  [2]  width:40px   → trainType     (TEXT)         e.g. "Exp", "SF"
    //  [3]  width:40px   → zone          (TEXT)         e.g. "WR"
    //  [4]  width:50px   → from code     (TEXT)         e.g. "ADI"
    //  [5]  width:60px   → from platform (TEXT)         e.g. "6"
    //  [6]  width:60px   → dep time      (TEXT)         e.g. "03:00"
    //  [7]  width:50px   → to code       (TEXT)         e.g. "ST"
    //  [8]  width:30px   → to platform   (TEXT)         e.g. "2"
    //  [9]  width:60px   → arr time      (TEXT)         e.g. "06:57"
    //  [10] width:70px   → duration      (TEXT)         e.g. "3h 57m"
    //  [11] width:45px   → halts         (title attr)   e.g. title="2 halts"
    //  [12] width:120px  → run days table

    $('div[style*="line-height:20px"]').each((_, el) => {
      const cols = $(el).children("div");
      if (cols.length < 10) return;

      const trainNo = cols.eq(0).text().trim();
      if (!/^\d{4,5}$/.test(trainNo)) return;

      const trainName = cols.eq(1).text().trim();
      const trainType = cols.eq(2).text().trim();
      const zone      = cols.eq(3).text().trim();
      const from      = cols.eq(4).text().trim();
      const dep       = cols.eq(6).text().trim();   // col[5] is platform, skip
      const to        = cols.eq(7).text().trim();
      const arr       = cols.eq(9).text().trim();   // col[8] is platform, skip
      const duration  = cols.eq(10).text().trim();

      // halts is in the title attr of col[11]: "2 halts" → "2"
      const haltsTitle = cols.eq(11).attr("title") ?? "";
      const halts = haltsTitle.replace(/\s*halts?/i, "").trim();

      if (!from || !to || !dep || !arr) return;

      trains.push({ trainNo, trainName, trainType, from, dep, to, arr });
    });

    return NextResponse.json(trains);
  } catch (err) {
    console.error("Trains fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch trains" }, { status: 500 });
  }
}
