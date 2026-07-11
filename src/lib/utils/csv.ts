/**
 * Client-side CSV export utilities. No server round-trip — builds the
 * string and triggers a browser download directly via a Blob, per Phase 8's
 * "no new API routes" requirement. Data always comes from what's already
 * loaded in the calling component (see reports/page.tsx).
 */

/** Escapes a single field per RFC 4180: wrap in quotes if it contains a
 * comma, quote, or newline; double up any internal quotes. */
function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return lines.join("\r\n");
}

/** Triggers a browser download of the given CSV string. */
export function downloadCsv(filename: string, csvContent: string): void {
  // Leading BOM so Excel opens UTF-8 CSVs correctly instead of mangling
  // accented characters.
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
