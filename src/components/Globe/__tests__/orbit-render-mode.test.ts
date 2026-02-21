import { describe, it, expect } from "vitest";
import { ArcType } from "cesium";
import { toCesiumArcType } from "../orbit-render-mode";

describe("toCesiumArcType", () => {
  it("returns ArcType.GEODESIC for geodesic mode", () => {
    expect(toCesiumArcType("geodesic")).toBe(ArcType.GEODESIC);
  });

  it("returns ArcType.NONE for cartesian mode", () => {
    expect(toCesiumArcType("cartesian")).toBe(ArcType.NONE);
  });
});
