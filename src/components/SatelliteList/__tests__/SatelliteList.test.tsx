import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SatelliteList } from "../SatelliteList";
import type { Satellite } from "../../../types/satellite";

/**
 * SatelliteList component tests
 *
 * The component renders a scrollable list of satellite rows.  Each row:
 *   - displays the satellite name
 *   - contains a checkbox that calls onToggleVisible when changed
 *   - calls onSelect when the row itself is clicked
 *   - applies opacity:0.4 to rows where visible=false
 *   - applies a non-transparent background to the row where selected=true
 *
 * The checkbox has an onClick handler that calls e.stopPropagation(),
 * so clicking the checkbox must NOT also fire onSelect.
 *
 * Tests use controlled props (vi.fn() callbacks) so no real hook state is needed.
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSatellite(overrides: Partial<Satellite> = {}): Satellite {
  return {
    id: "sentinel1a",
    name: "SENTINEL-1A",
    tle: {
      line1: "1 39634U 14016A   26053.99037749 -.00000228  00000+0 -38637-4 0  9995",
      line2: "2 39634  98.1817  63.1723 0001334  84.0618 276.0734 14.59197482633361",
    },
    color: "#6A8DFF",
    offnadirRanges: [[22.3, 44.5]],
    visible: true,
    selected: false,
    showFootprint: false,
    showSwath: false,
    ...overrides,
  };
}

/** 10 satellites that mirror the structure of sample-tle.json */
function makeTenSatellites(): Satellite[] {
  const specs = [
    { id: "sentinel1a", name: "SENTINEL-1A", color: "#FF6B6B" },
    { id: "sentinel1b", name: "SENTINEL-1B", color: "#6A8DFF" },
    { id: "terra", name: "TERRA", color: "#45B7D1" },
    { id: "capella", name: "CAPELLA", color: "#FF9F1C" },
    { id: "iceye", name: "ICEYE", color: "#2EC4B6" },
    { id: "landsat8", name: "LANDSAT 8", color: "#DDA0DD" },
    { id: "sentinel2a", name: "SENTINEL-2A", color: "#FF8C00" },
    { id: "sentinel2b", name: "SENTINEL-2B", color: "#FF4500" },
    { id: "worldview3", name: "WORLDVIEW-3", color: "#20B2AA" },
    { id: "himawari", name: "ひまわり8号", color: "#9370DB" },
  ];
  return specs.map((s) => makeSatellite(s));
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("SatelliteList", () => {
  describe("rendering all satellites", () => {
    it("renders exactly 10 satellite rows when given 10 satellites", () => {
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      // Each row contains the satellite name as visible text
      for (const sat of sats) {
        expect(screen.getByText(sat.name)).toBeInTheDocument();
      }
    });

    it("renders the name of every satellite", () => {
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const expectedNames = [
        "SENTINEL-1A",
        "SENTINEL-1B",
        "TERRA",
        "CAPELLA",
        "ICEYE",
        "LANDSAT 8",
        "SENTINEL-2A",
        "SENTINEL-2B",
        "WORLDVIEW-3",
        "ひまわり8号",
      ];
      for (const name of expectedNames) {
        expect(screen.getByText(name)).toBeInTheDocument();
      }
    });

    it("renders one checkbox per satellite (10 checkboxes total)", () => {
      const sats = makeTenSatellites();
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(10);
    });

    it("renders an empty list without crashing when satellites array is empty", () => {
      const { container } = render(
        <SatelliteList
          satellites={[]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Checkbox state reflects props
  // ---------------------------------------------------------------------------

  describe("checkbox reflects visible prop", () => {
    it("checkbox is checked when satellite visible=true", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", visible: true });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("checkbox is unchecked when satellite visible=false", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", visible: false });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // onToggleVisible callback
  // ---------------------------------------------------------------------------

  describe("onToggleVisible callback", () => {
    it("calls onToggleVisible with the correct satellite id when the checkbox is clicked", () => {
      const onToggleVisible = vi.fn();
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A" });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={onToggleVisible}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      // React maps native click events to the synthetic onChange for controlled checkboxes.
      // fireEvent.change does NOT trigger React's onChange handler in jsdom;
      // fireEvent.click does (and the component's onClick calls stopPropagation so
      // the parent row's onSelect is NOT triggered).
      fireEvent.click(checkbox);

      expect(onToggleVisible).toHaveBeenCalledTimes(1);
      expect(onToggleVisible).toHaveBeenCalledWith("sentinel1a");
    });

    it("calls onToggleVisible with the correct id for the checkbox in the middle of a list (terra)", () => {
      const onToggleVisible = vi.fn();
      const sats = makeTenSatellites();
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={onToggleVisible}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      // terra is at index 2 — find the third checkbox
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[2]);

      expect(onToggleVisible).toHaveBeenCalledTimes(1);
      expect(onToggleVisible).toHaveBeenCalledWith("terra");
    });

    it("calls onToggleVisible with the id of the last satellite (himawari) when its checkbox is clicked", () => {
      const onToggleVisible = vi.fn();
      const sats = makeTenSatellites();
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={onToggleVisible}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[9]);

      expect(onToggleVisible).toHaveBeenCalledWith("himawari");
    });

    it("clicking the checkbox does NOT call onSelect (stopPropagation is in effect)", () => {
      const onSelect = vi.fn();
      const onToggleVisible = vi.fn();
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A" });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={onToggleVisible}
          onSelect={onSelect}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      // Simulate a real user click on the checkbox element
      fireEvent.click(checkbox);

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onSelect callback
  // ---------------------------------------------------------------------------

  describe("onSelect callback", () => {
    it("calls onSelect with the correct satellite id when the row is clicked", () => {
      const onSelect = vi.fn();
      const sat = makeSatellite({ id: "capella", name: "CAPELLA" });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={onSelect}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("CAPELLA"));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith("capella");
    });

    it("calls onSelect with the correct id when any of the 10 rows are clicked", () => {
      const onSelect = vi.fn();
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={onSelect}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      // Click on SENTINEL-2B row
      fireEvent.click(screen.getByText("SENTINEL-2B"));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith("sentinel2b");
    });

    it("calls onSelect once per row click (not duplicated)", () => {
      const onSelect = vi.fn();
      const sat = makeSatellite({ id: "landsat8", name: "LANDSAT 8" });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={onSelect}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("LANDSAT 8"));

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Visual feedback: selected state
  // ---------------------------------------------------------------------------

  describe("visual feedback for selected state", () => {
    it("applies a non-transparent background style to the row of a selected satellite", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", selected: true });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      // The row is the div that wraps the satellite name — walk up from the text node
      const nameEl = screen.getByText("SENTINEL-1A");
      const row = nameEl.closest('[style*="cursor: pointer"]');
      expect(row).not.toBeNull();
      // Background is NOT "transparent" when selected
      expect((row as HTMLElement).style.background).not.toBe("transparent");
    });

    it("applies transparent background to the row of an unselected satellite", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", selected: false });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const nameEl = screen.getByText("SENTINEL-1A");
      const row = nameEl.closest('[style*="cursor: pointer"]');
      expect(row).not.toBeNull();
      expect((row as HTMLElement).style.background).toBe("transparent");
    });

    it("only the selected satellite's row has a non-transparent background when one of ten is selected", () => {
      const sats = makeTenSatellites().map((s) =>
        s.id === "iceye" ? { ...s, selected: true } : s,
      );
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      // Row divs have `display: flex` in their inline style.
      // The outer wrapper uses `position: absolute`, the header/footer use padding-only styles,
      // and the checkbox inputs are not divs — so this selector uniquely identifies the 10 row divs.
      const rows = container.querySelectorAll('div[style*="display: flex"]');
      expect(rows).toHaveLength(10);

      let highlightedCount = 0;
      for (const row of Array.from(rows)) {
        const el = row as HTMLElement;
        if (el.style.background !== "transparent") {
          highlightedCount++;
        }
      }
      expect(highlightedCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // FP button: onToggleFootprint callback
  // ---------------------------------------------------------------------------

  describe("onToggleFootprint callback", () => {
    it("renders one FP button per satellite (10 total)", () => {
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const fpButtons = screen.getAllByText("FP");
      expect(fpButtons).toHaveLength(10);
    });

    it("calls onToggleFootprint with the correct id when FP button is clicked", () => {
      const onToggleFootprint = vi.fn();
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A" });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={onToggleFootprint}
          onToggleSwath={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByText("FP"));
      expect(onToggleFootprint).toHaveBeenCalledTimes(1);
      expect(onToggleFootprint).toHaveBeenCalledWith("sentinel1a");
    });

    it("clicking FP button does NOT call onSelect (stopPropagation is in effect)", () => {
      const onSelect = vi.fn();
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A" });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={onSelect}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByText("FP"));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("calls onToggleFootprint with the id of the third satellite (terra) when its FP button is clicked", () => {
      const onToggleFootprint = vi.fn();
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={onToggleFootprint}
          onToggleSwath={vi.fn()}
        />,
      );
      const fpButtons = screen.getAllByText("FP");
      fireEvent.click(fpButtons[2]); // terra は index 2
      expect(onToggleFootprint).toHaveBeenCalledWith("terra");
    });

    it("FP button title changes when showFootprint=true", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", showFootprint: true });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const fpButton = screen.getByText("FP") as HTMLButtonElement;
      expect(fpButton.title).toBe("フットプリントを非表示");
    });

    it("FP button title shows 'フットプリントを表示' when showFootprint=false", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", showFootprint: false });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const fpButton = screen.getByText("FP") as HTMLButtonElement;
      expect(fpButton.title).toBe("フットプリントを表示");
    });
  });

  // ---------------------------------------------------------------------------
  // SW button: onToggleSwath callback
  // ---------------------------------------------------------------------------

  describe("onToggleSwath callback", () => {
    it("renders one SW button per satellite (10 total)", () => {
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const swButtons = screen.getAllByText("SW");
      expect(swButtons).toHaveLength(10);
    });

    it("calls onToggleSwath with the correct id when SW button is clicked", () => {
      const onToggleSwath = vi.fn();
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A" });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={onToggleSwath}
        />,
      );
      fireEvent.click(screen.getByText("SW"));
      expect(onToggleSwath).toHaveBeenCalledTimes(1);
      expect(onToggleSwath).toHaveBeenCalledWith("sentinel1a");
    });

    it("clicking SW button does NOT call onSelect (stopPropagation is in effect)", () => {
      const onSelect = vi.fn();
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A" });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={onSelect}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByText("SW"));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("SW button title changes when showSwath=true", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", showSwath: true });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const swButton = screen.getByText("SW") as HTMLButtonElement;
      expect(swButton.title).toBe("スワスを非表示");
    });

    it("SW button title shows 'スワスを表示' when showSwath=false", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", showSwath: false });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );
      const swButton = screen.getByText("SW") as HTMLButtonElement;
      expect(swButton.title).toBe("スワスを表示");
    });
  });

  // ---------------------------------------------------------------------------
  // Visual feedback: visibility (opacity)
  // ---------------------------------------------------------------------------

  describe("visual feedback for visible state", () => {
    it("applies opacity:1 to the row of a visible satellite", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", visible: true });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const nameEl = screen.getByText("SENTINEL-1A");
      const row = nameEl.closest('[style*="cursor: pointer"]') as HTMLElement;
      expect(row.style.opacity).toBe("1");
    });

    it("applies opacity:0.4 to the row of a hidden satellite (visible=false)", () => {
      const sat = makeSatellite({ id: "sentinel1a", name: "SENTINEL-1A", visible: false });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const nameEl = screen.getByText("SENTINEL-1A");
      const row = nameEl.closest('[style*="cursor: pointer"]') as HTMLElement;
      expect(row.style.opacity).toBe("0.4");
    });

    it("only hidden satellites have opacity:0.4 when two of ten are hidden", () => {
      const hiddenIds = new Set(["terra", "sentinel2b"]);
      const sats = makeTenSatellites().map((s) =>
        hiddenIds.has(s.id) ? { ...s, visible: false } : s,
      );
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
          onToggleFootprint={vi.fn()}
          onToggleSwath={vi.fn()}
        />,
      );

      const rows = container.querySelectorAll('[style*="cursor: pointer"]');
      const dimmedRows = Array.from(rows).filter((r) => (r as HTMLElement).style.opacity === "0.4");
      expect(dimmedRows).toHaveLength(2);
    });
  });
});
