# Test Expert Agent Memory — globe-3d-tle

## Project Test Infrastructure
- Framework: Vitest v2 with jsdom environment
- Setup file: `src/test-setup.ts` (imports @testing-library/jest-dom)
- Config: `vitest.config.ts` — globals=true, environment=jsdom
- Test command: `npm test` (runs `vitest run`)
- Test directories: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- Import style: `import { describe, it, expect } from "vitest"` (explicit, not global)

## Confirmed Test File Locations
- `tests/unit/orbit.test.ts` — computeOrbit unit tests
- `tests/unit/orbit-worker.test.ts` — Worker Transferable round-trip tests
- `src/hooks/__tests__/useSatellites.test.ts` — useSatellites hook (Phase 5, 20 tests)
- `src/components/SatelliteList/__tests__/SatelliteList.test.tsx` — SatelliteList component (Phase 5, 19 tests)

## Key Module Paths (from test files)
- `../../src/lib/tle/orbit` — computeOrbit function
- `../../src/types/orbit` — OrbitData interface (Float64Array timesMs, Float32Array ecef)
- `../../src/workers/orbit-calculator.worker.ts` — cannot be directly instantiated in jsdom

## satellite.js Behavior (verified)
- Invalid/empty TLE strings: `twoline2satrec("","")` produces satrec with error=0; `propagate()` returns `{position: {x:NaN, y:NaN, z:NaN}}` — NOT boolean false
- The `typeof posVel.position === "boolean"` guard in orbit.ts does NOT catch NaN positions
- Coordinate unit: km (satellite.js) → must multiply by 1000 for meters (Cesium)
- `gstime()` + `eciToEcf()` required to convert ECI→ECEF

## Sample TLE for Tests (ISS, epoch 2024-01-01T12:00:00Z)
```
TLE1 = "1 25544U 98067A   24001.50000000  .00020137  00000-0  36144-3 0  9994"
TLE2 = "2 25544  51.6418 249.4983 0001234  87.3234 272.6560 15.49815361432523"
TLE_EPOCH_MS = 1704110400000  // 2024-01-01T12:00:00.000Z
```

## Verified Numeric Values (use in assertions)
- Earth radius: 6,371,000 m (mean spherical)
- ISS altitude range: 300,000–500,000 m above surface (generous bounds for tests)
- ISS sample distance range at epoch: ~6,787,537–6,800,232 m from center
- stepSec=300, durationMs=3,600,000: produces exactly 13 samples (floor(3600000/300000)+1)
- All 13 samples are valid near TLE epoch — no skipped points

## Transferable / ArrayBuffer Contract
- Float64Array for timesMs: 8 bytes per element
- Float32Array for ecef: 4 bytes per element
- Buffer extraction: `orbitData.timesMs.buffer as ArrayBuffer`
- Restoration: `new Float64Array(buffer)` — identical bit-for-bit values
- Sizes: timesBuffer.byteLength = length * 8; ecefBuffer.byteLength = length * 4

## LRU Cache Key Format
- Pattern: `${satelliteId}:${dayStartMs}:${stepSec}`
- Confirmed unique per satellite/day/step combination

## Worker Testing Strategy
- jsdom environment cannot instantiate actual Web Workers
- Test Worker logic by: (1) calling computeOrbit directly, (2) simulating pack/unpack of ArrayBuffers
- See `tests/unit/orbit-worker.test.ts` for the established pattern

## Phase 5 Test Patterns (useSatellites + SatelliteList)

### useSatellites hook — key patterns
- Use real `sample-tle.json` data (no mocking needed); hook reads INITIAL at module scope
- `renderHook(() => useSatellites())` from `@testing-library/react`
- Wrap all state-mutating calls in `act()`
- ALL_IDS constant mirrors JSON order for order-sensitive assertions
- State independence: toggleVisible does NOT affect selected; selectSatellite does NOT affect visible

### SatelliteList component — key patterns
- Use `makeSatellite(overrides)` factory + `makeTenSatellites()` fixture (not real JSON)
- Row selector: `nameEl.closest('[style*="cursor: pointer"]')` to find row from name text
- Row selector for all 10 rows: `container.querySelectorAll('div[style*="display: flex"]')`
- Checkbox click uses `fireEvent.click(checkbox)` — triggers both onChange and the inline onClick
- stopPropagation on checkbox onClick means `onSelect` must NOT be called when checkbox is clicked
- opacity 1 vs 0.4 on row div reflects `sat.visible`
- background "transparent" vs rgba string on row div reflects `sat.selected`

### Component test file location convention
- Phase 4 tests: `tests/unit/` (outside src/)
- Phase 5 tests: `src/hooks/__tests__/` and `src/components/SatelliteList/__tests__/` (co-located)
- Both conventions coexist; vitest finds both via default include patterns

## Detailed Notes
- See `patterns.md` for additional notes on testing patterns
