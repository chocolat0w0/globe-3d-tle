import { describe, expect, it } from "vitest";
import { formatJstDateTime } from "../components/format-jst";

describe("formatJstDateTime", () => {
  it("UTC時刻をJST形式に変換する", () => {
    const utcMs = Date.UTC(2026, 2, 6, 6, 30, 0);
    const formatted = formatJstDateTime(utcMs);

    expect(formatted).toBe("3月6日 15:30");
    expect(formatted.includes("UTC")).toBe(false);
  });
});
