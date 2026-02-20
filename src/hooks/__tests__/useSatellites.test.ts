import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSatellites } from "../useSatellites";

/**
 * useSatellites hook tests
 *
 * The hook manages state for the 10-satellite list loaded from sample-tle.json.
 * These tests verify:
 *   - Initial state matches JSON data (all visible, none selected)
 *   - toggleVisible flips only the targeted satellite's visibility
 *   - selectSatellite is mutually exclusive: selecting one deselects all others
 *   - Re-calling selectSatellite with the same ID toggles it back to false
 *
 * We use the real JSON data so that test IDs and names match production exactly.
 * No mocking of sample-tle.json is needed — the hook always starts from INITIAL.
 */

/** All satellite IDs present in sample-tle.json, in order */
const ALL_IDS = [
  "iss",
  "noaa19",
  "terra",
  "aqua",
  "aura",
  "landsat8",
  "sentinel2a",
  "sentinel2b",
  "worldview3",
  "pleiades1a",
];

describe("useSatellites", () => {
  describe("initial state", () => {
    it("exposes exactly 10 satellites matching sample-tle.json", () => {
      const { result } = renderHook(() => useSatellites());
      expect(result.current.satellites).toHaveLength(10);
    });

    it("initialises every satellite with visible=true", () => {
      const { result } = renderHook(() => useSatellites());
      const allVisible = result.current.satellites.every((s) => s.visible === true);
      expect(allVisible).toBe(true);
    });

    it("initialises every satellite with selected=false", () => {
      const { result } = renderHook(() => useSatellites());
      const noneSelected = result.current.satellites.every((s) => s.selected === false);
      expect(noneSelected).toBe(true);
    });

    it("exposes satellites with the IDs defined in sample-tle.json in order", () => {
      const { result } = renderHook(() => useSatellites());
      const ids = result.current.satellites.map((s) => s.id);
      expect(ids).toEqual(ALL_IDS);
    });

    it("exposes satellites with non-empty name, color, and TLE lines", () => {
      const { result } = renderHook(() => useSatellites());
      for (const sat of result.current.satellites) {
        expect(sat.name.length).toBeGreaterThan(0);
        expect(sat.color.length).toBeGreaterThan(0);
        expect(sat.tle.line1.length).toBeGreaterThan(0);
        expect(sat.tle.line2.length).toBeGreaterThan(0);
      }
    });
  });

  describe("toggleVisible", () => {
    it("sets visible=false for a satellite that was visible=true", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.toggleVisible("iss");
      });

      const iss = result.current.satellites.find((s) => s.id === "iss")!;
      expect(iss.visible).toBe(false);
    });

    it("does not change visible for any other satellite when toggling iss", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.toggleVisible("iss");
      });

      const others = result.current.satellites.filter((s) => s.id !== "iss");
      const allStillVisible = others.every((s) => s.visible === true);
      expect(allStillVisible).toBe(true);
    });

    it("restores visible=true when toggled twice (idempotent round-trip)", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.toggleVisible("noaa19");
      });
      act(() => {
        result.current.toggleVisible("noaa19");
      });

      const noaa19 = result.current.satellites.find((s) => s.id === "noaa19")!;
      expect(noaa19.visible).toBe(true);
    });

    it("correctly toggles a satellite in the middle of the list (terra, index 2)", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.toggleVisible("terra");
      });

      const terra = result.current.satellites.find((s) => s.id === "terra")!;
      expect(terra.visible).toBe(false);

      // All other 9 satellites remain visible
      const others = result.current.satellites.filter((s) => s.id !== "terra");
      expect(others.every((s) => s.visible)).toBe(true);
    });

    it("correctly toggles the last satellite in the list (pleiades1a)", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.toggleVisible("pleiades1a");
      });

      const pleiades = result.current.satellites.find((s) => s.id === "pleiades1a")!;
      expect(pleiades.visible).toBe(false);
    });

    it("toggling a non-selected satellite does not change any selected state", () => {
      const { result } = renderHook(() => useSatellites());

      // No satellite is selected — hiding one should leave all selected=false
      act(() => {
        result.current.toggleVisible("iss");
      });

      const noneSelected = result.current.satellites.every((s) => s.selected === false);
      expect(noneSelected).toBe(true);
    });
  });

  describe("selectSatellite", () => {
    it("sets selected=true for the targeted satellite", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.selectSatellite("aqua");
      });

      const aqua = result.current.satellites.find((s) => s.id === "aqua")!;
      expect(aqua.selected).toBe(true);
    });

    it("sets selected=false for all other satellites when one is selected (exclusive selection)", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.selectSatellite("aqua");
      });

      const others = result.current.satellites.filter((s) => s.id !== "aqua");
      const noneSelected = others.every((s) => s.selected === false);
      expect(noneSelected).toBe(true);
    });

    it("deselects the satellite when the same ID is passed a second time (toggle off)", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.selectSatellite("terra");
      });
      act(() => {
        result.current.selectSatellite("terra");
      });

      const terra = result.current.satellites.find((s) => s.id === "terra")!;
      expect(terra.selected).toBe(false);
    });

    it("deselects the previously selected satellite when a different satellite is selected", () => {
      const { result } = renderHook(() => useSatellites());

      // First select iss
      act(() => {
        result.current.selectSatellite("iss");
      });
      const issAfterFirst = result.current.satellites.find((s) => s.id === "iss")!;
      expect(issAfterFirst.selected).toBe(true);

      // Now select landsat8 — iss must become false
      act(() => {
        result.current.selectSatellite("landsat8");
      });

      const issAfterSecond = result.current.satellites.find((s) => s.id === "iss")!;
      const landsat8 = result.current.satellites.find((s) => s.id === "landsat8")!;
      expect(issAfterSecond.selected).toBe(false);
      expect(landsat8.selected).toBe(true);
    });

    it("at most one satellite is selected at any time after multiple selectSatellite calls", () => {
      const { result } = renderHook(() => useSatellites());

      // Cycle through three different satellites
      act(() => { result.current.selectSatellite("iss"); });
      act(() => { result.current.selectSatellite("noaa19"); });
      act(() => { result.current.selectSatellite("sentinel2a"); });

      const selectedCount = result.current.satellites.filter((s) => s.selected).length;
      expect(selectedCount).toBe(1);

      const selected = result.current.satellites.find((s) => s.selected)!;
      expect(selected.id).toBe("sentinel2a");
    });

    it("selectSatellite does not change any satellite's visible state", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.selectSatellite("worldview3");
      });

      const allVisible = result.current.satellites.every((s) => s.visible === true);
      expect(allVisible).toBe(true);
    });

    it("selecting the last satellite (pleiades1a) leaves no other satellite selected", () => {
      const { result } = renderHook(() => useSatellites());

      act(() => {
        result.current.selectSatellite("pleiades1a");
      });

      const others = result.current.satellites.filter((s) => s.id !== "pleiades1a");
      expect(others.every((s) => s.selected === false)).toBe(true);
      const pleiades = result.current.satellites.find((s) => s.id === "pleiades1a")!;
      expect(pleiades.selected).toBe(true);
    });
  });

  describe("toggleVisible and selectSatellite interaction", () => {
    it("hiding a selected satellite also clears its selected state (prevents stale trackedEntity)", () => {
      const { result } = renderHook(() => useSatellites());

      // Select iss, then hide it
      act(() => { result.current.selectSatellite("iss"); });
      act(() => { result.current.toggleVisible("iss"); });

      const iss = result.current.satellites.find((s) => s.id === "iss")!;
      expect(iss.visible).toBe(false);
      expect(iss.selected).toBe(false);
    });

    it("hiding a non-selected satellite does not affect any selected state", () => {
      const { result } = renderHook(() => useSatellites());

      // Select noaa19, then hide iss (different satellite)
      act(() => { result.current.selectSatellite("noaa19"); });
      act(() => { result.current.toggleVisible("iss"); });

      const noaa19 = result.current.satellites.find((s) => s.id === "noaa19")!;
      expect(noaa19.selected).toBe(true);
    });

    it("re-showing a previously hidden+selected satellite does not restore selected state", () => {
      const { result } = renderHook(() => useSatellites());

      // Select iss → hide iss → show iss again
      act(() => { result.current.selectSatellite("iss"); });
      act(() => { result.current.toggleVisible("iss"); }); // hide (selected becomes false)
      act(() => { result.current.toggleVisible("iss"); }); // show again

      const iss = result.current.satellites.find((s) => s.id === "iss")!;
      expect(iss.visible).toBe(true);
      expect(iss.selected).toBe(false); // requires explicit re-selection
    });

    it("selecting a hidden satellite makes it selected without changing its visibility", () => {
      const { result } = renderHook(() => useSatellites());

      // Hide noaa19 first, then select it
      act(() => { result.current.toggleVisible("noaa19"); });
      act(() => { result.current.selectSatellite("noaa19"); });

      const noaa19 = result.current.satellites.find((s) => s.id === "noaa19")!;
      expect(noaa19.visible).toBe(false);
      expect(noaa19.selected).toBe(true);
    });
  });
});
