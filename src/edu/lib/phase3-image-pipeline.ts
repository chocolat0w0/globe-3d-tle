import type { Phase3Weather } from "../types/phase3";

export type Phase3RenderKind = "resolution" | "optical" | "sar";

export interface Phase3ImageOptions {
  satelliteId: string;
  resolutionMeters: number;
  weather: Phase3Weather;
  kind: Phase3RenderKind;
  width?: number;
  height?: number;
}

export interface Phase3ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 260;
const MIN_BLOCK_SIZE = 1;
const MAX_BLOCK_SIZE = 42;
const imageUrlCache = new Map<string, string>();

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toKey(options: Required<Phase3ImageOptions>): string {
  return [
    options.satelliteId,
    options.resolutionMeters.toFixed(3),
    options.weather,
    options.kind,
    options.width,
    options.height,
  ].join(":");
}

export function hashInt(x: number, y: number, seed: number): number {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 982451653;
  n = (n ^ (n >>> 13)) * 1274126177;
  return n ^ (n >>> 16);
}

export function hash01(x: number, y: number, seed: number): number {
  return (hashInt(x, y, seed) >>> 0) / 0xffffffff;
}

export function smoothNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = x - x0;
  const ty = y - y0;

  const n00 = hash01(x0, y0, seed);
  const n10 = hash01(x1, y0, seed);
  const n01 = hash01(x0, y1, seed);
  const n11 = hash01(x1, y1, seed);

  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const nx0 = lerp(n00, n10, sx);
  const nx1 = lerp(n01, n11, sx);
  return lerp(nx0, nx1, sy);
}

function seedFromSatelliteId(satelliteId: string): number {
  let seed = 2166136261;
  for (let i = 0; i < satelliteId.length; i++) {
    seed ^= satelliteId.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed | 0;
}

function baseRgbAt(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number,
): [number, number, number] {
  const nx = x / width;
  const ny = y / height;
  const terrain = smoothNoise(nx * 18 + 11, ny * 18 + 7, seed);

  let r = 98 + terrain * 64;
  let g = 128 + terrain * 72;
  let b = 76 + terrain * 40;

  const riverCenter = height * 0.36 + Math.sin(nx * Math.PI * 3.2 + seed * 0.0000008) * 18;
  const riverWidth = 14 + smoothNoise(nx * 10, ny * 9, seed + 97) * 9;
  const distRiver = Math.abs(y - riverCenter);
  if (distRiver < riverWidth) {
    const t = 1 - distRiver / riverWidth;
    r = lerp(r, 56, t);
    g = lerp(g, 113, t);
    b = lerp(b, 183, t);
  }

  const roadV = Math.abs(((x + 20) % 88) - 44) < 2.3;
  const roadH = Math.abs(((y + 14) % 74) - 37) < 2.1;
  if (roadV || roadH) {
    r = 170;
    g = 170;
    b = 170;
  }

  const schoolX0 = width * 0.38;
  const schoolX1 = width * 0.62;
  const schoolY0 = height * 0.52;
  const schoolY1 = height * 0.74;
  if (x > schoolX0 && x < schoolX1 && y > schoolY0 && y < schoolY1) {
    r = 222;
    g = 195;
    b = 152;
  }

  const trackDx = (x - width * 0.72) / 38;
  const trackDy = (y - height * 0.64) / 24;
  const trackRadius = trackDx * trackDx + trackDy * trackDy;
  if (trackRadius < 1.15 && trackRadius > 0.48) {
    r = 188;
    g = 82;
    b = 74;
  }

  const pitchX0 = width * 0.65;
  const pitchX1 = width * 0.92;
  const pitchY0 = height * 0.16;
  const pitchY1 = height * 0.46;
  if (x > pitchX0 && x < pitchX1 && y > pitchY0 && y < pitchY1) {
    r = 74;
    g = 142;
    b = 82;
  }

  const treeNoise = hash01(x >> 1, y >> 1, seed + 401);
  if (treeNoise > 0.96) {
    r = 54;
    g = 108;
    b = 50;
  }

  return [r | 0, g | 0, b | 0];
}

export function createBaseImage(width: number, height: number, seed: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const [r, g, b] = baseRgbAt(x, y, width, height, seed);
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
  return data;
}

export function toResolutionBlockSize(resolutionMeters: number): number {
  const normalized = clamp(resolutionMeters, 0.3, 500);
  const ratio = normalized / 0.3;
  const scaled = Math.pow(ratio, 0.5);
  return clamp(Math.round(scaled), MIN_BLOCK_SIZE, MAX_BLOCK_SIZE);
}

export function pixelate(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  blockSize: number,
): Uint8ClampedArray {
  if (blockSize <= 1) return source.slice();

  const downW = Math.ceil(width / blockSize);
  const downH = Math.ceil(height / blockSize);
  const down = new Uint8ClampedArray(downW * downH * 4);

  for (let by = 0; by < downH; by++) {
    for (let bx = 0; bx < downW; bx++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let count = 0;
      const srcX0 = bx * blockSize;
      const srcY0 = by * blockSize;

      for (let y = srcY0; y < Math.min(srcY0 + blockSize, height); y++) {
        for (let x = srcX0; x < Math.min(srcX0 + blockSize, width); x++) {
          const srcOffset = (y * width + x) * 4;
          sr += source[srcOffset];
          sg += source[srcOffset + 1];
          sb += source[srcOffset + 2];
          count += 1;
        }
      }

      const downOffset = (by * downW + bx) * 4;
      down[downOffset] = (sr / count) | 0;
      down[downOffset + 1] = (sg / count) | 0;
      down[downOffset + 2] = (sb / count) | 0;
      down[downOffset + 3] = 255;
    }
  }

  const up = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sampleY = Math.floor(y / blockSize);
    for (let x = 0; x < width; x++) {
      const sampleX = Math.floor(x / blockSize);
      const downOffset = (sampleY * downW + sampleX) * 4;
      const upOffset = (y * width + x) * 4;
      up[upOffset] = down[downOffset];
      up[upOffset + 1] = down[downOffset + 1];
      up[upOffset + 2] = down[downOffset + 2];
      up[upOffset + 3] = 255;
    }
  }
  return up;
}

