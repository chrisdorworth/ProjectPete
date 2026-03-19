import * as cheerio from "cheerio";

export interface TableRow {
  [key: string]: string;
}

export function extractTable(html: string, tableSelector: string): TableRow[] {
  const $ = cheerio.load(html);
  const rows: TableRow[] = [];
  const headers: string[] = [];

  $(tableSelector).find("thead tr th, thead tr td").each((_, el) => {
    headers.push($(el).text().trim().toLowerCase().replace(/\s+/g, "_"));
  });

  if (headers.length === 0) {
    $(tableSelector).find("tr:first-child th, tr:first-child td").each((_, el) => {
      headers.push($(el).text().trim().toLowerCase().replace(/\s+/g, "_"));
    });
  }

  $(tableSelector).find("tbody tr, tr:not(:first-child)").each((_, row) => {
    const rowData: TableRow = {};
    $(row).find("td").each((i, cell) => {
      const key = headers[i] ?? `col_${i}`;
      rowData[key] = $(cell).text().trim();
    });
    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

export function extractText(html: string, selector: string): string | null {
  const $ = cheerio.load(html);
  const el = $(selector).first();
  return el.length > 0 ? el.text().trim() : null;
}

export function extractLinks(html: string, selector: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        const url = new URL(href, baseUrl);
        links.push(url.toString());
      } catch {
        // Invalid URL — skip
      }
    }
  });

  return links;
}

export function extractMeta(html: string, name: string): string | null {
  const $ = cheerio.load(html);
  return $(`meta[name="${name}"]`).attr("content") ?? null;
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}
