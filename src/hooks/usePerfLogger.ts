import { useMemo } from "react";
import { PerfLogger } from "../lib/perf/perf-logger";
import { perfMetricsStore } from "../lib/perf/perf-metrics-store";

/** VITE_PERF_LOG=true のとき有効なPerfLoggerを返すフック */
export function usePerfLogger(): PerfLogger {
  return useMemo(
    () =>
      new PerfLogger({
        enabled: import.meta.env.VITE_PERF_LOG === "true",
        onEntry: (entry) => perfMetricsStore.push(entry),
      }),
    [],
  );
}
