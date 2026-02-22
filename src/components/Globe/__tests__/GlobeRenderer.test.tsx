import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { GlobeRenderer, getStepSecForHeight } from "../GlobeRenderer";
import { perfMetricsStore } from "../../../lib/perf/perf-metrics-store";

type PostRenderCallback = () => void;

const state: {
  viewer: {
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
  } | undefined;
} = {
  viewer: undefined,
};

vi.mock("resium", () => ({
  Viewer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useCesium: () => ({ viewer: state.viewer }),
}));

describe("GlobeRenderer", () => {
  let postRenderCallback: PostRenderCallback | undefined;
  let removeListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    perfMetricsStore.clear();

    postRenderCallback = undefined;
    removeListener = vi.fn();
    state.viewer = {
      scene: {
        postRender: {
          addEventListener: vi.fn((cb: PostRenderCallback) => {
            postRenderCallback = cb;
            return removeListener;
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

  it("VITE_PERF_LOG=true のとき postRender リスナーを登録する", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    render(<GlobeRenderer showNightShade={false} />);

    expect(state.viewer?.scene.postRender.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("VITE_PERF_LOG が true 以外のとき FPS 計測を無効化する", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    render(<GlobeRenderer showNightShade={false} />);

    expect(state.viewer?.scene.postRender.addEventListener).not.toHaveBeenCalled();
  });

  it("1秒経過時に fps ラベルで PerfMetricsStore へ記録する", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(0);

    const pushSpy = vi.spyOn(perfMetricsStore, "push");
    render(<GlobeRenderer showNightShade={false} />);
    expect(postRenderCallback).toBeTypeOf("function");

    nowSpy.mockReturnValue(200);
    postRenderCallback?.();
    nowSpy.mockReturnValue(400);
    postRenderCallback?.();
    nowSpy.mockReturnValue(600);
    postRenderCallback?.();
    nowSpy.mockReturnValue(800);
    postRenderCallback?.();
    nowSpy.mockReturnValue(1000);
    postRenderCallback?.();

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "fps",
        durationMs: 5,
        timestamp: 1000,
      }),
    );

    nowSpy.mockRestore();
  });

  it("アンマウント時に postRender リスナーを解除する", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    const { unmount } = render(<GlobeRenderer showNightShade={false} />);

    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it("showNightShade=true のとき globe lighting を有効化する", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    render(<GlobeRenderer showNightShade={true} />);

    expect(state.viewer?.scene.globe.enableLighting).toBe(true);
    expect(state.viewer?.scene.globe.dynamicAtmosphereLighting).toBe(true);
    expect(state.viewer?.scene.globe.dynamicAtmosphereLightingFromSun).toBe(true);
  });

  it("showNightShade=false のとき globe lighting を無効化する", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    state.viewer!.scene.globe.enableLighting = true;
    render(<GlobeRenderer showNightShade={false} />);

    expect(state.viewer?.scene.globe.enableLighting).toBe(false);
  });
});

describe("getStepSecForHeight", () => {
  it("高度 0m のとき stepSec=30 を返す", () => {
    expect(getStepSecForHeight(0)).toBe(30);
  });

  it("高度 4,999,999m (5,000km 未満の上限) のとき stepSec=30 を返す", () => {
    expect(getStepSecForHeight(4_999_999)).toBe(30);
  });

  it("高度 5,000,000m (5,000km 境界) のとき stepSec=60 を返す", () => {
    expect(getStepSecForHeight(5_000_000)).toBe(60);
  });

  it("高度 19,999,999m (20,000km 未満の上限) のとき stepSec=60 を返す", () => {
    expect(getStepSecForHeight(19_999_999)).toBe(60);
  });

  it("高度 20,000,000m (20,000km 境界) のとき stepSec=120 を返す", () => {
    expect(getStepSecForHeight(20_000_000)).toBe(120);
  });

  it("高度 30,000,000m (上限を超える高度) のとき stepSec=120 を返す", () => {
    expect(getStepSecForHeight(30_000_000)).toBe(120);
  });
});

describe("StepSecController", () => {
  // StepSecController は onStepSecChange が渡された場合のみレンダリングされる。
  // VITE_PERF_LOG=false にして FpsMonitor の登録を抑制することで、
  // addEventListener の呼び出しは StepSecController の1件のみになる。
  // これにより postRenderCallback が StepSecController のコールバックを確実に保持する。

  let stepSecPostRenderCallback: PostRenderCallback | undefined;
  let stepSecRemoveListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    perfMetricsStore.clear();

    stepSecPostRenderCallback = undefined;
    stepSecRemoveListener = vi.fn();
    state.viewer = {
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

  it("onStepSecChange を渡すと VITE_PERF_LOG=false でも postRender リスナーが1回登録される", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    const onStepSecChange = vi.fn();

    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    expect(state.viewer?.scene.postRender.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("高度が 5,000,000m 以上に変わり 1 秒以上経過したとき onStepSecChange(60) が呼ばれる", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    const nowSpy = vi.spyOn(performance, "now");
    // lastChangedAtRef の初期値は 0。
    // now=1100 に設定することで `1100 - 0 = 1100 >= 1000` となりデバウンスを通過する。
    nowSpy.mockReturnValue(1100);

    const onStepSecChange = vi.fn();
    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    // 高度をバンド境界以上に変更する（30 → 60 へのバンド変化）
    state.viewer!.camera.positionCartographic.height = 5_000_000;
    stepSecPostRenderCallback?.();

    expect(onStepSecChange).toHaveBeenCalledTimes(1);
    expect(onStepSecChange).toHaveBeenCalledWith(60);

    nowSpy.mockRestore();
  });

  it("1 秒未満のデバウンス期間内は stepSec が変化しても onStepSecChange が呼ばれない", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    const nowSpy = vi.spyOn(performance, "now");
    // now=1100 で1回目の変化を通過させ lastChangedAtRef=1100 に更新する
    nowSpy.mockReturnValue(1100);

    const onStepSecChange = vi.fn();
    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    // 1回目: 高度をバンド60に変化 → デバウンス通過 → 呼ばれる
    state.viewer!.camera.positionCartographic.height = 5_000_000;
    stepSecPostRenderCallback?.();
    expect(onStepSecChange).toHaveBeenCalledTimes(1);

    // 2回目: currentStepSecRef=60 → バンド120へ変化を試みるが
    // now=2099 では 2099 - 1100 = 999 < 1000 → デバウンスされる
    nowSpy.mockReturnValue(1100 + 999);
    state.viewer!.camera.positionCartographic.height = 20_000_000;
    stepSecPostRenderCallback?.();

    // デバウンス期間内なので追加で呼ばれないこと
    expect(onStepSecChange).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });

  it("高度が同じバンド内に留まる場合は onStepSecChange が呼ばれない", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(5000);

    const onStepSecChange = vi.fn();
    render(<GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />);

    // 初期 currentStepSecRef=30（高度 < 5,000,000m に対応するバンド）
    // 高度を変えるがバンドは同じ stepSec=30 に留まる
    state.viewer!.camera.positionCartographic.height = 1_000_000;
    stepSecPostRenderCallback?.();
    state.viewer!.camera.positionCartographic.height = 4_999_999;
    stepSecPostRenderCallback?.();

    expect(onStepSecChange).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it("onStepSecChange を渡した場合にアンマウントで postRender リスナーが解除される", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    const onStepSecChange = vi.fn();
    const { unmount } = render(
      <GlobeRenderer showNightShade={false} onStepSecChange={onStepSecChange} />,
    );

    unmount();

    expect(stepSecRemoveListener).toHaveBeenCalledTimes(1);
  });
});
