import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { InfoPanel } from "../InfoPanel";

type PostRenderCallback = () => void;

interface ViewerMock {
  scene: {
    postRender: {
      addEventListener: ReturnType<typeof vi.fn>;
    };
  };
  camera: {
    positionCartographic: {
      latitude: number;
      longitude: number;
      height: number;
    };
  };
}

const state: { viewer: ViewerMock | undefined } = { viewer: undefined };
let postRenderCallback: PostRenderCallback | undefined;
let removeListener: ReturnType<typeof vi.fn>;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function createViewerMock(): ViewerMock {
  return {
    scene: {
      postRender: {
        addEventListener: vi.fn((cb: PostRenderCallback) => {
          postRenderCallback = cb;
          return removeListener;
        }),
      },
    },
    camera: {
      positionCartographic: {
        latitude: degToRad(0),
        longitude: degToRad(0),
        height: 0,
      },
    },
  };
}

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: state.viewer }),
}));

describe("InfoPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postRenderCallback = undefined;
    removeListener = vi.fn();
    state.viewer = undefined;
  });

  it("renders mode buttons with correct pressed state", () => {
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />,
    );

    const geodesic = screen.getByRole("button", { name: "Geodesic" });
    const cartesian = screen.getByRole("button", { name: "Cartesian" });

    expect(geodesic).toHaveAttribute("aria-pressed", "true");
    expect(cartesian).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onOrbitRenderModeChange('cartesian') when Cartesian button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={onOrbitRenderModeChange}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cartesian" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("cartesian");
  });

  it("calls onOrbitRenderModeChange('geodesic') when Geodesic button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="cartesian"
        onOrbitRenderModeChange={onOrbitRenderModeChange}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Geodesic" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("geodesic");
  });

  it("renders Night Shade button with correct pressed state", () => {
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={true}
        onNightShadeToggle={vi.fn()}
      />,
    );

    const nightShade = screen.getByRole("button", { name: "Night Shade" });
    expect(nightShade).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onNightShadeToggle when Night Shade button is clicked", () => {
    const onNightShadeToggle = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={false}
        onNightShadeToggle={onNightShadeToggle}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Night Shade" }));
    expect(onNightShadeToggle).toHaveBeenCalledTimes(1);
  });

  it("viewer があるとき postRender リスナーを登録する", () => {
    state.viewer = createViewerMock();

    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />,
    );

    expect(state.viewer.scene.postRender.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("postRender コールバックでカメラ座標表示を更新する", () => {
    state.viewer = createViewerMock();

    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />,
    );

    state.viewer.camera.positionCartographic.latitude = degToRad(35.6895);
    state.viewer.camera.positionCartographic.longitude = degToRad(139.7001);
    state.viewer.camera.positionCartographic.height = 12_345;

    act(() => {
      postRenderCallback?.();
    });

    expect(screen.getByText("緯度")).toBeInTheDocument();
    expect(screen.getByText("35.6895°")).toBeInTheDocument();
    expect(screen.getByText("経度")).toBeInTheDocument();
    expect(screen.getByText("139.7001°")).toBeInTheDocument();
    expect(screen.getByText("高度")).toBeInTheDocument();
    expect(screen.getByText("12.3 km")).toBeInTheDocument();
  });

  it("unmount 時に postRender リスナーを解除する", () => {
    state.viewer = createViewerMock();

    const { unmount } = render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />,
    );

    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