function toGrayscaleSar(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  seed: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = source[offset];
      const g = source[offset + 1];
      const b = source[offset + 2];
      const gray = r * 0.299 + g * 0.587 + b * 0.114;

      const rightOffset = (y * width + Math.min(width - 1, x + 1)) * 4;
      const bottomOffset = (Math.min(height - 1, y + 1) * width + x) * 4;
      const rightGray =
        source[rightOffset] * 0.299 +
        source[rightOffset + 1] * 0.587 +
        source[rightOffset + 2] * 0.114;
      const bottomGray =
        source[bottomOffset] * 0.299 +
        source[bottomOffset + 1] * 0.587 +
        source[bottomOffset + 2] * 0.114;
      const edge = Math.abs(gray - rightGray) + Math.abs(gray - bottomGray);

      const speckle = (hash01(x, y, seed + 509) - 0.5) * 58;
      const value = clamp(Math.round(gray * 0.72 + edge * 1.2 + speckle + 28), 0, 255);
      out[offset] = value;
      out[offset + 1] = value;
      out[offset + 2] = value;
      out[offset + 3] = 255;
    }
  }
  return out;
}

function applyCloudOverlay(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  seed: number,
): Uint8ClampedArray {
  const out = source.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const lowFreq = smoothNoise(x * 0.018, y * 0.018, seed + 809);
      const highFreq = smoothNoise(x * 0.045 + 17, y * 0.045 + 9, seed + 1013);
      const cloud = lowFreq * 0.75 + highFreq * 0.25;

      if (cloud > 0.57) {
        const alpha = clamp((cloud - 0.57) * 2.35, 0, 0.84);
        const cloudR = 248;
        const cloudG = 250;
        const cloudB = 255;
        out[offset] = Math.round(lerp(out[offset], cloudR, alpha));
        out[offset + 1] = Math.round(lerp(out[offset + 1], cloudG, alpha));
        out[offset + 2] = Math.round(lerp(out[offset + 2], cloudB, alpha));
      }
    }
  }
  return out;
}

