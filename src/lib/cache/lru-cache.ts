/**
 * ジェネリックな LRU（Least Recently Used）キャッシュ
 *
 * Map の挿入順（insertion order）を利用して LRU 順を管理する。
 * - 先頭 = LRU（最も古い）
 * - 末尾 = MRU（最も新しい）
 *
 * get / set のたびにエントリを末尾へ移動してMRUとしてマークする。
 * maxSize を超えたとき先頭エントリ（LRU）を削除する。
 */
export class LRUCache<V> {
  private readonly maxSize: number;
  private readonly sizeOf?: (value: V) => number;
  private readonly cache: Map<string, V>;
  private totalBytes = 0;

  constructor(maxSize: number, sizeOf?: (value: V) => number) {
    if (maxSize <= 0) throw new Error("maxSize must be a positive integer");
    this.maxSize = maxSize;
    this.sizeOf = sizeOf;
    this.cache = new Map();
  }

  get(key: string): V | undefined {
    if (!this.cache.has(key)) return undefined;
    // MRU に移動（delete して再 set すると末尾に移動する）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.cache.has(key)) {
      // 既存エントリを末尾（MRU）へ移動
      const oldValue = this.cache.get(key)!;
      this.totalBytes -= this.getValueSize(oldValue);
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 先頭エントリ（LRU）を削除
      const lruKey = this.cache.keys().next().value as string;
      const lruValue = this.cache.get(lruKey);
      if (lruValue !== undefined) {
        this.totalBytes -= this.getValueSize(lruValue);
      }
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value);
    this.totalBytes += this.getValueSize(value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.totalBytes -= this.getValueSize(value);
    }
    return this.cache.delete(key);
  }

  /**
   * 指定プレフィックスで始まるすべてのエントリを削除する。
   * @returns 削除したエントリ数
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
    this.totalBytes = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  get capacity(): number {
    return this.maxSize;
  }

  get estimatedBytes(): number {
    return this.totalBytes;
  }

  private getValueSize(value: V): number {
    if (this.sizeOf) {
      return normalizeByteSize(this.sizeOf(value));
    }

    if (ArrayBuffer.isView(value)) {
      return value.byteLength;
    }

    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }

    if (value !== null && typeof value === "object") {
      const candidate = value as { byteLength?: unknown; buffer?: { byteLength?: unknown } };
      if (typeof candidate.byteLength === "number") {
        return normalizeByteSize(candidate.byteLength);
      }
      if (candidate.buffer && typeof candidate.buffer.byteLength === "number") {
        return normalizeByteSize(candidate.buffer.byteLength);
      }
    }

    return 0;
  }
}

function normalizeByteSize(size: number): number {
  if (!Number.isFinite(size) || size < 0) return 0;
  return Math.floor(size);
}
