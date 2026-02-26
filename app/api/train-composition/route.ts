import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { trainNo, jDate, boardingStation } = body;

  try {
    const res = await fetch(
      "https://www.irctc.co.in/online-charts/api/trainComposition",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          referer: "https://www.irctc.co.in/online-charts/",
        },
        body: JSON.stringify({ trainNo, jDate, boardingStation }),
        cache: "no-store",
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Train composition error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
