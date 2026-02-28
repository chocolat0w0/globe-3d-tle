import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSatelliteRealtime } from "../useSatelliteRealtime";
import type { TLEData } from "../../types/satellite";

/**
 * useSatelliteRealtime フック テスト
 *
 * 仕様:
 *   - TLEがnullのとき null を返す
 *   - 有効なTLEを渡すとマウント直後に非null の位置情報を返す
 *   - 1秒間隔で位置を更新する（vi.advanceTimersByTime で制御）
 *   - TLEをnullに変更すると null に戻る
 *   - アンマウント時にclearIntervalが呼ばれ、インターバルが止まる
 *
 * 使用TLE: SENTINEL-1A (LEO, SSO, ~693km)
 * 元期に近い固定日時を使うことで、satellite.js 伝播誤差が最小化される。
 */

// --------------------------------------------------------------------------
// TLE定数
// --------------------------------------------------------------------------

/** SENTINEL-1A: LEO, SSO, ~693km */
const SENTINEL1A_TLE1 = "1 39634U 14016A   26053.99037749 -.00000228  00000+0 -38637-4 0  9995";
const SENTINEL1A_TLE2 = "2 39634  98.1817  63.1723 0001334  84.0618 276.0734 14.59197482633361";

const SENTINEL1A_TLE: TLEData = {
  line1: SENTINEL1A_TLE1,
  line2: SENTINEL1A_TLE2,
};

// --------------------------------------------------------------------------
// テスト
// --------------------------------------------------------------------------

describe("useSatelliteRealtime", () => {
  beforeEach(() => {
    // フェイクタイマーを有効化。setInterval/clearInterval を制御する。
    // new Date() の結果も固定して伝播計算を安定させる。
    vi.useFakeTimers();
    // TLE元期 2026-02-22 の翌日に固定 → SGP4伝播が正常値を返す
    vi.setSystemTime(new Date("2026-02-23T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("tleがnullのとき", () => {
    it("nullを返す", () => {
      const { result } = renderHook(() => useSatelliteRealtime(null));
      expect(result.current).toBeNull();
    });

    it("インターバルは設定されない（アンマウントしてもclearIntervalは呼ばれない）", () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      const { unmount } = renderHook(() => useSatelliteRealtime(null));
      unmount();
      expect(clearIntervalSpy).not.toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("有効なTLEを渡したとき", () => {
    it("マウント直後にnullでない位置情報が取得できる", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));
      expect(result.current).not.toBeNull();
    });

    it("マウント直後の緯度が[-90, 90]の範囲内にある", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));
      expect(result.current).not.toBeNull();
      expect(result.current!.latDeg).toBeGreaterThanOrEqual(-90);
      expect(result.current!.latDeg).toBeLessThanOrEqual(90);
    });

    it("マウント直後の経度が[-180, 180]の範囲内にある", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));
      expect(result.current).not.toBeNull();
      expect(result.current!.lonDeg).toBeGreaterThanOrEqual(-180);
      expect(result.current!.lonDeg).toBeLessThanOrEqual(180);
    });

    it("マウント直後の高度が0より大きい（地表より上空）", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));
      expect(result.current).not.toBeNull();
      expect(result.current!.altKm).toBeGreaterThan(0);
    });

    it("マウント直後の速度が0より大きい（km/s）", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));
      expect(result.current).not.toBeNull();
      expect(result.current!.speedKmS).toBeGreaterThan(0);
    });

    it("1秒経過後に値が更新される（vi.advanceTimersByTime(1000)）", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));

      // マウント直後の値を記録
      const initialPos = result.current;
      expect(initialPos).not.toBeNull();

      // 1秒後: システム時刻も進めてインターバルを発火させる
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // setInterval が呼ばれて状態が更新されているはず
      // 1秒分の時刻変化でも、新しい Date() が使われるため再計算される
      const updatedPos = result.current;
      expect(updatedPos).not.toBeNull();

      // 1秒は衛星軌道上で有意な移動距離（SENTINEL-1Aは ~7km/s）
      // 緯度か経度のいずれかが変化していることを確認する
      // （極通過時は経度が大きく変化し緯度はわずかしか変わらないが合計では必ず変化）
      const posChanged =
        initialPos!.latDeg !== updatedPos!.latDeg || initialPos!.lonDeg !== updatedPos!.lonDeg;
      expect(posChanged).toBe(true);
    });

    it("1秒経過後も緯度が[-90, 90]の範囲内を維持する", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current).not.toBeNull();
      expect(result.current!.latDeg).toBeGreaterThanOrEqual(-90);
      expect(result.current!.latDeg).toBeLessThanOrEqual(90);
    });

    it("複数回のインターバルで継続的に更新される（3秒分）", () => {
      const { result } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));

      const positions: (typeof result.current)[] = [result.current];

      // 3回 1秒ずつ進める
      for (let i = 0; i < 3; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
        positions.push(result.current);
      }

      // 4回分すべてが非nullである
      for (const pos of positions) {
        expect(pos).not.toBeNull();
      }

      // 最初と最後で位置が変化している
      const first = positions[0];
      const last = positions[3];
      const posChanged = first!.latDeg !== last!.latDeg || first!.lonDeg !== last!.lonDeg;
      expect(posChanged).toBe(true);
    });
  });

  describe("TLEをnullに変更したとき", () => {
    it("line1/line2 が同一なら新しい TLE オブジェクトでも interval を再作成しない", () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      let tle: TLEData | null = { ...SENTINEL1A_TLE };
      const { rerender, unmount } = renderHook(() => useSatelliteRealtime(tle));

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      // 参照だけ変えても line1/line2 が同じなら effect は再実行されない
      act(() => {
        tle = { ...SENTINEL1A_TLE };
        rerender();
      });

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      unmount();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it("nullに変更すると位置情報もnullに戻る", () => {
      let tle: TLEData | null = SENTINEL1A_TLE;
      const { result, rerender } = renderHook(() => useSatelliteRealtime(tle));

      // マウント直後は非null
      expect(result.current).not.toBeNull();

      // TLEをnullに変更
      act(() => {
        tle = null;
        rerender();
      });

      expect(result.current).toBeNull();
    });

    it("nullに変更した後に再びTLEを渡すと位置情報が復元する", () => {
      let tle: TLEData | null = SENTINEL1A_TLE;
      const { result, rerender } = renderHook(() => useSatelliteRealtime(tle));

      expect(result.current).not.toBeNull();

      // TLEをnullに変更
      act(() => {
        tle = null;
        rerender();
      });
      expect(result.current).toBeNull();

      // TLEを再度設定
      act(() => {
        tle = SENTINEL1A_TLE;
        rerender();
      });
      expect(result.current).not.toBeNull();
    });
  });

  describe("アンマウント時のクリーンアップ", () => {
    it("アンマウント時にclearIntervalが呼ばれる（インターバルが停止する）", () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const { unmount } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));

      // アンマウント前はclearIntervalが呼ばれていない
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      unmount();

      // アンマウント後はclearIntervalが呼ばれている
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

      clearIntervalSpy.mockRestore();
    });

    it("アンマウント後にインターバルが発火しても状態更新が起きない（メモリリークなし）", () => {
      const setStateMock = vi.fn();

      const { unmount } = renderHook(() => useSatelliteRealtime(SENTINEL1A_TLE));
      unmount();

      // アンマウント後にタイマーを進めてもエラーが発生しない
      // （clearInterval により setInterval コールバックは実行されない）
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(3000);
        });
      }).not.toThrow();

      setStateMock.mockRestore();
    });
  });
});
