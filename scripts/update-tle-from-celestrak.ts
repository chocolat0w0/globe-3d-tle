import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface TleData {
  line1: string;
  line2: string;
}

interface SatelliteEntry {
  id: string;
  name: string;
  catalogNumber: number;
  tle: TleData;
  offnadirRanges: number[][];
  color: string;
}

interface Failure {
  id: string;
  reason: string;
}

const FETCH_TIMEOUT_MS = 15_000;

function resolveSampleTlePath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const root = resolve(thisFile, "../../");
  return resolve(root, "src/data/sample-tle.json");
}

function parseLine1CatalogNumber(line1: string): number | null {
  const match = line1.match(/^1\s+(\d{1,5})/);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function parseTleResponse(raw: string): TleData {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length < 3) {
    throw new Error(`response must have at least 3 lines, got ${lines.length}`);
  }

  const line1 = lines.find((line) => line.startsWith("1 "));
  const line2 = lines.find((line) => line.startsWith("2 "));

  if (!line1 || !line2) {
    throw new Error("response does not include valid TLE line1/line2");
  }

  return { line1, line2 };
}

async function fetchTleByCatalogNumber(catalogNumber: number): Promise<TleData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catalogNumber}`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    if (text.trim().length === 0) {
      throw new Error("empty response");
    }

    return parseTleResponse(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main(): Promise<void> {
  const sampleTlePath = resolveSampleTlePath();
  const raw = await readFile(sampleTlePath, "utf8");
  const entries = JSON.parse(raw) as SatelliteEntry[];

  if (!Array.isArray(entries)) {
    throw new Error("sample-tle.json must be an array");
  }

  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  const failures: Failure[] = [];

  for (const entry of entries) {
    try {
      if (!Number.isInteger(entry.catalogNumber) || entry.catalogNumber <= 0) {
        throw new Error(`invalid catalogNumber: ${entry.catalogNumber}`);
      }

      const nextTle = await fetchTleByCatalogNumber(entry.catalogNumber);
      const fetchedCatalogNumber = parseLine1CatalogNumber(nextTle.line1);

      if (fetchedCatalogNumber !== entry.catalogNumber) {
        throw new Error(
          `catalog mismatch expected=${entry.catalogNumber} actual=${fetchedCatalogNumber ?? "N/A"}`
        );
      }

      if (entry.tle.line1 === nextTle.line1 && entry.tle.line2 === nextTle.line2) {
        unchanged += 1;
        continue;
      }

      entry.tle = nextTle;
      updated += 1;
    } catch (error) {
      failed += 1;
      const reason = error instanceof Error ? error.message : String(error);
      failures.push({ id: entry.id, reason });
    }
  }

  await writeFile(sampleTlePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

  console.log(`updated=${updated} unchanged=${unchanged} failed=${failed}`);
  if (failures.length > 0) {
    console.log("failed entries:");
    for (const failure of failures) {
      console.log(`- ${failure.id}: ${failure.reason}`);
    }
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
