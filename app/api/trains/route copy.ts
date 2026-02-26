import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { Train } from "@/lib/types";

export async function GET(req: NextRequest) {
  const srcId = req.nextUrl.searchParams.get("srcId");
  const destId = req.nextUrl.searchParams.get("destId");

  if (!srcId || !destId) {
    return NextResponse.json({ error: "Missing srcId or destId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://indiarailinfo.com/search/${srcId}/0/${destId}?src=&dest=&locoClass=undefined&bedroll=undefined&`,
      {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "upgrade-insecure-requests": "1",
          referer: "https://indiarailinfo.com/",
        },
        cache: "no-store",
      }
    );

    const html = await res.text();
    const $ = cheerio.load(html);
    const trains: Train[] = [];

    $('div[style*="line-height:20px"]').each((_, el) => {
      const cols = $(el).children("div");
      if (cols.length < 9) return;

      const trainNo = $(cols[0]).text().trim();
      if (!/^\d{4,5}$/.test(trainNo)) return;

      trains.push({
        trainNo,
        trainName: $(cols[1]).text().trim(),
        trainType: $(cols[2]).text().trim(),
        from: $(cols[4]).text().trim(),
        dep: $(cols[5]).text().trim(),
        to: $(cols[6]).text().trim(),
        arr: $(cols[8]).text().trim(),
      });
    });

    return NextResponse.json(trains);
  } catch (err) {
    console.error("Trains fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch trains" }, { status: 500 });
  }
}
