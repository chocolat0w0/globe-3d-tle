const jstFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getPartValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function formatJstDateTime(ms: number): string {
  const parts = jstFormatter.formatToParts(new Date(ms));
  const month = getPartValue(parts, "month");
  const day = getPartValue(parts, "day");
  const hour = getPartValue(parts, "hour");
  const minute = getPartValue(parts, "minute");
  return `${month}月${day}日 ${hour}:${minute}`;
}
