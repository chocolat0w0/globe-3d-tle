import { describe, it, expect, vi, beforeEach } from "vitest";
import { PerfLogger } from "../perf-logger";

describe("PerfLogger", () => {
  let onEntry: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onEntry = vi.fn();
  });

  it("enabled=true で start → end が PerfEntry を返す", () => {
    const logger = new PerfLogger({ enabled: true });
    logger.start("test");
    const entry = logger.end("test");
    expect(entry).not.toBeNull();
    expect(entry!.label).toBe("test");
    expect(entry!.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof entry!.timestamp).toBe("number");
  });

  it("start なしで end を呼ぶと null を返す", () => {
    const logger = new PerfLogger({ enabled: true });
    const entry = logger.end("not-started");
    expect(entry).toBeNull();
  });

  it("start の二重呼び出しで最後の start 時刻が使われる", async () => {
    const logger = new PerfLogger({ enabled: true });
    logger.start("test");
    await new Promise((r) => setTimeout(r, 10));
    logger.start("test"); // 上書き
    const entry = logger.end("test");
    expect(entry).not.toBeNull();
    // 二度目の start からの計測なので、待機時間（10ms）より短いはず
    expect(entry!.durationMs).toBeLessThan(10);
  });

  it("end 後に onEntry コールバックが呼ばれる", () => {
    const logger = new PerfLogger({ enabled: true, onEntry });
    logger.start("cb-test");
    logger.end("cb-test");
    expect(onEntry).toHaveBeenCalledTimes(1);
    const called = onEntry.mock.calls[0][0];
    expect(called.label).toBe("cb-test");
    expect(called.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("enabled=false で start/end が no-op（null を返す）", () => {
    const logger = new PerfLogger({ enabled: false, onEntry });
    logger.start("disabled");
    const entry = logger.end("disabled");
    expect(entry).toBeNull();
    expect(onEntry).not.toHaveBeenCalled();
  });

  it("enabled=false で measure が関数を実行するが onEntry は呼ばれない", () => {
    const logger = new PerfLogger({ enabled: false, onEntry });
    const fn = vi.fn(() => 42);
    logger.measure("disabled-measure", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(onEntry).not.toHaveBeenCalled();
  });

  it("measure が関数の戻り値をそのまま返す", () => {
    const logger = new PerfLogger({ enabled: true, onEntry });
    const result = logger.measure("ret-test", () => "hello");
    expect(result).toBe("hello");
    expect(onEntry).toHaveBeenCalledTimes(1);
  });

  it("measureAsync が非同期関数の戻り値を返す", async () => {
    const logger = new PerfLogger({ enabled: true, onEntry });
    const result = await logger.measureAsync("async-test", async () => 99);
    expect(result).toBe(99);
  });

  it("measureAsync 完了後に onEntry が呼ばれる", async () => {
    const logger = new PerfLogger({ enabled: true, onEntry });
    await logger.measureAsync("async-cb", async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(onEntry).toHaveBeenCalledTimes(1);
    expect(onEntry.mock.calls[0][0].label).toBe("async-cb");
    expect(onEntry.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(5);
  });
});
