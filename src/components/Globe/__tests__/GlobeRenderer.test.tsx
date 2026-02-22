import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { GlobeRenderer } from "../GlobeRenderer";
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
