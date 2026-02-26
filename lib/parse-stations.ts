import * as cheerio from "cheerio";
import type { Station } from "./types";

export function parseStationHtml(html: string): Station[] {
  const $ = cheerio.load(html);
  const stations: Station[] = [];
  const seen = new Set<string>();

  $("tr.rowM1").each((_, row) => {
    const tds = $(row).find("td");
    const id = $(tds[0]).text().trim();
    const code = $(tds[1]).text().trim().replace(/\s+/g, "");
    const name = $(tds[2]).text().trim().replace(/\s+/g, " ");
    const hiddenText = $(tds[3]).text().trim(); // "CODE/Full Name"

    if (!id || !code || seen.has(id)) return;
    seen.add(id);

    stations.push({
      id,
      code,
      name,
      displayName: hiddenText || `${code}/${name}`,
    });
  });

  return stations;
}
