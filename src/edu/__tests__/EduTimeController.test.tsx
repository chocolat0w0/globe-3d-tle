import { act, fireEvent, render, screen } from "@testing-library/react";
import { ClockRange, JulianDate } from "cesium";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EduTimeController } from "../components/EduTimeController";
import { getWindowStartMs } from "../../lib/time-window";

type PostRenderCallback = () => void;

interface ViewerMock {
  clock: {
    startTime: JulianDate | undefined;
    stopTime: JulianDate | undefined;
    currentTime: JulianDate;
    clockRange: ClockRange | undefined;
    multiplier: number;
    shouldAnimate: boolean;
  };
  scene: {
    postRender: {
      addEventListener: ReturnType<typeof vi.fn>;
    };
  };
}

const DAY_MS = 86_400_000;
const FIXED_NOW_MS = Date.UTC(2026, 2, 6, 6, 30, 0);
const state: { viewer: ViewerMock | undefined } = { viewer: undefined };
let postRenderCallback: PostRenderCallback | undefined;
let removeListener: ReturnType<typeof vi.fn>;
let dateNowSpy: ReturnType<typeof vi.spyOn>;

function createViewerMock(): ViewerMock {
  return {
    clock: {
      startTime: undefined,
      stopTime: undefined,
      currentTime: JulianDate.fromDate(new Date(0)),
      clockRange: undefined,
      multiplier: 1,
      shouldAnimate: false,
    },
    scene: {
      postRender: {
        addEventListener: vi.fn((cb: PostRenderCallback) => {
          postRenderCallback = cb;
          return removeListener;
        }),
      },
    },
  };
}

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: state.viewer }),
}));

describe("EduTimeController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
    removeListener = vi.fn();
    postRenderCallback = undefined;
    state.viewer = createViewerMock();
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    state.viewer = undefined;
  });

  it("初期化時にclockを設定し、現在窓開始を通知する", () => {
    const onWindowStartChange = vi.fn();
    render(<EduTimeController onWindowStartChange={onWindowStartChange} />);

    const expectedMinMs = FIXED_NOW_MS - DAY_MS * 3;
    const expectedMaxMs = FIXED_NOW_MS + DAY_MS * 3;
    const expectedWindowStartMs = getWindowStartMs(FIXED_NOW_MS);

    expect(JulianDate.toDate(state.viewer!.clock.startTime!).getTime()).toBe(expectedMinMs);
    expect(JulianDate.toDate(state.viewer!.clock.stopTime!).getTime()).toBe(expectedMaxMs);
    expect(JulianDate.toDate(state.viewer!.clock.currentTime).getTime()).toBe(FIXED_NOW_MS);
    expect(state.viewer!.clock.clockRange).toBe(ClockRange.LOOP_STOP);
    expect(state.viewer!.clock.multiplier).toBe(60);
    expect(state.viewer!.clock.shouldAnimate).toBe(true);
    expect(onWindowStartChange).toHaveBeenCalledWith(expectedWindowStartMs);
  });

  it("再生停止・速度変更・スライダー移動を同期する", () => {
    render(<EduTimeController onWindowStartChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
    expect(state.viewer!.clock.shouldAnimate).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "×300" }));
    expect(state.viewer!.clock.multiplier).toBe(300);

    const seekTargetMs = FIXED_NOW_MS + 120_000;
    fireEvent.change(screen.getByRole("slider", { name: "時間スライダー" }), {
      target: { value: String(seekTargetMs) },
    });
    expect(JulianDate.toDate(state.viewer!.clock.currentTime).getTime()).toBe(seekTargetMs);
  });

  it("4時間窓を跨いだときに窓開始を再通知する", () => {
    const onWindowStartChange = vi.fn();
    render(<EduTimeController onWindowStartChange={onWindowStartChange} />);

    onWindowStartChange.mockClear();
    const nextWindowStart = getWindowStartMs(FIXED_NOW_MS) + 4 * 3600 * 1000;
    state.viewer!.clock.currentTime = JulianDate.fromDate(new Date(nextWindowStart + 1000));

    act(() => {
      postRenderCallback?.();
    });

    expect(onWindowStartChange).toHaveBeenCalledTimes(1);
    expect(onWindowStartChange).toHaveBeenCalledWith(nextWindowStart);
  });

  it("アンマウント時にpostRenderリスナーを解除する", () => {
    const { unmount } = render(<EduTimeController onWindowStartChange={vi.fn()} />);
    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
