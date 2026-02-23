import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ClockRange, JulianDate } from "cesium";
import { TimeController } from "../TimeController";

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
const WINDOW_MS = 4 * 3_600_000;
const FIXED_NOW_MS = Date.UTC(2026, 1, 23, 10, 30, 15);

const state: { viewer: ViewerMock | undefined } = { viewer: undefined };
let postRenderCallback: PostRenderCallback | undefined;
let removeListener: ReturnType<typeof vi.fn>;
let dateNowSpy: ReturnType<typeof vi.spyOn>;

function getWindowStartMs(ms: number): number {
  return Math.floor(ms / WINDOW_MS) * WINDOW_MS;
}

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

describe("TimeController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
    postRenderCallback = undefined;
    removeListener = vi.fn();
    state.viewer = createViewerMock();
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    state.viewer = undefined;
  });

  it("初期化時に clock を設定し、現在の4時間窓開始で onDayChange を呼ぶ", () => {
    const onDayChange = vi.fn();
    render(<TimeController onDayChange={onDayChange} />);

    const nowMs = Date.now();
    const expectedMinMs = nowMs - 14 * DAY_MS;
    const expectedMaxMs = nowMs + 14 * DAY_MS;
    const expectedWindowStartMs = getWindowStartMs(nowMs);

    expect(JulianDate.toDate(state.viewer!.clock.startTime!).getTime()).toBe(expectedMinMs);
    expect(JulianDate.toDate(state.viewer!.clock.stopTime!).getTime()).toBe(expectedMaxMs);
    expect(JulianDate.toDate(state.viewer!.clock.currentTime).getTime()).toBe(nowMs);
    expect(state.viewer!.clock.clockRange).toBe(ClockRange.LOOP_STOP);
    expect(state.viewer!.clock.multiplier).toBe(60);
    expect(state.viewer!.clock.shouldAnimate).toBe(true);
    expect(onDayChange).toHaveBeenCalledTimes(1);
    expect(onDayChange).toHaveBeenCalledWith(expectedWindowStartMs);
  });

  it("postRender で4時間窓を跨いだとき onDayChange を呼ぶ", () => {
    const onDayChange = vi.fn();
    render(<TimeController onDayChange={onDayChange} />);

    expect(postRenderCallback).toBeTypeOf("function");
    onDayChange.mockClear();

    const nowMs = Date.now();
    const currentWindowStart = getWindowStartMs(nowMs);
    const nextWindowStart = currentWindowStart + WINDOW_MS;

    state.viewer!.clock.currentTime = JulianDate.fromDate(new Date(nextWindowStart + 10_000));

    act(() => {
      postRenderCallback?.();
    });

    expect(onDayChange).toHaveBeenCalledTimes(1);
    expect(onDayChange).toHaveBeenCalledWith(nextWindowStart);
  });

  it("aoiDrawing の開始/終了で shouldAnimate を一時停止し、元の状態へ復元する", () => {
    const onDayChange = vi.fn();
    const { rerender } = render(<TimeController onDayChange={onDayChange} aoiDrawing={false} />);

    fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
    expect(state.viewer!.clock.shouldAnimate).toBe(false);
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();

    rerender(<TimeController onDayChange={onDayChange} aoiDrawing={true} />);
    expect(state.viewer!.clock.shouldAnimate).toBe(false);
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();

    rerender(<TimeController onDayChange={onDayChange} aoiDrawing={false} />);
    expect(state.viewer!.clock.shouldAnimate).toBe(false);
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
  });

  it("seek/play/速度変更を viewer.clock に同期する", () => {
    render(<TimeController onDayChange={vi.fn()} />);

    const seekTargetMs = Date.now() + 90_000;
    fireEvent.change(screen.getByRole("slider", { name: "タイムスライダー" }), {
      target: { value: String(seekTargetMs) },
    });
    expect(JulianDate.toDate(state.viewer!.clock.currentTime).getTime()).toBe(seekTargetMs);

    fireEvent.click(screen.getByRole("button", { name: "一時停止" }));
    expect(state.viewer!.clock.shouldAnimate).toBe(false);

    fireEvent.click(screen.getByText("×300"));
    expect(state.viewer!.clock.multiplier).toBe(300);
  });

  it("unmount 時に postRender リスナーを解除する", () => {
    const { unmount } = render(<TimeController onDayChange={vi.fn()} />);
    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
