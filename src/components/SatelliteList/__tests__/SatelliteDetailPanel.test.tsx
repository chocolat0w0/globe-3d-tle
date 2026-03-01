import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SatelliteDetailPanel } from "../SatelliteDetailPanel";
import type { Satellite } from "../../../types/satellite";

/**
 * SatelliteDetailPanel component tests
 *
 * The component renders a detail panel for a single satellite with:
 *   - A satellite name heading
 *   - A colored indicator dot (.satellite-indicator) using satellite.color as background
 *   - An "オフナディア角" section with editable min/max number inputs per range
 *   - A close button (aria-label="詳細パネルを閉じる") that calls onClose when clicked
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** SENTINEL-1A: single positive-only range */
const SENTINEL1A: Satellite = {
  id: "sentinel1a",
  name: "SENTINEL-1A",
  tle: {
    line1: "1 39634U 14016A   26053.99037749 -.00000228  00000+0 -38637-4 0  9995",
    line2: "2 39634  98.1817  63.1723 0001334  84.0618 276.0734 14.59197482633361",
  },
  color: "#FF6B6B",
  offnadirRanges: [[22.3, 44.5]],
  visible: true,
  selected: false,
  showFootprint: false,
  showSwath: false,
};

/** TERRASAR-X: two ranges, one negative and one positive */
const TERRASAR: Satellite = {
  id: "terrasar-x",
  name: "TERRASAR-X",
  tle: {
    line1: "1 39634U 14016A   26053.99037749 -.00000228  00000+0 -38637-4 0  9995",
    line2: "2 39634  98.1817  63.1723 0001334  84.0618 276.0734 14.59197482633361",
  },
  color: "#45B7D1",
  offnadirRanges: [[-60, -15], [15, 60]],
  visible: true,
  selected: false,
  showFootprint: false,
  showSwath: false,
};

/** SENTINEL-2A: range spanning −5 to +5 */
const SENTINEL2A: Satellite = {
  id: "sentinel2a",
  name: "SENTINEL-2A",
  tle: {
    line1: "1 39634U 14016A   26053.99037749 -.00000228  00000+0 -38637-4 0  9995",
    line2: "2 39634  98.1817  63.1723 0001334  84.0618 276.0734 14.59197482633361",
  },
  color: "#FF8C00",
  offnadirRanges: [[-5, 5]],
  visible: true,
  selected: false,
  showFootprint: false,
  showSwath: false,
};

// ---------------------------------------------------------------------------
// 衛星名と色
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — satellite name and color indicator", () => {
  it("renders the satellite name for SENTINEL-1A", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.getByText("SENTINEL-1A")).toBeInTheDocument();
  });

  it("renders the satellite name for TERRASAR-X", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.getByText("TERRASAR-X")).toBeInTheDocument();
  });

  it("sets the background style of .satellite-indicator to satellite.color (#FF6B6B for SENTINEL-1A)", () => {
    const { container } = render(
      <SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />,
    );
    const indicator = container.querySelector(".satellite-indicator") as HTMLElement;
    expect(indicator).not.toBeNull();
    // jsdom normalizes hex color to rgb
    expect(indicator.style.background).toBe("rgb(255, 107, 107)");
  });

  it("sets the background style of .satellite-indicator to satellite.color (#45B7D1 for TERRASAR-X)", () => {
    const { container } = render(
      <SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />,
    );
    const indicator = container.querySelector(".satellite-indicator") as HTMLElement;
    expect(indicator).not.toBeNull();
    expect(indicator.style.background).toBe("rgb(69, 183, 209)");
  });

  it("sets the background style of .satellite-indicator to satellite.color (#FF8C00 for SENTINEL-2A)", () => {
    const { container } = render(
      <SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />,
    );
    const indicator = container.querySelector(".satellite-indicator") as HTMLElement;
    expect(indicator).not.toBeNull();
    expect(indicator.style.background).toBe("rgb(255, 140, 0)");
  });
});