function normalizeOptions(input: Phase3ImageOptions): Required<Phase3ImageOptions> {
  return {
    satelliteId: input.satelliteId,
    resolutionMeters: input.resolutionMeters,
    weather: input.weather,
    kind: input.kind,
    width: input.width ?? DEFAULT_WIDTH,
    height: input.height ?? DEFAULT_HEIGHT,
  };
}

function createFallbackDataUrl(kind: Phase3RenderKind): string {
  const label = kind === "sar" ? "SAR" : kind === "optical" ? "OPTICAL" : "RESOLUTION";
  const fill = kind === "sar" ? "#7f8994" : "#7cba8c";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="260"><rect width="100%" height="100%" fill="${fill}"/><text x="50%" y="52%" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#ffffff">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildPhase3ImageData(input: Phase3ImageOptions): Phase3ImageData {
  const options = normalizeOptions(input);
  const seed = seedFromSatelliteId(options.satelliteId);
  const base = createBaseImage(options.width, options.height, seed);
  const blockSize = toResolutionBlockSize(options.resolutionMeters);

  if (options.kind === "sar") {
    return {
      width: options.width,
      height: options.height,
      data: toGrayscaleSar(
        pixelate(base, options.width, options.height, Math.max(2, blockSize)),
        options.width,
        options.height,
        seed,
      ),
    };
  }

  const pixelated = pixelate(base, options.width, options.height, blockSize);
  if (options.kind === "optical" && options.weather === "cloudy") {
    return {
      width: options.width,
      height: options.height,
      data: applyCloudOverlay(pixelated, options.width, options.height, seed),
    };
  }

  return {
    width: options.width,
    height: options.height,
    data: pixelated,
  };
}

export function getPhase3ImageDataUrl(input: Phase3ImageOptions): string {
  const options = normalizeOptions(input);
  const key = toKey(options);
  const cached = imageUrlCache.get(key);
  if (cached) return cached;

  if (typeof document === "undefined") {
    const fallback = createFallbackDataUrl(options.kind);
    imageUrlCache.set(key, fallback);
    return fallback;
  }

  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallback = createFallbackDataUrl(options.kind);
    imageUrlCache.set(key, fallback);
    return fallback;
  }

  const image = buildPhase3ImageData(options);
  const imageData = ctx.createImageData(image.width, image.height);
  imageData.data.set(image.data);
  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL("image/png");
  imageUrlCache.set(key, dataUrl);
  return dataUrl;
}

export function clearPhase3ImageCache(): void {
  imageUrlCache.clear();
}

export function getAverageLuminance(imageData: Uint8ClampedArray): number {
  if (imageData.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < imageData.length; i += 4) {
    total += imageData[i] * 0.2126 + imageData[i + 1] * 0.7152 + imageData[i + 2] * 0.0722;
  }
  return total / (imageData.length / 4);
}

export function getSpatialDetailScore(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  if (width < 2 || height < 2) return 0;
  let score = 0;
  let samples = 0;
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const right = i + 4;
      const down = i + width * 4;
      const dr = Math.abs(imageData[i] - imageData[right]);
      const dg = Math.abs(imageData[i + 1] - imageData[right + 1]);
      const db = Math.abs(imageData[i + 2] - imageData[right + 2]);
      const ddR = Math.abs(imageData[i] - imageData[down]);
      const ddG = Math.abs(imageData[i + 1] - imageData[down + 1]);
      const ddB = Math.abs(imageData[i + 2] - imageData[down + 2]);
      score += dr + dg + db + ddR + ddG + ddB;
      samples += 6;
    }
  }
  return score / samples;
}
