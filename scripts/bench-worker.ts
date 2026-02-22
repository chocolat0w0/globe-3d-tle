import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeOrbit } from "../src/lib/tle/orbit.ts";
import { computeFootprints } from "../src/lib/tle/footprint.ts";
import { computeSwath } from "../src/lib/tle/swath.ts";

interface SatelliteTle {
  id: string;
  tle: {
    line1: string;
    line2: string;
  };
}

interface CliOptions {
  satellites: number;
  step: number;
  duration: number;
  iterations: number;
}

interface Stats {
  min: number;
  avg: number;
  max: number;
  p95: number;
}

interface BenchRow {
  label: string;
  values: number[];
}

const DEFAULTS: CliOptions = {
  satellites: 10,
  step: 30,
  duration: 86_400,
  iterations: 5,
};

const DAY_START_MS = 1704110400000; // 2024-01-01T12:00:00.000Z

function usageAndExit(message?: string): never {
  if (message) {
    console.error(`Error: ${message}`);
  }
  console.error(
    "Usage: node scripts/bench-worker.ts [--satellites N] [--step SEC] [--duration SEC] [--iterations N]"
  );
  process.exit(1);
}

function parsePositiveNumber(raw: string, name: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    usageAndExit(`${name} must be a positive number, got: ${raw}`);
  }
  return parsed;
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--satellites") {
      const value = argv[++i];
      if (!value) usageAndExit("--satellites requires a value");
      options.satellites = Math.floor(parsePositiveNumber(value, "satellites"));
      continue;
    }

    if (arg === "--step") {
      const value = argv[++i];
      if (!value) usageAndExit("--step requires a value");
      options.step = parsePositiveNumber(value, "step");
      continue;
    }

    if (arg === "--duration") {
      const value = argv[++i];
      if (!value) usageAndExit("--duration requires a value");
      options.duration = parsePositiveNumber(value, "duration");
      continue;
    }

    if (arg === "--iterations") {
      const value = argv[++i];
      if (!value) usageAndExit("--iterations requires a value");
      options.iterations = Math.floor(parsePositiveNumber(value, "iterations"));
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      usageAndExit();
    }

    usageAndExit(`unknown argument: ${arg}`);
  }

  if (options.satellites < 1) usageAndExit("--satellites must be >= 1");
  if (options.iterations < 1) usageAndExit("--iterations must be >= 1");

  return options;
}

function loadSatellites(): SatelliteTle[] {
  const thisFile = fileURLToPath(import.meta.url);
  const root = resolve(thisFile, "../../");
  const jsonPath = resolve(root, "src/data/sample-tle.json");
  const raw = readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as SatelliteTle[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("sample-tle.json is empty or invalid");
  }

  return parsed;
}

function selectSatellites(source: SatelliteTle[], count: number): SatelliteTle[] {
  const selected: SatelliteTle[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(source[i % source.length]);
  }
  return selected;
}

function calcStats(values: number[]): Stats {
  if (values.length === 0) {
    throw new Error("Cannot calculate stats from empty values");
  }

  const sorted = values.slice().sort((a, b) => a - b);
  const count = sorted.length;
  const min = sorted[0];
  const max = sorted[count - 1];
  const avg = values.reduce((sum, value) => sum + value, 0) / count;
  const p95Idx = Math.ceil(count * 0.95) - 1;
  const p95 = sorted[p95Idx];

  return { min, avg, max, p95 };
}

function formatMs(value: number): string {
  return `${value.toFixed(2)}ms`;
}

function printTable(rows: BenchRow[]): void {
  const headers = ["label", "min", "avg", "max", "p95"];
  const statRows = rows.map((row) => ({ label: row.label, ...calcStats(row.values) }));

  const labelWidth = Math.max(
    headers[0].length,
    ...statRows.map((row) => row.label.length)
  );
  const valueWidth = 10;

  const headerLine =
    headers[0].padEnd(labelWidth) +
    " | " +
    headers.slice(1).map((h) => h.padStart(valueWidth)).join(" | ");

  const separatorLine =
    "-".repeat(labelWidth) +
    "-|" +
    headers
      .slice(1)
      .map(() => "-".repeat(valueWidth + 2))
      .join("|");

  console.log(headerLine);
  console.log(separatorLine);

  for (const row of statRows) {
    const line =
      row.label.padEnd(labelWidth) +
      " | " +
      [row.min, row.avg, row.max, row.p95]
        .map((value) => formatMs(value).padStart(valueWidth))
        .join(" | ");
    console.log(line);
  }
}

function runBench(options: CliOptions): void {
  const source = loadSatellites();
  const satellites = selectSatellites(source, options.satellites);
  const durationMs = options.duration * 1000;

  const orbitValues: number[] = [];
  const footprintValues: number[] = [];
  const swathValues: number[] = [];
  const totalValues: number[] = [];

  for (let i = 0; i < options.iterations; i++) {
    let iterationTotal = 0;

    for (const sat of satellites) {
      const tle1 = sat.tle.line1;
      const tle2 = sat.tle.line2;

      const orbitStart = performance.now();
      computeOrbit(tle1, tle2, DAY_START_MS, durationMs, options.step);
      const orbitMs = performance.now() - orbitStart;
      orbitValues.push(orbitMs);

      const footprintStart = performance.now();
      computeFootprints(tle1, tle2, DAY_START_MS, durationMs, options.step, {
        fov: [30, 0],
        offnadir: 0,
        insert: 16,
      });
      const footprintMs = performance.now() - footprintStart;
      footprintValues.push(footprintMs);

      const swathStart = performance.now();
      computeSwath(tle1, tle2, DAY_START_MS, durationMs, {
        roll: 10,
        split: 60,
      });
      const swathMs = performance.now() - swathStart;
      swathValues.push(swathMs);

      iterationTotal += orbitMs + footprintMs + swathMs;
    }

    totalValues.push(iterationTotal);
  }

  printTable([
    { label: "computeOrbit", values: orbitValues },
    { label: "computeFootprints", values: footprintValues },
    { label: "computeSwath", values: swathValues },
    { label: `total (${options.satellites} sats)`, values: totalValues },
  ]);
}

runBench(parseCliArgs(process.argv.slice(2)));
