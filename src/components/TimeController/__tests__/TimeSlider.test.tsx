import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeSlider } from "../TimeSlider";
import { formatUTC } from "../time-format";

// ---------------------------------------------------------------------------
// formatUTC ユーティリティのテスト
// ---------------------------------------------------------------------------

describe("formatUTC", () => {
  it("UTC 2024-01-15 03:05:09 を正しくフォーマットする", () => {
    // 2024-01-15T03:05:09Z
    const ms = Date.UTC(2024, 0, 15, 3, 5, 9);
    expect(formatUTC(ms)).toBe("2024-01-15 03:05:09 UTC");
  });

  it("ゼロ埋めが正しく行われる（月・日・時・分・秒が1桁）", () => {
    // 2025-02-03T04:06:07Z
    const ms = Date.UTC(2025, 1, 3, 4, 6, 7);
    expect(formatUTC(ms)).toBe("2025-02-03 04:06:07 UTC");
  });

  it("UTC 2000-01-01T00:00:00Z（エポック付近）を正しく扱う", () => {
    const ms = Date.UTC(2000, 0, 1, 0, 0, 0);
    expect(formatUTC(ms)).toBe("2000-01-01 00:00:00 UTC");
  });

  it("末尾に ' UTC' を含む", () => {
    const ms = Date.UTC(2024, 5, 15, 12, 0, 0);
    expect(formatUTC(ms)).toMatch(/ UTC$/);
  });
});

// ---------------------------------------------------------------------------
// TimeSlider レンダリングテスト
// ---------------------------------------------------------------------------

describe("TimeSlider", () => {
  const minMs = Date.UTC(2024, 0, 1);
  const maxMs = Date.UTC(2024, 0, 29);
  const currentMs = Date.UTC(2024, 0, 15, 12, 0, 0);

  describe("rendering", () => {
    it("input[type=range] が1つ描画される", () => {
      const { container } = render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={vi.fn()}
        />
      );
      const slider = container.querySelector('input[type="range"]');
      expect(slider).not.toBeNull();
    });

    it("スライダーの value が currentMs と一致する", () => {
      const { container } = render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={vi.fn()}
        />
      );
      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(Number(slider.value)).toBe(currentMs);
    });

    it("スライダーの min / max が正しく設定される", () => {
      const { container } = render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={vi.fn()}
        />
      );
      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(Number(slider.min)).toBe(minMs);
      expect(Number(slider.max)).toBe(maxMs);
    });

    it("UTC 時刻文字列が画面に表示される", () => {
      render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={vi.fn()}
        />
      );
      // formatUTC(currentMs) = "2024-01-15 12:00:00 UTC"
      expect(screen.getByText("2024-01-15 12:00:00 UTC")).toBeDefined();
    });

    it("aria-label='タイムスライダー' がスライダーに付与される", () => {
      render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={vi.fn()}
        />
      );
      expect(screen.getByRole("slider", { name: "タイムスライダー" })).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // イベントコールバック
  // ---------------------------------------------------------------------------

  describe("onSeek callback", () => {
    it("スライダーを変更すると onSeek が数値で呼ばれる", () => {
      const onSeek = vi.fn();
      const targetMs = Date.UTC(2024, 0, 20);
      const { container } = render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={onSeek}
        />
      );
      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: String(targetMs) } });

      expect(onSeek).toHaveBeenCalledTimes(1);
      expect(onSeek).toHaveBeenCalledWith(targetMs);
    });

    it("異なる値への変更では onSeek が正しい値で呼ばれる", () => {
      const onSeek = vi.fn();
      const firstTarget = Date.UTC(2024, 0, 10);
      const secondTarget = Date.UTC(2024, 0, 25);
      const { container } = render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={onSeek}
        />
      );
      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;

      fireEvent.change(slider, { target: { value: String(firstTarget) } });
      fireEvent.change(slider, { target: { value: String(secondTarget) } });

      expect(onSeek).toHaveBeenCalledTimes(2);
      expect(onSeek).toHaveBeenNthCalledWith(1, firstTarget);
      expect(onSeek).toHaveBeenNthCalledWith(2, secondTarget);
    });
  });

  // ---------------------------------------------------------------------------
  // props 変更への追従
  // ---------------------------------------------------------------------------

  describe("props update", () => {
    it("currentMs が変わると表示時刻も更新される", () => {
      const newMs = Date.UTC(2024, 0, 20, 18, 30, 0);
      const { rerender } = render(
        <TimeSlider
          currentMs={currentMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={vi.fn()}
        />
      );

      rerender(
        <TimeSlider
          currentMs={newMs}
          minMs={minMs}
          maxMs={maxMs}
          onSeek={vi.fn()}
        />
      );

      expect(screen.getByText("2024-01-20 18:30:00 UTC")).toBeDefined();
    });
  });
});
