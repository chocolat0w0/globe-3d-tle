import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackControls } from "../PlaybackControls";

const SPEEDS = [1, 10, 60, 300, 1800] as const;

// ---------------------------------------------------------------------------
// レンダリング
// ---------------------------------------------------------------------------

describe("PlaybackControls", () => {
  describe("rendering", () => {
    it("再生中（isPlaying=true）のとき ⏸ ボタンが表示される", () => {
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "一時停止" })).toBeDefined();
    });

    it("停止中（isPlaying=false）のとき ▶ ボタンが表示される", () => {
      render(
        <PlaybackControls
          isPlaying={false}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "再生" })).toBeDefined();
    });

    it("速度ボタンが 5 つ（×1, ×10, ×60, ×300, ×1800）描画される", () => {
      const { container } = render(
        <PlaybackControls
          isPlaying={true}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      // 再生/停止 1つ + 速度 5つ = 合計 6 ボタン
      const buttons = container.querySelectorAll("button");
      expect(buttons).toHaveLength(6);
    });

    it.each(SPEEDS)("×%i ボタンが存在する", (speed) => {
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={1}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      // ×1800 など各速度ラベルが画面にある
      expect(screen.getByText(`×${speed}`)).toBeDefined();
    });

    it("現在の multiplier に対応するボタンが aria-pressed=true になる", () => {
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={300}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      const button = screen.getByText("×300").closest("button") as HTMLButtonElement;
      expect(button.getAttribute("aria-pressed")).toBe("true");
    });

    it("現在の multiplier 以外のボタンは aria-pressed=false になる", () => {
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      for (const speed of SPEEDS) {
        if (speed === 60) continue;
        const btn = screen.getByText(`×${speed}`).closest("button") as HTMLButtonElement;
        expect(btn.getAttribute("aria-pressed")).toBe("false");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // コールバック
  // ---------------------------------------------------------------------------

  describe("onPlayPause callback", () => {
    it("再生中に再生/停止ボタンをクリックすると onPlayPause が1回呼ばれる", () => {
      const onPlayPause = vi.fn();
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={60}
          onPlayPause={onPlayPause}
          onSetMultiplier={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    it("停止中に再生/停止ボタンをクリックすると onPlayPause が1回呼ばれる", () => {
      const onPlayPause = vi.fn();
      render(
        <PlaybackControls
          isPlaying={false}
          multiplier={60}
          onPlayPause={onPlayPause}
          onSetMultiplier={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "再生" }));
      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });
  });

  describe("onSetMultiplier callback", () => {
    it.each(SPEEDS)("×%i ボタンをクリックすると onSetMultiplier(%i) が呼ばれる", (speed) => {
      const onSetMultiplier = vi.fn();
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={1}
          onPlayPause={vi.fn()}
          onSetMultiplier={onSetMultiplier}
        />
      );
      fireEvent.click(screen.getByText(`×${speed}`));
      expect(onSetMultiplier).toHaveBeenCalledTimes(1);
      expect(onSetMultiplier).toHaveBeenCalledWith(speed);
    });

    it("速度ボタンをクリックしても onPlayPause は呼ばれない", () => {
      const onPlayPause = vi.fn();
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={1}
          onPlayPause={onPlayPause}
          onSetMultiplier={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText("×60"));
      expect(onPlayPause).not.toHaveBeenCalled();
    });

    it("再生/停止ボタンをクリックしても onSetMultiplier は呼ばれない", () => {
      const onSetMultiplier = vi.fn();
      render(
        <PlaybackControls
          isPlaying={true}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={onSetMultiplier}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
      expect(onSetMultiplier).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // props 更新への追従
  // ---------------------------------------------------------------------------

  describe("props update", () => {
    it("isPlaying が false → true に変わるとボタンラベルが切り替わる", () => {
      const { rerender } = render(
        <PlaybackControls
          isPlaying={false}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "再生" })).toBeDefined();

      rerender(
        <PlaybackControls
          isPlaying={true}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      expect(screen.getByRole("button", { name: "一時停止" })).toBeDefined();
    });

    it("multiplier が変わると aria-pressed が正しいボタンに移る", () => {
      const { rerender } = render(
        <PlaybackControls
          isPlaying={true}
          multiplier={60}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      expect(
        (screen.getByText("×60").closest("button") as HTMLButtonElement).getAttribute("aria-pressed")
      ).toBe("true");

      rerender(
        <PlaybackControls
          isPlaying={true}
          multiplier={1800}
          onPlayPause={vi.fn()}
          onSetMultiplier={vi.fn()}
        />
      );
      expect(
        (screen.getByText("×1800").closest("button") as HTMLButtonElement).getAttribute("aria-pressed")
      ).toBe("true");
      expect(
        (screen.getByText("×60").closest("button") as HTMLButtonElement).getAttribute("aria-pressed")
      ).toBe("false");
    });
  });
});
