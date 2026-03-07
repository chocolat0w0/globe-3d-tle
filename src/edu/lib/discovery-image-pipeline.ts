import type { DiscoveryCreature, DiscoveryLocation } from "../types/target-discovery";
import { createBaseImage, pixelate, toResolutionBlockSize } from "./phase3-image-pipeline";

export interface DiscoveryImageOptions {
  location: DiscoveryLocation;
  creature: DiscoveryCreature;
  resolutionMeters: number;
  /** Creature position offset from center, normalized [-0.8, 0.8]. */
  creatureOffset?: { x: number; y: number };
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 300;
const EMOJI_SIZE = 64;

const imageUrlCache = new Map<string, string>();

function cacheKey(options: DiscoveryImageOptions): string {
  const off = options.creatureOffset;
  return [
    options.location.id,
    options.creature.id,
    options.resolutionMeters.toFixed(3),
    options.width ?? DEFAULT_WIDTH,
    options.height ?? DEFAULT_HEIGHT,
    off ? `${off.x.toFixed(2)},${off.y.toFixed(2)}` : "0,0",
  ].join(":");
}

/**
 * Generate a simulated satellite image of a creature at a given resolution.
 *
 * At low resolution (e.g. 10m) the emoji is pixelated into unrecognizable blobs.
 * At high resolution (e.g. 0.3m) the emoji is clearly visible.
 */
export function generateDiscoveryImageUrl(options: DiscoveryImageOptions): string {
  const key = cacheKey(options);
  const cached = imageUrlCache.get(key);
  if (cached) return cached;

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  if (typeof document === "undefined") {
    const url = createFallbackSvg(width, height);
    imageUrlCache.set(key, url);
    return url;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const url = createFallbackSvg(width, height);
    imageUrlCache.set(key, url);
    return url;
  }

  // 1. Draw procedural terrain background seeded by location
  const baseData = createBaseImage(width, height, options.location.terrainSeed);
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(baseData);
  ctx.putImageData(imageData, 0, 0);

  // 2. Draw the creature emoji (offset from center if specified)
  const off = options.creatureOffset ?? { x: 0, y: 0 };
  const emojiX = width / 2 + off.x * (width / 3);
  const emojiY = height / 2 + off.y * (height / 3);
  ctx.font = `${EMOJI_SIZE}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.creature.emoji, emojiX, emojiY);

  // 3. Read full-resolution pixel data
  const fullResData = ctx.getImageData(0, 0, width, height);

  // 4. Apply resolution-based pixelation
  const blockSize = toResolutionBlockSize(options.resolutionMeters);
  const pixelated = pixelate(fullResData.data, width, height, blockSize);

  // 5. Write back and export
  const outData = ctx.createImageData(width, height);
  outData.data.set(pixelated);
  ctx.putImageData(outData, 0, 0);

  const dataUrl = canvas.toDataURL("image/png");
  imageUrlCache.set(key, dataUrl);
  return dataUrl;
}

export function clearDiscoveryImageCache(): void {
  imageUrlCache.clear();
}

function createFallbackSvg(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#5a7a5a"/><text x="50%" y="52%" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#fff">SCAN</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
