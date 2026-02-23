import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { SatelliteLayer } from "../SatelliteLayer";
import type { OrbitData } from "../../../types/orbit";

type PostRenderCallback = () => void;

const { state, mockState, useOrbitDataMock } = vi.hoisted(() => ({
  state: {
    viewer: undefined as
      | {
          trackedEntity: unknown;
          scene: {
            postRender: {
              addEventListener: ReturnType<typeof vi.fn>;
            };
          };
        }
      | undefined,
  },
  mockState: {
    postRenderCallback: undefined as PostRenderCallback | undefined,
    removeListener: vi.fn(),
  },
  useOrbitDataMock: vi.fn(),
}));

vi.mock("resium", async () => {
  const React = await import("react");

  const Entity = React.forwardRef(function MockEntity(
    _props: Record<string, unknown>,
    ref: React.ForwardedRef<{ cesiumElement: object }>,
  ) {
    const cesiumElement = React.useMemo(() => ({ id: Symbol("entity") }), []);

    React.useEffect(() => {
      if (typeof ref === "function") {
        ref({ cesiumElement });
        return () => ref(null);
      }
      if (ref) {
        ref.current = { cesiumElement };
        return () => {
          ref.current = null;
        };
      }
      return undefined;
    }, [ref, cesiumElement]);

    return null;
  });
  Entity.displayName = "MockEntity";

  return {
    Entity,
    useCesium: () => ({ viewer: state.viewer }),
  };
});

vi.mock("../../../hooks/useOrbitData", () => ({
  useOrbitData: (...args: unknown[]) => useOrbitDataMock(...args),
}));

function makeOrbitData(nowMs: number): OrbitData {
  return {
    timesMs: new Float64Array([nowMs, nowMs + 1000]),
    ecef: new Float32Array([7000000, 0, 0, 6999000, 10000, 10000]),
  };
}

describe("SatelliteLayer trackedEntity sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.postRenderCallback = undefined;
    mockState.removeListener = vi.fn();

    state.viewer = {
      trackedEntity: undefined,
      scene: {
        postRender: {
          addEventListener: vi.fn((cb: PostRenderCallback) => {
            mockState.postRenderCallback = cb;
            return mockState.removeListener;
          }),
        },
      },
    };
  });

  it("selected=true で orbitData 到着後に trackedEntity を設定する", () => {
    let orbitState: { orbitData: OrbitData | null; loading: boolean; error: string | null } = {
      orbitData: null,
      loading: true,
      error: null,
    };
    useOrbitDataMock.mockImplementation(() => orbitState);

    const baseProps = {
      id: "iss",
      name: "ISS",
      tle: { line1: "L1", line2: "L2" },
      color: "#ffffff",
      visible: true,
      selected: true,
      dayStartMs: Date.now(),
      orbitRenderMode: "geodesic" as const,
    };

    const { rerender } = render(<SatelliteLayer {...baseProps} />);
    expect(state.viewer?.trackedEntity).toBeUndefined();

    orbitState = {
      orbitData: makeOrbitData(Date.now()),
      loading: false,
      error: null,
    };
    rerender(<SatelliteLayer {...baseProps} />);

    expect(state.viewer?.trackedEntity).toBeDefined();
  });

  it("loading=true でも既存 orbitData があれば trackedEntity を維持する", () => {
    const orbitData = makeOrbitData(Date.now());
    let orbitState: { orbitData: OrbitData | null; loading: boolean; error: string | null } = {
      orbitData,
      loading: false,
      error: null,
    };
    useOrbitDataMock.mockImplementation(() => orbitState);

    const baseProps = {
      id: "iss",
      name: "ISS",
      tle: { line1: "L1", line2: "L2" },
      color: "#ffffff",
      visible: true,
      selected: true,
      dayStartMs: Date.now(),
      orbitRenderMode: "geodesic" as const,
    };

    const { rerender } = render(<SatelliteLayer {...baseProps} />);
    const trackedBefore = state.viewer?.trackedEntity;
    expect(trackedBefore).toBeDefined();

    orbitState = {
      orbitData,
      loading: true,
      error: null,
    };
    rerender(<SatelliteLayer {...baseProps} />);

    expect(state.viewer?.trackedEntity).toBe(trackedBefore);
  });

  it("selected=false に遷移したとき trackedEntity を解除する", () => {
    const orbitData = makeOrbitData(Date.now());
    useOrbitDataMock.mockReturnValue({
      orbitData,
      loading: false,
      error: null,
    });

    const baseProps = {
      id: "iss",
      name: "ISS",
      tle: { line1: "L1", line2: "L2" },
      color: "#ffffff",
      visible: true,
      dayStartMs: Date.now(),
      orbitRenderMode: "geodesic" as const,
    };

    const { rerender } = render(<SatelliteLayer {...baseProps} selected={true} />);
    expect(state.viewer?.trackedEntity).toBeDefined();

    rerender(<SatelliteLayer {...baseProps} selected={false} />);
    expect(state.viewer?.trackedEntity).toBeUndefined();
  });

  it("selected=true 中に trackedEntity が外れた場合 postRender で再バインドする", () => {
    const orbitData = makeOrbitData(Date.now());
    useOrbitDataMock.mockReturnValue({
      orbitData,
      loading: false,
      error: null,
    });

    render(
      <SatelliteLayer
        id="iss"
        name="ISS"
        tle={{ line1: "L1", line2: "L2" }}
        color="#ffffff"
        visible={true}
        selected={true}
        dayStartMs={Date.now()}
        orbitRenderMode="geodesic"
      />,
    );

    const expected = state.viewer?.trackedEntity;
    expect(expected).toBeDefined();
    expect(mockState.postRenderCallback).toBeTypeOf("function");

    state.viewer!.trackedEntity = undefined;
    mockState.postRenderCallback?.();

    expect(state.viewer?.trackedEntity).toBe(expected);
  });
});