// ---------------------------------------------------------------------------
// 閉じるボタン
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — close button", () => {
  it("renders a button with aria-label='詳細パネルを閉じる'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "詳細パネルを閉じる" });
    expect(btn).toBeInTheDocument();
  });

  it("calls onClose exactly once when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={onClose} onUpdateOffnadirRanges={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "詳細パネルを閉じる" });
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose before the button is clicked", () => {
    const onClose = vi.fn();
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={onClose} onUpdateOffnadirRanges={vi.fn()} />);
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — ラベル表示
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — オフナディア角 section label", () => {
  it("displays the 'オフナディア角' section label for a satellite with a single range", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.getByText("オフナディア角")).toBeInTheDocument();
  });

  it("displays the 'オフナディア角' section label for a satellite with two ranges", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.getByText("オフナディア角")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — 単一レンジ [[22.3, 44.5]]
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — single range [[22.3, 44.5]] (SENTINEL-1A)", () => {
  it("renders exactly one range row with index '#1'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).toBeNull();
  });

  it("renders the min input with value '22.3'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" }) as HTMLInputElement;
    expect(minInput.value).toBe("22.3");
  });

  it("renders the max input with value '44.5'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const maxInput = screen.getByRole("spinbutton", { name: "レンジ1 最大値" }) as HTMLInputElement;
    expect(maxInput.value).toBe("44.5");
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — 複数レンジ [[-60, -15], [15, 60]]
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — two ranges [[-60, -15], [15, 60]] (TERRASAR-X)", () => {
  it("renders two range rows with indices '#1' and '#2'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("does not render a third index '#3'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.queryByText("#3")).toBeNull();
  });

  it("renders range #1 min input with value '-60'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" }) as HTMLInputElement;
    expect(minInput.value).toBe("-60");
  });

  it("renders range #1 max input with value '-15'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const maxInput = screen.getByRole("spinbutton", { name: "レンジ1 最大値" }) as HTMLInputElement;
    expect(maxInput.value).toBe("-15");
  });

  it("renders range #2 min input with value '15'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ2 最小値" }) as HTMLInputElement;
    expect(minInput.value).toBe("15");
  });

  it("renders range #2 max input with value '60'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const maxInput = screen.getByRole("spinbutton", { name: "レンジ2 最大値" }) as HTMLInputElement;
    expect(maxInput.value).toBe("60");
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — ゼロ幅レンジ [[-5, 5]]
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — range [[-5, 5]] (SENTINEL-2A)", () => {
  it("renders exactly one range row with index '#1'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).toBeNull();
  });

  it("renders min input with value '-5'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" }) as HTMLInputElement;
    expect(minInput.value).toBe("-5");
  });

  it("renders max input with value '5'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const maxInput = screen.getByRole("spinbutton", { name: "レンジ1 最大値" }) as HTMLInputElement;
    expect(maxInput.value).toBe("5");
  });
});

// ---------------------------------------------------------------------------
// 入力値の境界値テスト
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — input boundary values", () => {
  it("renders zero min value as '0' in the input", () => {
    const satWithZero: Satellite = {
      ...SENTINEL1A,
      offnadirRanges: [[0, 30]],
    };
    render(<SatelliteDetailPanel satellite={satWithZero} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" }) as HTMLInputElement;
    expect(minInput.value).toBe("0");
  });

  it("renders full-domain range [-90, 90] with correct input values", () => {
    const satFullRange: Satellite = {
      ...SENTINEL1A,
      offnadirRanges: [[-90, 90]],
    };
    render(<SatelliteDetailPanel satellite={satFullRange} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" }) as HTMLInputElement;
    const maxInput = screen.getByRole("spinbutton", { name: "レンジ1 最大値" }) as HTMLInputElement;
    expect(minInput.value).toBe("-90");
    expect(maxInput.value).toBe("90");
  });
});

// ---------------------------------------------------------------------------
// onUpdateOffnadirRanges の呼び出し
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — onUpdateOffnadirRanges callback", () => {
  it("calls onUpdateOffnadirRanges when a valid min value is changed", () => {
    const onUpdate = vi.fn();
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={onUpdate} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" });
    fireEvent.change(minInput, { target: { value: "10" } });
    expect(onUpdate).toHaveBeenCalledWith([[10, 44.5]]);
  });

  it("does not call onUpdateOffnadirRanges when min exceeds max (invalid range)", () => {
    const onUpdate = vi.fn();
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={onUpdate} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" });
    fireEvent.change(minInput, { target: { value: "80" } }); // 80 > 44.5
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("shows an error message when min exceeds max", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} onUpdateOffnadirRanges={vi.fn()} />);
    const minInput = screen.getByRole("spinbutton", { name: "レンジ1 最小値" });
    fireEvent.change(minInput, { target: { value: "80" } });
    expect(screen.getByText(/minDeg <= maxDeg|無効な値/)).toBeInTheDocument();
  });
});
