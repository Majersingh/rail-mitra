import { NextRequest, NextResponse } from "next/server";
import { parseStationHtml } from "@/lib/parse-stations";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const timestamp = Date.now();
  const url = `https://indiarailinfo.com/shtml/list.shtml?LappGetStationList/${encodeURIComponent(query)}/0/0/0?&date=${timestamp}&seq=1`;

  try {
    const res = await fetch(url, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "x-requested-with": "XMLHttpRequest",
        referer: "https://indiarailinfo.com/search/65/0/63",
      },
      cache: "no-store",
    });

    const html = await res.text();
    const stations = parseStationHtml(html);
    return NextResponse.json(stations);
  } catch (err) {
    console.error("Station fetch error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
