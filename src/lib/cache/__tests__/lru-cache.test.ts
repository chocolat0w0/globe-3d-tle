import { describe, it, expect, beforeEach } from "vitest";
import { LRUCache } from "../lru-cache";

describe("LRUCache", () => {
  // ---------------------------------------------------------------------------
  // コンストラクタ
  // ---------------------------------------------------------------------------

  describe("constructor", () => {
    it("maxSize=0 では例外を投げる", () => {
      expect(() => new LRUCache(0)).toThrow();
    });

    it("負の maxSize では例外を投げる", () => {
      expect(() => new LRUCache(-1)).toThrow();
    });

    it("初期状態は size=0", () => {
      const cache = new LRUCache<string>(5);
      expect(cache.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 基本操作: set / get / has / size
  // ---------------------------------------------------------------------------

  describe("set / get", () => {
    it("set した値を get で取得できる", () => {
      const cache = new LRUCache<number>(5);
      cache.set("a", 1);
      expect(cache.get("a")).toBe(1);
    });

    it("存在しないキーの get は undefined を返す", () => {
      const cache = new LRUCache<number>(5);
      expect(cache.get("missing")).toBeUndefined();
    });

    it("同じキーを set するとキャッシュが上書きされる", () => {
      const cache = new LRUCache<number>(5);
      cache.set("a", 1);
      cache.set("a", 99);
      expect(cache.get("a")).toBe(99);
    });

    it("上書き後も size は変わらない", () => {
      const cache = new LRUCache<number>(5);
      cache.set("a", 1);
      cache.set("a", 2);
      expect(cache.size).toBe(1);
    });
  });

  describe("has", () => {
    it("set 済みのキーは has が true を返す", () => {
      const cache = new LRUCache<string>(3);
      cache.set("x", "hello");
      expect(cache.has("x")).toBe(true);
    });

    it("存在しないキーは has が false を返す", () => {
      const cache = new LRUCache<string>(3);
      expect(cache.has("x")).toBe(false);
    });
  });

  describe("size", () => {
    it("エントリを追加すると size が増える", () => {
      const cache = new LRUCache<number>(10);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      expect(cache.size).toBe(3);
    });
  });

  describe("capacity", () => {
    it("capacity は maxSize を返す", () => {
      const cache = new LRUCache<number>(42);
      expect(cache.capacity).toBe(42);
    });

    it("エントリを追加しても capacity は変わらない", () => {
      const cache = new LRUCache<number>(5);
      cache.set("a", 1);
      cache.set("b", 2);
      expect(cache.capacity).toBe(5);
    });

    it("エビクションが発生しても capacity は変わらない", () => {
      const cache = new LRUCache<number>(2);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3); // "a" がエビクト
      expect(cache.capacity).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // delete / clear
  // ---------------------------------------------------------------------------

  describe("delete", () => {
    it("存在するキーを delete すると true を返し size が減る", () => {
      const cache = new LRUCache<number>(5);
      cache.set("a", 1);
      const result = cache.delete("a");
      expect(result).toBe(true);
      expect(cache.size).toBe(0);
      expect(cache.has("a")).toBe(false);
    });

    it("存在しないキーを delete すると false を返す", () => {
      const cache = new LRUCache<number>(5);
      const result = cache.delete("nope");
      expect(result).toBe(false);
    });
  });

  describe("clear", () => {
    it("clear 後は size=0 かつ全エントリが消える", () => {
      const cache = new LRUCache<number>(5);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 容量超過: LRU エビクション
  // ---------------------------------------------------------------------------

  describe("capacity and eviction", () => {
    it("maxSize を超えたとき最も古いエントリが削除される", () => {
      const cache = new LRUCache<number>(3);
      cache.set("a", 1); // 挿入順: a
      cache.set("b", 2); // 挿入順: a, b
      cache.set("c", 3); // 挿入順: a, b, c  (満杯)
      cache.set("d", 4); // a がエビクト → b, c, d

      expect(cache.has("a")).toBe(false);
      expect(cache.get("b")).toBe(2);
      expect(cache.get("c")).toBe(3);
      expect(cache.get("d")).toBe(4);
    });

    it("size は maxSize を超えない", () => {
      const cache = new LRUCache<number>(3);
      for (let i = 0; i < 10; i++) {
        cache.set(`k${i}`, i);
      }
      expect(cache.size).toBe(3);
    });

    it("maxSize=1 のキャッシュは常に最後に set したエントリだけ保持する", () => {
      const cache = new LRUCache<number>(1);
      cache.set("a", 1);
      cache.set("b", 2);
      expect(cache.has("a")).toBe(false);
      expect(cache.get("b")).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // LRU 順序: get がアクセス順を更新するか
  // ---------------------------------------------------------------------------

  describe("LRU order after get", () => {
    it("get したエントリは MRU になり、エビクト対象から外れる", () => {
      const cache = new LRUCache<number>(3);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      // "a" にアクセスして MRU にする
      cache.get("a");

      // 4つ目を追加 → LRU は "b" のはず
      cache.set("d", 4);

      expect(cache.has("b")).toBe(false); // b がエビクトされた
      expect(cache.has("a")).toBe(true);  // a は MRU なので残っている
      expect(cache.has("c")).toBe(true);
      expect(cache.has("d")).toBe(true);
    });

    it("全エントリを最近アクセス順に並べ直した後、古い順にエビクトされる", () => {
      // 挿入: a, b, c → アクセス: c, b, a → 今の LRU 順は c(最古), b, a(最新)
      const cache = new LRUCache<number>(3);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      cache.get("c"); // c を MRU に
      cache.get("b"); // b を MRU に
      cache.get("a"); // a を MRU に（LRU 順: c → b → a）

      // 次のエビクト対象は "c"
      cache.set("d", 4);
      expect(cache.has("c")).toBe(false);
      expect(cache.has("b")).toBe(true);
      expect(cache.has("a")).toBe(true);
      expect(cache.has("d")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // LRU 順序: set による更新（既存キーへの上書き）
  // ---------------------------------------------------------------------------

  describe("LRU order after overwrite set", () => {
    it("既存キーを set し直すと MRU になる", () => {
      const cache = new LRUCache<number>(3);
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      // "a" を更新 → LRU 順は b → c → a
      cache.set("a", 10);

      // 次のエビクト対象は "b"
      cache.set("d", 4);
      expect(cache.has("b")).toBe(false);
      expect(cache.get("a")).toBe(10);
      expect(cache.has("c")).toBe(true);
      expect(cache.has("d")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 型の柔軟性
  // ---------------------------------------------------------------------------

  describe("generic type support", () => {
    it("オブジェクト値を格納できる", () => {
      interface Payload { x: number; y: number }
      const cache = new LRUCache<Payload>(5);
      cache.set("p1", { x: 1, y: 2 });
      expect(cache.get("p1")).toEqual({ x: 1, y: 2 });
    });

    it("TypedArray を格納できる", () => {
      const cache = new LRUCache<Float64Array>(3);
      const arr = new Float64Array([1.1, 2.2, 3.3]);
      cache.set("orbit", arr);
      expect(cache.get("orbit")).toBe(arr); // 同じ参照
    });
  });

  describe("estimatedBytes", () => {
    it("sizeOf 未指定時は TypedArray の byteLength を合算する", () => {
      const cache = new LRUCache<Float32Array>(3);
      cache.set("a", new Float32Array(4)); // 16 bytes
      cache.set("b", new Float32Array(2)); // 8 bytes
      expect(cache.estimatedBytes).toBe(24);
    });

    it("ArrayBuffer も合算対象になる", () => {
      const cache = new LRUCache<ArrayBuffer>(3);
      cache.set("buf", new ArrayBuffer(64));
      expect(cache.estimatedBytes).toBe(64);
    });

    it("sizeOf 指定時はコールバック値を使用する", () => {
      const cache = new LRUCache<{ bytes: number }>(3, (value) => value.bytes);
      cache.set("x", { bytes: 10 });
      cache.set("y", { bytes: 15 });
      expect(cache.estimatedBytes).toBe(25);
    });

    it("既存キー上書き時は差し替え後サイズに更新される", () => {
      const cache = new LRUCache<{ bytes: number }>(3, (value) => value.bytes);
      cache.set("x", { bytes: 10 });
      cache.set("x", { bytes: 4 });
      expect(cache.estimatedBytes).toBe(4);
    });

    it("容量超過エビクト時に削除分が差し引かれる", () => {
      const cache = new LRUCache<{ bytes: number }>(2, (value) => value.bytes);
      cache.set("a", { bytes: 10 });
      cache.set("b", { bytes: 20 });
      cache.set("c", { bytes: 30 }); // "a" がエビクト
      expect(cache.estimatedBytes).toBe(50);
    });

    it("delete と clear で合計サイズが更新される", () => {
      const cache = new LRUCache<Float64Array>(3);
      cache.set("a", new Float64Array(2)); // 16
      cache.set("b", new Float64Array(1)); // 8
      expect(cache.estimatedBytes).toBe(24);

      cache.delete("a");
      expect(cache.estimatedBytes).toBe(8);

      cache.clear();
      expect(cache.estimatedBytes).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // エッジケース
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    let cache: LRUCache<number>;

    beforeEach(() => {
      cache = new LRUCache<number>(3);
    });

    it("空のキャッシュへの get は undefined を返す", () => {
      expect(cache.get("any")).toBeUndefined();
    });

    it("delete 後に同じキーを再 set できる", () => {
      cache.set("a", 1);
      cache.delete("a");
      cache.set("a", 99);
      expect(cache.get("a")).toBe(99);
    });

    it("maxSize 件 set してから clear するとサイズが 0 になる", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      cache.clear();
      expect(cache.size).toBe(0);
    });

    it("clear 後も引き続き set / get できる", () => {
      cache.set("a", 1);
      cache.clear();
      cache.set("b", 2);
      expect(cache.get("b")).toBe(2);
    });
  });
});
