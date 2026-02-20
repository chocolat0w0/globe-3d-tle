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
    id: "iss",
    name: "ISS (ZARYA)",
    tle: {
      line1: "1 25544U 98067A   24001.50000000  .00020137  00000-0  36371-3 0  9993",
      line2: "2 25544  51.6400 337.6580 0001584  86.9974 273.1408 15.50008824429730",
    },
    color: "#FF6B6B",
    visible: true,
    selected: false,
    ...overrides,
  };
}

/** 10 satellites that mirror the structure of sample-tle.json */
function makeTenSatellites(): Satellite[] {
  const specs = [
    { id: "iss",         name: "ISS (ZARYA)",   color: "#FF6B6B" },
    { id: "noaa19",      name: "NOAA 19",        color: "#4ECDC4" },
    { id: "terra",       name: "TERRA",          color: "#45B7D1" },
    { id: "aqua",        name: "AQUA",           color: "#96CEB4" },
    { id: "aura",        name: "AURA",           color: "#FFEAA7" },
    { id: "landsat8",    name: "LANDSAT 8",      color: "#DDA0DD" },
    { id: "sentinel2a",  name: "SENTINEL-2A",    color: "#FF8C00" },
    { id: "sentinel2b",  name: "SENTINEL-2B",    color: "#FF4500" },
    { id: "worldview3",  name: "WORLDVIEW-3",    color: "#20B2AA" },
    { id: "pleiades1a",  name: "PLEIADES 1A",    color: "#9370DB" },
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
        />
      );

      // Each row contains the satellite name as visible text
      for (const sat of sats) {
        expect(screen.getByText(sat.name)).toBeDefined();
      }
    });

    it("renders the name of every satellite", () => {
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
      );

      const expectedNames = [
        "ISS (ZARYA)", "NOAA 19", "TERRA", "AQUA", "AURA",
        "LANDSAT 8", "SENTINEL-2A", "SENTINEL-2B", "WORLDVIEW-3", "PLEIADES 1A",
      ];
      for (const name of expectedNames) {
        expect(screen.getByText(name)).toBeDefined();
      }
    });

    it("renders one checkbox per satellite (10 checkboxes total)", () => {
      const sats = makeTenSatellites();
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
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
        />
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
      const sat = makeSatellite({ id: "iss", name: "ISS (ZARYA)", visible: true });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
      );
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it("checkbox is unchecked when satellite visible=false", () => {
      const sat = makeSatellite({ id: "iss", name: "ISS (ZARYA)", visible: false });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
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
      const sat = makeSatellite({ id: "noaa19", name: "NOAA 19" });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={onToggleVisible}
          onSelect={vi.fn()}
        />
      );

      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      // React maps native click events to the synthetic onChange for controlled checkboxes.
      // fireEvent.change does NOT trigger React's onChange handler in jsdom;
      // fireEvent.click does (and the component's onClick calls stopPropagation so
      // the parent row's onSelect is NOT triggered).
      fireEvent.click(checkbox);

      expect(onToggleVisible).toHaveBeenCalledTimes(1);
      expect(onToggleVisible).toHaveBeenCalledWith("noaa19");
    });

    it("calls onToggleVisible with the correct id for the checkbox in the middle of a list (terra)", () => {
      const onToggleVisible = vi.fn();
      const sats = makeTenSatellites();
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={onToggleVisible}
          onSelect={vi.fn()}
        />
      );

      // terra is at index 2 — find the third checkbox
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[2]);

      expect(onToggleVisible).toHaveBeenCalledTimes(1);
      expect(onToggleVisible).toHaveBeenCalledWith("terra");
    });

    it("calls onToggleVisible with the id of the last satellite (pleiades1a) when its checkbox is clicked", () => {
      const onToggleVisible = vi.fn();
      const sats = makeTenSatellites();
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={onToggleVisible}
          onSelect={vi.fn()}
        />
      );

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[9]);

      expect(onToggleVisible).toHaveBeenCalledWith("pleiades1a");
    });

    it("clicking the checkbox does NOT call onSelect (stopPropagation is in effect)", () => {
      const onSelect = vi.fn();
      const onToggleVisible = vi.fn();
      const sat = makeSatellite({ id: "iss", name: "ISS (ZARYA)" });
      const { container } = render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={onToggleVisible}
          onSelect={onSelect}
        />
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
      const sat = makeSatellite({ id: "aqua", name: "AQUA" });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={onSelect}
        />
      );

      fireEvent.click(screen.getByText("AQUA"));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith("aqua");
    });

    it("calls onSelect with the correct id when any of the 10 rows are clicked", () => {
      const onSelect = vi.fn();
      const sats = makeTenSatellites();
      render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={onSelect}
        />
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
        />
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
      const sat = makeSatellite({ id: "iss", name: "ISS (ZARYA)", selected: true });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
      );

      // The row is the div that wraps the satellite name — walk up from the text node
      const nameEl = screen.getByText("ISS (ZARYA)");
      const row = nameEl.closest('[style*="cursor: pointer"]') as HTMLElement;
      expect(row).toBeDefined();
      // Background is NOT "transparent" when selected
      expect(row.style.background).not.toBe("transparent");
    });

    it("applies transparent background to the row of an unselected satellite", () => {
      const sat = makeSatellite({ id: "iss", name: "ISS (ZARYA)", selected: false });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
      );

      const nameEl = screen.getByText("ISS (ZARYA)");
      const row = nameEl.closest('[style*="cursor: pointer"]') as HTMLElement;
      expect(row).toBeDefined();
      expect(row.style.background).toBe("transparent");
    });

    it("only the selected satellite's row has a non-transparent background when one of ten is selected", () => {
      const sats = makeTenSatellites().map((s) =>
        s.id === "aura" ? { ...s, selected: true } : s
      );
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
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
  // Visual feedback: visibility (opacity)
  // ---------------------------------------------------------------------------

  describe("visual feedback for visible state", () => {
    it("applies opacity:1 to the row of a visible satellite", () => {
      const sat = makeSatellite({ id: "iss", name: "ISS (ZARYA)", visible: true });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
      );

      const nameEl = screen.getByText("ISS (ZARYA)");
      const row = nameEl.closest('[style*="cursor: pointer"]') as HTMLElement;
      expect(row.style.opacity).toBe("1");
    });

    it("applies opacity:0.4 to the row of a hidden satellite (visible=false)", () => {
      const sat = makeSatellite({ id: "iss", name: "ISS (ZARYA)", visible: false });
      render(
        <SatelliteList
          satellites={[sat]}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
      );

      const nameEl = screen.getByText("ISS (ZARYA)");
      const row = nameEl.closest('[style*="cursor: pointer"]') as HTMLElement;
      expect(row.style.opacity).toBe("0.4");
    });

    it("only hidden satellites have opacity:0.4 when two of ten are hidden", () => {
      const hiddenIds = new Set(["terra", "sentinel2b"]);
      const sats = makeTenSatellites().map((s) =>
        hiddenIds.has(s.id) ? { ...s, visible: false } : s
      );
      const { container } = render(
        <SatelliteList
          satellites={sats}
          onToggleVisible={vi.fn()}
          onSelect={vi.fn()}
        />
      );

      const rows = container.querySelectorAll('[style*="cursor: pointer"]');
      const dimmedRows = Array.from(rows).filter(
        (r) => (r as HTMLElement).style.opacity === "0.4"
      );
      expect(dimmedRows).toHaveLength(2);
    });
  });
});
