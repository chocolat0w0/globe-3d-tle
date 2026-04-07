import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { GlobeRenderer } from "../GlobeRenderer";
import { getStepSecForHeight } from "../step-sec";

type PostRenderCallback = () => void;

const state: {
  viewer:
    | {
        isDestroyed: ReturnType<typeof vi.fn>;
        scene: {
          postRender: {
            addEventListener: ReturnType<typeof vi.fn>;
          };
          globe: {
            enableLighting: boolean;
            dynamicAtmosphereLighting: boolean;
            dynamicAtmosphereLightingFromSun: boolean;
          };
        };
        camera: {
          positionCartographic: {
            height: number;
          };
        };
      }
    | undefined;
} = {
  viewer: undefined,
};

vi.mock("resium", () => ({
  Viewer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useCesium: () => ({ viewer: state.viewer }),
}));

describe("GlobeRenderer", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();

    state.viewer = {
      isDestroyed: vi.fn().mockReturnValue(false),
      scene: {
        postRender: {
          addEventListener: vi.fn(() => vi.fn()),
        },
        globe: {
          enableLighting: false,
          dynamicAtmosphereLighting: false,
          dynamicAtmosphereLightingFromSun: false,
        },
      },
      camera: {
        positionCartographic: {
          height: 1_000_000,
        },
      },
    };
  });

  it("showNightShade=true のとき globe lighting を有効化する", () => {
    render(<GlobeRenderer showNightShade={true} />);

    expect(state.viewer?.scene.globe.enableLighting).toBe(true);
    expect(state.viewer?.scene.globe.dynamicAtmosphereLighting).toBe(true);
    expect(state.viewer?.scene.globe.dynamicAtmosphereLightingFromSun).toBe(true);
  });

  it("showNightShade=false のとき globe lighting を無効化する", () => {
    state.viewer!.scene.globe.enableLighting = true;
    render(<GlobeRenderer showNightShade={false} />);

    expect(state.viewer?.scene.globe.enableLighting).toBe(false);
  });
});

describe("getStepSecForHeight", () => {
  it("高度 0m のとき stepSec=5 を返す", () => {
    expect(getStepSecForHeight(0)).toBe(5);
  });

  it("高度 4,999,999m (5,000km 未満の上限) のとき stepSec=5 を返す", () => {
    expect(getStepSecForHeight(4_999_999)).toBe(5);
  });

  it("高度 5,000,000m (5,000km 境界) のとき stepSec=10 を返す", () => {
    expect(getStepSecForHeight(5_000_000)).toBe(10);
  });

  it("高度 19,999,999m (20,000km 未満の上限) のとき stepSec=10 を返す", () => {
    expect(getStepSecForHeight(19_999_999)).toBe(10);
  });

  it("高度 20,000,000m (20,000km 境界) のとき stepSec=20 を返す", () => {
    expect(getStepSecForHeight(20_000_000)).toBe(20);
  });

  it("高度 30,000,000m (上限を超える高度) のとき stepSec=20 を返す", () => {
    expect(getStepSecForHeight(30_000_000)).toBe(20);
  });
});

describe("StepSecController", () => {
  let stepSecPostRenderCallback: PostRenderCallback | undefined;
  let stepSecRemoveListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();

    stepSecPostRenderCallback = undefined;
    stepSecRemoveListener = vi.fn();
    state.viewer = {
      isDestroyed: vi.fn().mockReturnValue(false),
      scene: {
        postRender: {
          addEventListener: vi.fn((cb: PostRenderCallback) => {
            stepSecPostRenderCallback = cb;
            return stepSecRemoveListener;
          }),
        },
        globe: {
          enableLighting: false,
          dynamicAtmosphereLighting: false,
          dynamicAtmosphereLightingFromSun: false,
        },
      },
      camera: {
        positionCartographic: {
          height: 1_000_000,
        },
      },
    };
  });

  it("onStepSecChange を渡すと postRender リスナーが1回登録される", () => {
    const onStepSecChange = vi.fn();

    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    expect(state.viewer?.scene.postRender.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("高度が 5,000,000m 以上に変わり 1 秒以上経過したとき onStepSecChange(10) が呼ばれる", () => {
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(1100);

    const onStepSecChange = vi.fn();
    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    state.viewer!.camera.positionCartographic.height = 5_000_000;
    stepSecPostRenderCallback?.();

    expect(onStepSecChange).toHaveBeenCalledTimes(1);
    expect(onStepSecChange).toHaveBeenCalledWith(10);

    nowSpy.mockRestore();
  });

  it("1 秒未満のデバウンス期間内は stepSec が変化しても onStepSecChange が呼ばれない", () => {
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(1100);

    const onStepSecChange = vi.fn();
    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    state.viewer!.camera.positionCartographic.height = 5_000_000;
    stepSecPostRenderCallback?.();
    expect(onStepSecChange).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(1100 + 999);
    state.viewer!.camera.positionCartographic.height = 20_000_000;
    stepSecPostRenderCallback?.();

    expect(onStepSecChange).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });

  it("高度が同じバンド内に留まる場合は onStepSecChange が呼ばれない", () => {
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(5000);

    const onStepSecChange = vi.fn();
    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    state.viewer!.camera.positionCartographic.height = 1_000_000;
    stepSecPostRenderCallback?.();
    state.viewer!.camera.positionCartographic.height = 4_999_999;
    stepSecPostRenderCallback?.();

    expect(onStepSecChange).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it("onStepSecChange を渡した場合にアンマウントで postRender リスナーが解除される", () => {
    const onStepSecChange = vi.fn();
    const { unmount } = render(
      <GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />,
    );

    unmount();

    expect(stepSecRemoveListener).toHaveBeenCalledTimes(1);
  });
});
