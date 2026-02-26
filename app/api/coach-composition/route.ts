import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    trainNo,
    boardingStation,
    toStation,
    trainSourceStation,
    jDate,
    coach,
    cls,
  } = body;

  try {
    const res = await 
fetch("https://www.irctc.co.in/online-charts/api/coachComposition", {
  "headers": {
    "accept": "application/json",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Google Chrome\";v=\"145\", \"Chromium\";v=\"145\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Linux\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin"
  },
  "referrer": "https://www.irctc.co.in/online-charts/traincomposition",
  "body": `{\"trainNo\":\"${trainNo}\",\"boardingStation\":\"${boardingStation}\",\"toStation\":\"${toStation}\",\"trainSourceStation\":\"${trainSourceStation}\",\"jDate\":\"${jDate}\",\"coach\":\"${coach}\",\"cls\":\"${cls}\"}`,
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});

    const data = await res.json();
    console.log('okkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',`{\"trainNo\":\"${trainNo}\",\"boardingStation\":\"${boardingStation}\",\"toStation\":\"${toStation}\",\"trainSourceStation\":\"${trainSourceStation}\",\"jDate\":\"${jDate}\",\"coach\":\"${coach}\",\"cls\":\"${cls}\"}`)
    return NextResponse.json(data);
  } catch (err) {
    console.error("Coach composition error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
