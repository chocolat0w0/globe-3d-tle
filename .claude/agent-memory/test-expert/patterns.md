# Testing Patterns — globe-3d-tle

## Worker Testing Without jsdom Worker Support

Since jsdom does not support `new Worker()`, test Worker logic by decomposing it:

```typescript
// 1. Call the pure computation function directly
const orbitData = computeOrbit(tle1, tle2, startMs, durationMs, stepSec);

// 2. Simulate the Worker's pack step (what Worker does before postMessage)
const timesBuffer = orbitData.timesMs.buffer as ArrayBuffer;
const ecefBuffer = orbitData.ecef.buffer as ArrayBuffer;

// 3. Simulate the main thread's unpack step (what onmessage handler does)
const restored = {
  timesMs: new Float64Array(timesBuffer),
  ecef: new Float32Array(ecefBuffer),
};
```

## TypedArray Testing Checklist

When testing TypedArray outputs, always verify:
1. `instanceof Float64Array` / `instanceof Float32Array` (not just truthy)
2. `.length` matches expected count
3. `.buffer.byteLength` === `length * bytesPerElement` (8 for F64, 4 for F32)
4. Individual values match expected with `toBe()` for exact bit equality
5. Structural invariant: `ecef.length === timesMs.length * 3`

## Common Pitfalls Found

### NaN positions from invalid TLE not caught by orbit.ts guard
- `typeof posVel.position === "boolean"` does NOT catch `{x:NaN, y:NaN, z:NaN}`
- Invalid/empty TLEs produce NaN-filled ecef arrays (not empty arrays)
- This is a known gap in the production code — write tests that document actual behavior

### Float32Array precision loss
- Float32 has ~7 decimal digits of precision
- ECEF coordinates in meters (~6,787,000 m) lose sub-meter precision
- Use `toBe()` for round-trip testing (same Float32 bits), not `toBeCloseTo()`

## Test Structure Template for computeOrbit

```typescript
describe("computeOrbit", () => {
  describe("return type integrity", () => { /* instanceof checks */ });
  describe("sample count", () => { /* Math.floor(durationMs / stepMs) + 1 */ });
  describe("ecef array structure", () => { /* length === timesMs.length * 3 */ });
  describe("ECEF coordinate validity", () => { /* distance > earth radius */ });
  describe("timesMs monotonicity and values", () => { /* strictly increasing */ });
  describe("stepSec boundary values", () => { /* stepSec=1, stepSec=durationSec */ });
  describe("UTC day boundary correctness", () => { /* spans midnight UTC */ });
});
```
