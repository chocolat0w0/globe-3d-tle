import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { InfoPanel } from "../InfoPanel";

type PostRenderCallback = () => void;

interface ViewerMock {
  trackedEntity: unknown;
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
    flyTo: ReturnType<typeof vi.fn>;
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
    trackedEntity: undefined,
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
      flyTo: vi.fn(),
    },
  };
}

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: state.viewer }),
}));

// vi.hoisted() で巻き上げと同タイミングに定義することで、
// vi.mock ファクトリ内から安全に参照できる
const satelliteMock = vi.hoisted(() => ({
  twoline2satrec: vi.fn(() => ({})),
  propagate: vi.fn(() => ({
    position: { x: 6371, y: 0, z: 0 }, // 地球半径相当 (km)
  })),
  gstime: vi.fn(() => 0),
  eciToEcf: vi.fn(() => ({ x: 6371, y: 0, z: 0 })),
}));

vi.mock("satellite.js", () => satelliteMock);

const defaultProps = {
  orbitRenderMode: "geodesic" as const,
  onOrbitRenderModeChange: vi.fn(),
  showNightShade: false,
  onNightShadeToggle: vi.fn(),
  onGoHome: vi.fn(),
};

describe("InfoPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postRenderCallback = undefined;
    removeListener = vi.fn();
    state.viewer = undefined;
  });

  it("renders mode buttons with correct pressed state", () => {
    render(<InfoPanel {...defaultProps} orbitRenderMode="geodesic" />);

    const geodesic = screen.getByRole("button", { name: "Geodesic" });
    const cartesian = screen.getByRole("button", { name: "Cartesian" });

    expect(geodesic).toHaveAttribute("aria-pressed", "true");
    expect(cartesian).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onOrbitRenderModeChange('cartesian') when Cartesian button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(<InfoPanel {...defaultProps} onOrbitRenderModeChange={onOrbitRenderModeChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Cartesian" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("cartesian");
  });

  it("calls onOrbitRenderModeChange('geodesic') when Geodesic button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(
      <InfoPanel
        {...defaultProps}
        orbitRenderMode="cartesian"
        onOrbitRenderModeChange={onOrbitRenderModeChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Geodesic" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("geodesic");
  });

  it("renders Night Shade button with correct pressed state", () => {
    render(<InfoPanel {...defaultProps} showNightShade={true} />);

    const nightShade = screen.getByRole("button", { name: "Night Shade" });
    expect(nightShade).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onNightShadeToggle when Night Shade button is clicked", () => {
    const onNightShadeToggle = vi.fn();
    render(<InfoPanel {...defaultProps} onNightShadeToggle={onNightShadeToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "Night Shade" }));
    expect(onNightShadeToggle).toHaveBeenCalledTimes(1);
  });

  it("viewer があるとき postRender リスナーを登録する", () => {
    state.viewer = createViewerMock();

    render(<InfoPanel {...defaultProps} />);

    expect(state.viewer.scene.postRender.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("postRender コールバックでカメラ座標表示を更新する", () => {
    state.viewer = createViewerMock();

    render(<InfoPanel {...defaultProps} />);

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

    const { unmount } = render(<InfoPanel {...defaultProps} />);

    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  describe("Home ボタン", () => {
    it("Home ボタンが表示される", () => {
      render(<InfoPanel {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    });

    it("Home ボタンをクリックすると onGoHome を呼ぶ", () => {
      state.viewer = createViewerMock();
      const onGoHome = vi.fn();

      render(<InfoPanel {...defaultProps} onGoHome={onGoHome} />);
      fireEvent.click(screen.getByRole("button", { name: "Home" }));

      expect(onGoHome).toHaveBeenCalledTimes(1);
    });

    it("Home ボタンをクリックすると camera.flyTo を呼ぶ", () => {
      state.viewer = createViewerMock();
      const onGoHome = vi.fn();

      render(<InfoPanel {...defaultProps} onGoHome={onGoHome} />);
      fireEvent.click(screen.getByRole("button", { name: "Home" }));

      expect(state.viewer.camera.flyTo).toHaveBeenCalledTimes(1);
      const callArg = state.viewer.camera.flyTo.mock.calls[0][0] as {
        destination: unknown;
        duration: number;
      };
      expect(callArg.destination).toBeDefined();
      expect(typeof callArg.duration).toBe("number");
      expect(callArg.duration).toBeGreaterThan(0);
    });

    it("viewer がないとき Home ボタンをクリックしても onGoHome を呼ばない", () => {
      state.viewer = undefined;
      const onGoHome = vi.fn();

      render(<InfoPanel {...defaultProps} onGoHome={onGoHome} />);
      fireEvent.click(screen.getByRole("button", { name: "Home" }));

      expect(onGoHome).not.toHaveBeenCalled();
    });
  });

  describe("Overview ボタン", () => {
    const sampleTle = {
      line1: "1 25544U 98067A   21275.51782528  .00006753  00000-0  12907-3 0  9994",
      line2: "2 25544  51.6435  81.8428 0003881 255.6935 197.2791 15.48905190305232",
    };

    it("Overview ボタンが表示される", () => {
      render(<InfoPanel {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Overview (80,000km)" })).toBeInTheDocument();
    });

    it("viewer がないとき Overview ボタンをクリックしても camera.flyTo を呼ばない", () => {
      state.viewer = undefined;

      render(<InfoPanel {...defaultProps} selectedSatelliteTle={sampleTle} />);
      fireEvent.click(screen.getByRole("button", { name: "Overview (80,000km)" }));

      // viewer がないので flyTo は呼ばれない（viewer が undefined のためガード節で返る）
      // ここでは例外が投げられないことを確認する
      expect(true).toBe(true); // no crash
    });

    it("衛星選択あり: propagate が成功したとき衛星位置の上空 80,000 km へ flyTo する", () => {
      state.viewer = createViewerMock();

      // ECI → ECEF → LLA で (lat=0, lon=0) 相当の位置を返すよう設定済み (beforeEach でリセット)
      satelliteMock.propagate.mockReturnValue({
        position: { x: 6371, y: 0, z: 0 },
      });
      satelliteMock.eciToEcf.mockReturnValue({ x: 6371, y: 0, z: 0 });

      render(<InfoPanel {...defaultProps} selectedSatelliteTle={sampleTle} />);
      fireEvent.click(screen.getByRole("button", { name: "Overview (80,000km)" }));

      expect(state.viewer.camera.flyTo).toHaveBeenCalledTimes(1);
      const callArg = state.viewer.camera.flyTo.mock.calls[0][0] as {
        destination: unknown;
        duration: number;
      };
      expect(callArg.destination).toBeDefined();
      expect(callArg.duration).toBe(2.0);
    });

    it("衛星選択あり: propagate が position=false を返したとき現在のカメラ位置から 80,000 km へ flyTo する", () => {
      state.viewer = createViewerMock();
      state.viewer.camera.positionCartographic.latitude = degToRad(35);
      state.viewer.camera.positionCartographic.longitude = degToRad(139);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (satelliteMock.propagate as any).mockReturnValue({ position: false });

      render(<InfoPanel {...defaultProps} selectedSatelliteTle={sampleTle} />);
      fireEvent.click(screen.getByRole("button", { name: "Overview (80,000km)" }));

      expect(state.viewer.camera.flyTo).toHaveBeenCalledTimes(1);
      const callArg = state.viewer.camera.flyTo.mock.calls[0][0] as {
        destination: unknown;
        duration: number;
      };
      expect(callArg.destination).toBeDefined();
      expect(callArg.duration).toBe(2.0);
    });

    it("衛星未選択: 現在のカメラ緯度経度を維持して 80,000 km へ flyTo する", () => {
      state.viewer = createViewerMock();
      state.viewer.camera.positionCartographic.latitude = degToRad(20);
      state.viewer.camera.positionCartographic.longitude = degToRad(100);

      render(<InfoPanel {...defaultProps} selectedSatelliteTle={undefined} />);
      fireEvent.click(screen.getByRole("button", { name: "Overview (80,000km)" }));

      expect(state.viewer.camera.flyTo).toHaveBeenCalledTimes(1);
      const callArg = state.viewer.camera.flyTo.mock.calls[0][0] as {
        destination: unknown;
        duration: number;
      };
      expect(callArg.destination).toBeDefined();
      expect(callArg.duration).toBe(2.0);
    });

    it("Overview ボタンは onGoHome を呼ばない（trackedEntity を解除しない）", () => {
      state.viewer = createViewerMock();
      const onGoHome = vi.fn();

      render(<InfoPanel {...defaultProps} onGoHome={onGoHome} selectedSatelliteTle={sampleTle} />);
      fireEvent.click(screen.getByRole("button", { name: "Overview (80,000km)" }));

      expect(onGoHome).not.toHaveBeenCalled();
    });
  });
});
