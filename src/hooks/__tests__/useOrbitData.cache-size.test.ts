import { beforeEach, describe, expect, it } from "vitest";
import type { OrbitData } from "../../types/orbit";
import { orbitCache } from "../useOrbitData";

function makeOrbitData(timesCount: number, ecefCount: number): OrbitData {
  return {
    timesMs: new Float64Array(timesCount),
    ecef: new Float32Array(ecefCount),
  };
}

describe("useOrbitData orbitCache estimatedBytes", () => {
  beforeEach(() => {
    orbitCache.clear();
  });

  it("timesMs と ecef の byteLength 合計が estimatedBytes に反映される", () => {
    const orbitData = makeOrbitData(3, 9);
    orbitCache.set("sat:day:30", orbitData);

    const expected = orbitData.timesMs.byteLength + orbitData.ecef.byteLength;
    expect(orbitCache.estimatedBytes).toBe(expected);
  });

  it("同一キー上書き時は差し替え後サイズに更新される", () => {
    orbitCache.set("sat:day:30", makeOrbitData(10, 30));
    const updated = makeOrbitData(1, 3);
    orbitCache.set("sat:day:30", updated);

    const expected = updated.timesMs.byteLength + updated.ecef.byteLength;
    expect(orbitCache.estimatedBytes).toBe(expected);
  });

  it("clear 後は estimatedBytes が 0 になる", () => {
    orbitCache.set("sat:day:30", makeOrbitData(10, 30));
    orbitCache.clear();
    expect(orbitCache.estimatedBytes).toBe(0);
  });
});
