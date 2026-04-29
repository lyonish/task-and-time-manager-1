export function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function generateMonthRange(from: string, to: string): string[] {
  const months: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

export function monthLabel(ym: string): string {
  return new Date(ym + "-01").toLocaleDateString("en", { year: "numeric", month: "short" });
}

// Deterministic color from a string key (for members without project color)
export function keyColor(key: string): string {
  const palette = ["#6366f1","#8b5cf6","#ec4899","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#06b6d4","#a855f7"];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}
