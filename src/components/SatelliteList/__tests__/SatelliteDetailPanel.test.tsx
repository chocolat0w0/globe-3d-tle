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
 *   - An "オフナディア角" section listing each OffnadirRange as "#N min — max"
 *   - formatDeg: non-negative values get a "+" prefix (e.g. +22.3°), negatives are bare (e.g. -60°)
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

/** SENTINEL-2A: zero-width range spanning −5 to +5 */
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
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} />);
    expect(screen.getByText("SENTINEL-1A")).toBeInTheDocument();
  });

  it("renders the satellite name for TERRASAR-X", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />);
    expect(screen.getByText("TERRASAR-X")).toBeInTheDocument();
  });

  it("sets the background style of .satellite-indicator to satellite.color (#FF6B6B for SENTINEL-1A)", () => {
    const { container } = render(
      <SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} />,
    );
    const indicator = container.querySelector(".satellite-indicator") as HTMLElement;
    expect(indicator).not.toBeNull();
    // jsdom normalizes hex color to rgb
    expect(indicator.style.background).toBe("rgb(255, 107, 107)");
  });

  it("sets the background style of .satellite-indicator to satellite.color (#45B7D1 for TERRASAR-X)", () => {
    const { container } = render(
      <SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />,
    );
    const indicator = container.querySelector(".satellite-indicator") as HTMLElement;
    expect(indicator).not.toBeNull();
    expect(indicator.style.background).toBe("rgb(69, 183, 209)");
  });

  it("sets the background style of .satellite-indicator to satellite.color (#FF8C00 for SENTINEL-2A)", () => {
    const { container } = render(
      <SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} />,
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
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "詳細パネルを閉じる" });
    expect(btn).toBeInTheDocument();
  });

  it("calls onClose exactly once when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={onClose} />);
    const btn = screen.getByRole("button", { name: "詳細パネルを閉じる" });
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose before the button is clicked", () => {
    const onClose = vi.fn();
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — ラベル表示
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — オフナディア角 section label", () => {
  it("displays the 'オフナディア角' section label for a satellite with a single range", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} />);
    expect(screen.getByText("オフナディア角")).toBeInTheDocument();
  });

  it("displays the 'オフナディア角' section label for a satellite with two ranges", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />);
    expect(screen.getByText("オフナディア角")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — 単一レンジ [[22.3, 44.5]]
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — single range [[22.3, 44.5]] (SENTINEL-1A)", () => {
  it("renders exactly one range row with index '#1'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).toBeNull();
  });

  it("renders the min value with '+' prefix as '+22.3°'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} />);
    // The range text is rendered as a single span containing both values
    const rangeSpan = screen.getByText("+22.3° — +44.5°");
    expect(rangeSpan).toBeInTheDocument();
  });

  it("renders the max value with '+' prefix as '+44.5°'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL1A} onClose={vi.fn()} />);
    const rangeSpan = screen.getByText("+22.3° — +44.5°");
    expect(rangeSpan.textContent).toContain("+44.5°");
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — 複数レンジ [[-60, -15], [15, 60]]
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — two ranges [[-60, -15], [15, 60]] (TERRASAR-X)", () => {
  it("renders two range rows with indices '#1' and '#2'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("does not render a third index '#3'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />);
    expect(screen.queryByText("#3")).toBeNull();
  });

  it("renders range #1 with negative values without '+' prefix: '-60° — -15°'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />);
    expect(screen.getByText("-60° — -15°")).toBeInTheDocument();
  });

  it("renders range #2 with positive values with '+' prefix: '+15° — +60°'", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />);
    expect(screen.getByText("+15° — +60°")).toBeInTheDocument();
  });

  it("negative min value '-60°' does NOT have a '+' prefix", () => {
    render(<SatelliteDetailPanel satellite={TERRASAR} onClose={vi.fn()} />);
    const rangeSpan = screen.getByText("-60° — -15°");
    expect(rangeSpan.textContent).not.toContain("+-60°");
    expect(rangeSpan.textContent).toContain("-60°");
  });
});

// ---------------------------------------------------------------------------
// オフナディア角セクション — ゼロ幅レンジ [[-5, 5]]
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — zero-width range [[-5, 5]] (SENTINEL-2A)", () => {
  it("renders exactly one range row with index '#1'", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).toBeNull();
  });

  it("renders the range '-5° — +5°' where the min is negative and max is positive", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} />);
    expect(screen.getByText("-5° — +5°")).toBeInTheDocument();
  });

  it("renders min value '-5°' without '+' prefix (negative number)", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} />);
    const rangeSpan = screen.getByText("-5° — +5°");
    expect(rangeSpan.textContent).toContain("-5°");
    expect(rangeSpan.textContent).not.toContain("+-5°");
  });

  it("renders max value '+5°' with '+' prefix (zero-or-positive number)", () => {
    render(<SatelliteDetailPanel satellite={SENTINEL2A} onClose={vi.fn()} />);
    const rangeSpan = screen.getByText("-5° — +5°");
    expect(rangeSpan.textContent).toContain("+5°");
  });
});

// ---------------------------------------------------------------------------
// formatDeg の境界値: ゼロの扱い
// ---------------------------------------------------------------------------

describe("SatelliteDetailPanel — formatDeg boundary: zero value gets '+' prefix", () => {
  it("renders zero degree value as '+0°' (zero is treated as non-negative)", () => {
    const satWithZero: Satellite = {
      ...SENTINEL1A,
      offnadirRanges: [[0, 30]],
    };
    render(<SatelliteDetailPanel satellite={satWithZero} onClose={vi.fn()} />);
    expect(screen.getByText("+0° — +30°")).toBeInTheDocument();
  });

  it("renders a range [-90, 90] spanning the full offnadir domain correctly", () => {
    const satFullRange: Satellite = {
      ...SENTINEL1A,
      offnadirRanges: [[-90, 90]],
    };
    render(<SatelliteDetailPanel satellite={satFullRange} onClose={vi.fn()} />);
    expect(screen.getByText("-90° — +90°")).toBeInTheDocument();
  });
});
