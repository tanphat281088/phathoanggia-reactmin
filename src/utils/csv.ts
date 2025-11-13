/* eslint-disable @typescript-eslint/no-explicit-any */
export type CsvCol = { key: string; title: string; map?: (row: any) => any };

function esc(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Bọc ngoặc kép nếu có dấu phẩy, xuống dòng hoặc ngoặc kép
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: any[], cols: CsvCol[]): string {
  const head = cols.map(c => esc(c.title)).join(",");
  const body = rows.map(r => cols.map(c => esc(c.map ? c.map(r) : r[c.key])).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }); // BOM cho Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
