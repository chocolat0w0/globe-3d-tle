import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AoiPanel } from "../AoiPanel";
import type { Aoi } from "../../../types/polygon";

const noop = vi.fn();
const fileReaderState = vi.hoisted(() => ({
  nextResult: "",
}));

class MockFileReader {
  onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;

  readAsText = vi.fn(() => {
    this.onload?.({
      target: { result: fileReaderState.nextResult } as unknown as FileReader,
    } as ProgressEvent<FileReader>);
  });
}

function makeProps(overrides: Partial<Parameters<typeof AoiPanel>[0]> = {}) {
  return {
    mode: "none" as const,
    aoi: null,
    onSetMode: noop,
    onClear: noop,
    onLoadGeoJSON: vi
      .fn()
      .mockReturnValue({ success: true, aoi: { type: "Point", coordinate: [0, 0] } as Aoi }),
    ...overrides,
  };
}

describe("AoiPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileReaderState.nextResult = "";
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
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
      expect(screen.getByRole("button", { name: "ポイント" }).getAttribute("aria-pressed")).toBe(
        "false",
      );
      expect(screen.getByRole("button", { name: "ポリゴン" }).getAttribute("aria-pressed")).toBe(
        "false",
      );
    });

    it("mode が point のとき、ポイントボタンが aria-pressed=true", () => {
      render(<AoiPanel {...makeProps({ mode: "point" })} />);
      expect(screen.getByRole("button", { name: "ポイント" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "ポリゴン" }).getAttribute("aria-pressed")).toBe(
        "false",
      );
    });

    it("mode が polygon のとき、ポリゴンボタンが aria-pressed=true", () => {
      render(<AoiPanel {...makeProps({ mode: "polygon" })} />);
      expect(screen.getByRole("button", { name: "ポイント" }).getAttribute("aria-pressed")).toBe(
        "false",
      );
      expect(screen.getByRole("button", { name: "ポリゴン" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
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

  describe("GeoJSON ファイル読み込み", () => {
    function getFileInput(): HTMLInputElement {
      const input = document.querySelector('input[type="file"]');
      if (!(input instanceof HTMLInputElement)) {
        throw new Error("File input が見つかりません");
      }
      return input;
    }

    function createGeoJsonFile(name = "aoi.geojson") {
      return new File(["{}"], name, { type: "application/geo+json" });
    }

    it("有効な GeoJSON を読み込むと onLoadGeoJSON が parsed object で呼ばれ、エラーは表示されない", () => {
      const onLoadGeoJSON = vi
        .fn()
        .mockReturnValue({ success: true, aoi: { type: "Point", coordinate: [0, 0] } as Aoi });
      render(<AoiPanel {...makeProps({ onLoadGeoJSON })} />);

      fileReaderState.nextResult = JSON.stringify({
        type: "Feature",
        geometry: { type: "Point", coordinates: [139.7, 35.6] },
        properties: {},
      });

      fireEvent.change(getFileInput(), {
        target: { files: [createGeoJsonFile()] },
      });

      expect(onLoadGeoJSON).toHaveBeenCalledWith({
        type: "Feature",
        geometry: { type: "Point", coordinates: [139.7, 35.6] },
        properties: {},
      });
      expect(screen.queryByText("JSON のパースに失敗しました")).toBeNull();
    });

    it("パーサが success: false を返した場合、エラーメッセージを表示する", () => {
      const parserError = "Point または Polygon の GeoJSON を指定してください";
      const onLoadGeoJSON = vi.fn().mockReturnValue({ success: false, error: parserError });
      render(<AoiPanel {...makeProps({ onLoadGeoJSON })} />);

      fileReaderState.nextResult = JSON.stringify({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        properties: {},
      });

      fireEvent.change(getFileInput(), {
        target: { files: [createGeoJsonFile()] },
      });

      expect(onLoadGeoJSON).toHaveBeenCalledTimes(1);
      expect(screen.getByText(parserError)).toBeTruthy();
    });

    it("JSON パースに失敗した場合、固定エラーメッセージを表示し onLoadGeoJSON は呼ばれない", () => {
      const onLoadGeoJSON = vi.fn();
      render(<AoiPanel {...makeProps({ onLoadGeoJSON })} />);

      fileReaderState.nextResult = "{ invalid-json";
      fireEvent.change(getFileInput(), {
        target: { files: [createGeoJsonFile()] },
      });

      expect(onLoadGeoJSON).not.toHaveBeenCalled();
      expect(screen.getByText("JSON のパースに失敗しました")).toBeTruthy();
    });

    it("読み込み後に file input の value を空文字へリセットする", () => {
      const onLoadGeoJSON = vi
        .fn()
        .mockReturnValue({ success: true, aoi: { type: "Point", coordinate: [0, 0] } as Aoi });
      const valueSetterSpy = vi.spyOn(HTMLInputElement.prototype, "value", "set");
      render(<AoiPanel {...makeProps({ onLoadGeoJSON })} />);

      fileReaderState.nextResult = JSON.stringify({
        type: "Feature",
        geometry: { type: "Point", coordinates: [139.7, 35.6] },
        properties: {},
      });
      fireEvent.change(getFileInput(), {
        target: { files: [createGeoJsonFile("same-file.geojson")] },
      });

      expect(valueSetterSpy).toHaveBeenCalledWith("");
      valueSetterSpy.mockRestore();
    });
  });
});
