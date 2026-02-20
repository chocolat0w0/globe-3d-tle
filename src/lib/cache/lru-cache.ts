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
  private readonly cache: Map<string, V>;

  constructor(maxSize: number) {
    if (maxSize <= 0) throw new Error("maxSize must be a positive integer");
    this.maxSize = maxSize;
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
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 先頭エントリ（LRU）を削除
      const lruKey = this.cache.keys().next().value as string;
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
