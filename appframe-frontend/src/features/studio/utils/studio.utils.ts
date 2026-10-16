export function formatStudioTime(seconds: number, includeMs: boolean = false): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const base = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (includeMs) {
    return `${base}.${String(ms).padStart(3, '0')}`;
  }
  return base;
}

export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const w of words) {
    if (!w) continue;
    const testLine = currentLine ? `${currentLine} ${w}` : w;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = w;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
