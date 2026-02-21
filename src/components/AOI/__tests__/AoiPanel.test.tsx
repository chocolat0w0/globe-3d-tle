import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AoiPanel } from "../AoiPanel";
import type { Aoi } from "../../../types/polygon";

const noop = vi.fn();

function makeProps(overrides: Partial<Parameters<typeof AoiPanel>[0]> = {}) {
  return {
    mode: "none" as const,
    aoi: null,
    onSetMode: noop,
    onClear: noop,
    onLoadGeoJSON: vi.fn().mockReturnValue({ success: true, aoi: { type: "Point", coordinate: [0, 0] } as Aoi }),
    ...overrides,
  };
}

describe("AoiPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ポイント・ポリゴン・GeoJSON読込・クリアの4つのボタンが存在する", () => {
    render(<AoiPanel {...makeProps()} />);
    expect(screen.getByRole("button", { name: "ポイント" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ポリゴン" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "GeoJSON読込" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "クリア" })).toBeTruthy();
  });

  it("ポイントボタンをクリックすると onSetMode('point') が呼ばれる", () => {
    const onSetMode = vi.fn();
    render(<AoiPanel {...makeProps({ onSetMode })} />);
    fireEvent.click(screen.getByRole("button", { name: "ポイント" }));
    expect(onSetMode).toHaveBeenCalledWith("point");
  });

  it("ポリゴンボタンをクリックすると onSetMode('polygon') が呼ばれる", () => {
    const onSetMode = vi.fn();
    render(<AoiPanel {...makeProps({ onSetMode })} />);
    fireEvent.click(screen.getByRole("button", { name: "ポリゴン" }));
    expect(onSetMode).toHaveBeenCalledWith("polygon");
  });

  it("描画中に同じボタンをもう一度クリックすると onSetMode('none') でキャンセルされる", () => {
    const onSetMode = vi.fn();
    render(<AoiPanel {...makeProps({ mode: "point", onSetMode })} />);
    fireEvent.click(screen.getByRole("button", { name: "ポイント" }));
    expect(onSetMode).toHaveBeenCalledWith("none");
  });

  it("クリアボタンをクリックすると onClear が呼ばれる", () => {
    const onClear = vi.fn();
    const aoi: Aoi = { type: "Point", coordinate: [0, 0] };
    render(<AoiPanel {...makeProps({ aoi, onClear })} />);
    fireEvent.click(screen.getByRole("button", { name: "クリア" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  describe("aria-pressed の状態", () => {
    it("mode が none のとき、どちらのボタンも aria-pressed=false", () => {
      render(<AoiPanel {...makeProps({ mode: "none" })} />);
      expect(screen.getByRole("button", { name: "ポイント" }).getAttribute("aria-pressed")).toBe("false");
      expect(screen.getByRole("button", { name: "ポリゴン" }).getAttribute("aria-pressed")).toBe("false");
    });

    it("mode が point のとき、ポイントボタンが aria-pressed=true", () => {
      render(<AoiPanel {...makeProps({ mode: "point" })} />);
      expect(screen.getByRole("button", { name: "ポイント" }).getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("button", { name: "ポリゴン" }).getAttribute("aria-pressed")).toBe("false");
    });

    it("mode が polygon のとき、ポリゴンボタンが aria-pressed=true", () => {
      render(<AoiPanel {...makeProps({ mode: "polygon" })} />);
      expect(screen.getByRole("button", { name: "ポイント" }).getAttribute("aria-pressed")).toBe("false");
      expect(screen.getByRole("button", { name: "ポリゴン" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("描画モードのヒント表示", () => {
    it("mode が none のときヒントは表示されない", () => {
      render(<AoiPanel {...makeProps({ mode: "none" })} />);
      expect(screen.queryByText(/描画中/)).toBeNull();
    });

    it("mode が point のときポイント描画のヒントが表示される", () => {
      render(<AoiPanel {...makeProps({ mode: "point" })} />);
      expect(screen.getByText(/ポイント描画中/)).toBeTruthy();
    });

    it("mode が polygon のときポリゴン描画のヒントが表示される", () => {
      render(<AoiPanel {...makeProps({ mode: "polygon" })} />);
      expect(screen.getByText(/ポリゴン描画中/)).toBeTruthy();
    });
  });

  describe("クリアボタンの有効/無効", () => {
    it("aoi が null かつ mode が none のときクリアボタンが無効", () => {
      render(<AoiPanel {...makeProps({ aoi: null, mode: "none" })} />);
      expect(screen.getByRole("button", { name: "クリア" })).toBeDisabled();
    });

    it("aoi が存在するときクリアボタンが有効", () => {
      const aoi: Aoi = { type: "Point", coordinate: [0, 0] };
      render(<AoiPanel {...makeProps({ aoi })} />);
      expect(screen.getByRole("button", { name: "クリア" })).not.toBeDisabled();
    });

    it("aoi が null でも mode が point なら クリアボタンが有効", () => {
      render(<AoiPanel {...makeProps({ aoi: null, mode: "point" })} />);
      expect(screen.getByRole("button", { name: "クリア" })).not.toBeDisabled();
    });
  });
});
