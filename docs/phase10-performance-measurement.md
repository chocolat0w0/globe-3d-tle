# Phase 10: パフォーマンス計測 タスク分解

## 概要

Phase 9 まで完了済みのアプリケーションに対し、パフォーマンス計測基盤を追加する。現状は計測コードが一切存在しないため、ボトルネックの特定と改善効果の検証ができない状態にある。本フェーズでは計測 → 可視化 → ベースライン取得 → 改善施策の判断 という一連のサイクルを確立する。

### 前提条件

- Phase 1〜9 がすべて完了していること
- `src/workers/orbit-calculator.worker.ts` が Worker として動作していること
- `src/lib/cache/lru-cache.ts` の LRU キャッシュが稼働していること

---

## Task 1: 計測基盤

### 1-A: PerfLogger の実装

**目的**: 計測ポイントごとのタイミングを一元的に記録するユーティリティを作成する。

**対象ファイル（新規作成）**: `src/lib/perf/perf-logger.ts`

**作業内容**:

```
src/lib/perf/
└── perf-logger.ts   ← 新規作成
```

- `performance.now()` を使用したマーク / メジャー API のラッパーを実装する
- 計測キー（`"worker-rtt"`, `"footprint-render"` 等）ごとにラベルを統一する
- 本番ビルドでは無効化できるよう `enabled` フラグ（環境変数 `VITE_PERF_LOG=true` で制御）を設ける
- 計測結果を `PerfMetricsStore` へ通知するコールバックを受け取れる設計にする

**インターフェース案**:

```typescript
export interface PerfEntry {
  label: string; // 計測ラベル（例: "worker-rtt:ISS"）
  durationMs: number; // 計測時間（ms）
  timestamp: number; // performance.now() の記録時刻
}

export class PerfLogger {
  /** 計測を開始する。同一 label の開始を二重呼び出しした場合は上書き */
  start(label: string): void;
  /** 計測を終了して PerfEntry を返す。start が呼ばれていない場合は null */
  end(label: string): PerfEntry | null;
  /** start/end を同期関数に対してまとめて計測するユーティリティ */
  measure<T>(label: string, fn: () => T): T;
  /** start/end を非同期関数に対してまとめて計測するユーティリティ */
  measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
}
```

**成果物**:

- `src/lib/perf/perf-logger.ts` が実装・エクスポートされていること
- `VITE_PERF_LOG=false`（または未設定）のとき `start`/`end` が即 return することをテストで確認すること

**依存**: なし

---

### 1-B: PerfMetricsStore の実装

**目的**: 各計測ポイントから送られてきた `PerfEntry` を集約し、コンポーネントから参照できる状態にする。

**対象ファイル（新規作成）**: `src/lib/perf/perf-metrics-store.ts`

**作業内容**:

- 直近 N 件（デフォルト 100）のエントリを保持するリングバッファを実装する
- ラベルごとに最新値・平均・p95 を計算する
- Zustand または Context ではなく **モジュールレベルのシングルトン + 購読 (subscribe) パターン** で実装し、React に依存しない設計とする（Worker 側からも参照可能）
- `getStats(label: string): { latest: number; avg: number; p95: number } | null` を公開する

**インターフェース案**:

```typescript
export interface PerfStats {
  latest: number;
  avg: number;
  p95: number;
  count: number;
}

export class PerfMetricsStore {
  push(entry: PerfEntry): void;
  getStats(label: string): PerfStats | null;
  getAllLabels(): string[];
  subscribe(callback: () => void): () => void; // unsubscribe 関数を返す
  clear(): void;
}

export const perfMetricsStore: PerfMetricsStore; // シングルトンエクスポート
```

**成果物**:

- `src/lib/perf/perf-metrics-store.ts` が実装・エクスポートされていること
- p95 計算ロジックのユニットテストが通ること
- リングバッファの上限超過時に最古エントリが破棄されることをテストで確認すること

**依存**: 1-A（PerfLogger）

---

## Task 2: Worker 計算パイプライン計測

### 2-A: Worker 内タイミング計測

**目的**: SGP4 計算・フットプリント計算・スワス計算それぞれの所要時間を Worker 内部で計測し、レスポンスに含めて返す。

**対象ファイル（変更）**: `src/workers/orbit-calculator.worker.ts`

**作業内容**:

- `performance.now()` を使って `computeOrbit` / `computeFootprints` / `computeSwath` 各関数の実行時間を計測する
- `ComputeDayResponse` に `timings` フィールドを追加し、計測結果を返す

**型拡張（`src/types/worker-messages.ts` に追加）**:

```typescript
export interface ComputeTimings {
  orbitMs?: number;       // computeOrbit の実行時間
  footprintMs?: number;   // computeFootprints の実行時間
  swathMs?: number;       // computeSwath の実行時間
  totalMs: number;        // Worker 内トータル処理時間
}

// ComputeDayResponse に追加
timings?: ComputeTimings;
```

**成果物**:

- `ComputeDayResponse.timings` がレスポンスに含まれること
- Worker 側の計測コードが `VITE_PERF_LOG` フラグで無効化できること

**依存**: 1-A（PerfLogger）

---

### 2-B: Worker RTT 計測

**目的**: Main → Worker → Main の往復時間（RTT）を計測し、Worker 通信のオーバーヘッドを把握する。

**対象ファイル（変更）**: `src/hooks/useWorker.ts`

**作業内容**:

- `postMessage` 呼び出し時に `PerfLogger.start("worker-rtt:<satelliteId>")` を呼ぶ
- `onmessage` ハンドラで `PerfLogger.end("worker-rtt:<satelliteId>")` を呼び、`PerfMetricsStore.push()` する
- `requestId` をキーに使うことで複数リクエストが混在しても正しく計測できるようにする

**計測ラベル規約**:

```
"worker-rtt:<satelliteId>:<requestId の先頭8文字>"
```

**成果物**:

- `useWorker.ts` に RTT 計測コードが追加されていること
- `PerfMetricsStore` に RTT エントリが蓄積されること

**依存**: 1-A、1-B

---

### 2-C: Worker ベンチマークコマンド

**目的**: 開発者が手動で Worker の処理性能を計測できるスクリプトを用意する。

**対象ファイル（新規作成）**: `scripts/bench-worker.ts`

**作業内容**:

- Node.js（または Bun）で直接 `computeOrbit` / `computeFootprints` / `computeSwath` を呼び出して処理時間を計測する
- 衛星数・ステップ秒数を引数で変更できるようにする
- 結果を表形式（label / min / avg / max / p95 の列）でコンソールに出力する

**実行方法**:

```bash
bun run scripts/bench-worker.ts --satellites 10 --step 30
```

**出力例**:

```
label              | min    | avg    | max    | p95
-------------------|--------|--------|--------|--------
computeOrbit       | 12ms   | 15ms   | 22ms   | 21ms
computeFootprints  | 45ms   | 52ms   | 80ms   | 75ms
computeSwath       | 8ms    | 10ms   | 14ms   | 13ms
total (10 sats)    | 680ms  | 730ms  | 870ms  | 850ms
```

**成果物**:

- `scripts/bench-worker.ts` が実行可能であること
- `package.json` に `"bench": "bun run scripts/bench-worker.ts"` スクリプトが追加されていること

**依存**: 2-A

---

## Task 3: レンダリングパイプライン計測

### 3-A: FPS モニタリング

**目的**: Cesium のレンダリングループで FPS を計測し、60fps 安定性を監視する。

**対象ファイル（変更）**: `src/components/Globe/GlobeRenderer.tsx`

**作業内容**:

- `viewer.scene.postRender` イベントで 1 秒間のフレーム数をカウントし、FPS として `PerfMetricsStore` に記録する
- ラベルは `"fps"` とする
- 計測は `VITE_PERF_LOG=true` のときのみ有効にする

**成果物**:

- `GlobeRenderer.tsx` に FPS 計測コードが追加されていること
- `PerfMetricsStore.getStats("fps")` で最新・平均・p95 が取得できること

**依存**: 1-A、1-B

---

### 3-B: FootprintLayer レンダリング計測

**目的**: フットプリントポリゴンの更新（二分探索 + Cartesian3 生成）にかかる時間を計測する。

**対象ファイル（変更）**: `src/components/Globe/FootprintLayer.tsx`

**作業内容**:

- `useMemo` の `polygons` 計算（`findClosestIndex` + `extractPolygons` の一連）を `PerfLogger.measure()` でラップする
- ラベルは `"footprint-update:<id>"` とする
- 計測値を `PerfMetricsStore` へ push する

**成果物**:

- `FootprintLayer.tsx` に計測コードが追加されていること
- `PerfMetricsStore.getStats("footprint-update:ISS")` 等で統計が取得できること

**依存**: 1-A、1-B

---

### 3-C: SatelliteLayer レンダリング計測

**目的**: `SampledPositionProperty` 構築（`orbitData` → Cesium サンプル追加ループ）の所要時間を計測する。

**対象ファイル（変更）**: `src/components/Globe/SatelliteLayer.tsx`

**作業内容**:

- `useMemo` の `sampledPosition` 計算を `PerfLogger.measure()` でラップする
- ラベルは `"sampled-position-build:<id>"` とする
- 計測値を `PerfMetricsStore` へ push する

**成果物**:

- `SatelliteLayer.tsx` に計測コードが追加されていること

**依存**: 1-A、1-B

---

## Task 4: メモリ使用量計測

### 4-A: LRU キャッシュメモリ推定

**目的**: LRU キャッシュに保持している TypedArray の合計バイト数を推定し、上限に対する占有率を把握する。

**対象ファイル（変更）**: `src/lib/cache/lru-cache.ts`

**作業内容**:

- `LRUCache` に `estimatedBytes` getter を追加する
- 値が `{ buffer: ArrayBuffer }` を持つ場合（TypedArray 等）に `byteLength` を合算する
- 値の型を `V` として汎用的に保ちつつ、バイト数推定はオプションの `sizeOf` コールバックで注入できる設計にする

**インターフェース案**:

```typescript
// コンストラクタシグネチャを拡張
constructor(maxSize: number, sizeOf?: (value: V) => number)

// 新規 getter
get estimatedBytes(): number;
```

**成果物**:

- `LRUCache` に `estimatedBytes` getter が追加されていること
- `sizeOf` コールバックを渡した場合と渡さない場合のテストが通ること

**依存**: 1-B

---

### 4-B: ブラウザ メモリ API 監視

**目的**: `performance.memory`（Chrome 限定）を使ってヒープメモリ消費を定期的にサンプリングし、Worker 計算前後のメモリ増減を記録する。

**対象ファイル（新規作成）**: `src/lib/perf/memory-monitor.ts`

**作業内容**:

- `performance.memory` が利用可能なブラウザでのみ動作する（非対応ブラウザでは no-op）
- 1 秒ごとにサンプリングし、`PerfMetricsStore` に `"heap-used-bytes"` として push する
- `startMonitoring()` / `stopMonitoring()` の明示的な制御 API を用意する

**成果物**:

- `src/lib/perf/memory-monitor.ts` が実装されていること
- `VITE_PERF_LOG=true` のとき、`PerfMetricsStore.getStats("heap-used-bytes")` でメモリ推移が取得できること

**依存**: 1-B

---

## Task 5: 可視化とベースライン取得

### 5-A: PerfOverlay コンポーネントの実装

**目的**: 計測値をアプリ上にオーバーレイ表示し、開発中にリアルタイムで確認できるようにする。

**対象ファイル（新規作成）**: `src/components/HUD/PerfOverlay.tsx`

**作業内容**:

- `PerfMetricsStore.subscribe()` を使って表示を更新する（1 秒ごと）
- 以下の情報を表示する:

| 項目                        | ラベル               | 表示値          |
| --------------------------- | -------------------- | --------------- |
| FPS                         | `fps`                | latest / p95    |
| Worker RTT（全衛星平均）    | `worker-rtt:*`       | avg / p95       |
| フットプリント更新時間      | `footprint-update:*` | avg             |
| キャッシュ使用量            | `cache-entries`      | count / maxSize |
| ヒープメモリ（Chrome のみ） | `heap-used-bytes`    | latest MB       |

- `VITE_PERF_LOG=true` のときのみレンダリングし、本番ビルドでは何も表示しない
- 右上固定・半透明背景・等幅フォントのシンプルなレイアウト

**成果物**:

- `PerfOverlay.tsx` が実装され、`GlobePage` または `GlobeRenderer` 内で `<PerfOverlay />` として使えること
- 開発環境で `VITE_PERF_LOG=true` を設定すると画面右上にオーバーレイが表示されること

**依存**: 1-B、3-A、3-B、3-C、4-A、4-B

---

### 5-B: ベースライン計測の実施

**目的**: 改善施策を適用する前の現状性能値を記録し、改善効果の比較基準を確立する。

**対象ファイル（新規作成）**: `docs/perf-baseline.md`

**作業内容**:

以下のシナリオを手動で実施し、結果を `docs/perf-baseline.md` に記録する。

**計測シナリオ**:

1. **シナリオ A: 初期ロード**
   - アプリを起動し、10 機の衛星が表示されるまでの時間
   - Worker RTT（最初の compute-day リクエスト）
   - 初期 FPS（地球儀が安定した後 10 秒間）

2. **シナリオ B: 日跨ぎ（キャッシュミス）**
   - タイムスライダーを翌日に移動したときの Worker RTT
   - 新しい日窓データが表示されるまでのラグ

3. **シナリオ C: 日跨ぎ（キャッシュヒット）**
   - 先読みが完了した状態でスライダーを移動
   - 期待値: キャッシュミスより大幅に短いラグ

4. **シナリオ D: 地球儀操作中の FPS**
   - マウスで高速回転・ズームを行いながらの FPS
   - 10 機全表示 + フットプリント表示状態で計測

**記録フォーマット（`docs/perf-baseline.md`）**:

```markdown
## ベースライン計測結果

計測日: YYYY-MM-DD
環境: Chrome XX / macOS XX
ビルド: development / production

| シナリオ                      | 指標               | 計測値 | 備考                |
| ----------------------------- | ------------------ | ------ | ------------------- |
| A: 初期ロード                 | Worker RTT (orbit) | XXms   | 10機平均            |
| A: 初期ロード                 | FPS (安定後)       | XX fps |                     |
| B: 日跨ぎ（キャッシュミス）   | Worker RTT         | XXms   |                     |
| C: 日跨ぎ（キャッシュヒット） | 応答時間           | XXms   |                     |
| D: 操作中 FPS                 | FPS p95            | XX fps | 10機+フットプリント |
```

**成果物**:

- `docs/perf-baseline.md` にベースライン値が記録されていること
- 各シナリオで PerfOverlay を使って取得した実測値が記載されていること

**依存**: 5-A（PerfOverlay）

---

### 5-C: ベースラインに基づく改善施策の優先付け

**目的**: ベースライン計測結果を分析し、次に実施すべき最適化施策を優先順位付きで特定する。

**対象ファイル（新規作成）**: `docs/perf-improvement-plan.md`

**作業内容**:

ベースライン結果に基づき、以下の改善施策候補を評価・優先付けして `docs/perf-improvement-plan.md` に記述する。

**改善施策候補**:

| 優先度 | 施策                                 | 期待効果               | 前提条件                       |
| ------ | ------------------------------------ | ---------------------- | ------------------------------ |
| 高     | Entity → Primitive 移行              | FPS 改善（大量描画）   | FPS p95 < 30fps の場合         |
| 高     | stepSec 可変化（カメラ高度連動）     | Worker RTT 短縮        | RTT > 500ms の場合             |
| 中     | フットプリント更新間引き             | footprint-update 削減  | 30fps 未満の場合               |
| 中     | キャッシュサイズ拡大（7 日 → 14 日） | キャッシュミス削減     | メモリ余裕がある場合           |
| 低     | TypedArray 圧縮転送                  | postMessage 転送量削減 | RTT に対する転送比率が高い場合 |

- 各施策に対してベースライン値を判断根拠として記載する
- 施策を実施する場合の具体的な変更対象ファイルと変更方針を記述する

**成果物**:

- `docs/perf-improvement-plan.md` に優先付きの改善施策が記述されていること
- 各施策の実施判断基準がベースライン数値に基づいていること

**依存**: 5-B（ベースライン計測）

---

## タスク依存関係サマリ

```
1-A (PerfLogger)
  └─ 1-B (PerfMetricsStore)
       ├─ 2-B (Worker RTT 計測)     ← 2-A (Worker 内タイミング) にも依存
       ├─ 3-A (FPS モニタリング)
       ├─ 3-B (FootprintLayer 計測)
       ├─ 3-C (SatelliteLayer 計測)
       ├─ 4-A (LRU メモリ推定)
       └─ 4-B (ヒープメモリ監視)
            └─ 5-A (PerfOverlay)
                 └─ 5-B (ベースライン計測)
                      └─ 5-C (改善施策優先付け)

2-A (Worker 内タイミング)
  └─ 2-C (ベンチマークスクリプト)
```

---

## 新規作成ファイル一覧

| ファイルパス                         | 担当タスク |
| ------------------------------------ | ---------- |
| `src/lib/perf/perf-logger.ts`        | 1-A        |
| `src/lib/perf/perf-metrics-store.ts` | 1-B        |
| `src/lib/perf/memory-monitor.ts`     | 4-B        |
| `src/components/HUD/PerfOverlay.tsx` | 5-A        |
| `scripts/bench-worker.ts`            | 2-C        |
| `docs/perf-baseline.md`              | 5-B        |
| `docs/perf-improvement-plan.md`      | 5-C        |

## 変更ファイル一覧

| ファイルパス                              | 担当タスク | 変更内容                                             |
| ----------------------------------------- | ---------- | ---------------------------------------------------- |
| `src/workers/orbit-calculator.worker.ts`  | 2-A        | `timings` フィールドの追加・計測コード挿入           |
| `src/types/worker-messages.ts`            | 2-A        | `ComputeTimings` 型・`timings` フィールドの追加      |
| `src/hooks/useWorker.ts`                  | 2-B        | RTT 計測コードの挿入                                 |
| `src/components/Globe/GlobeRenderer.tsx`  | 3-A        | FPS 計測コードの挿入                                 |
| `src/components/Globe/FootprintLayer.tsx` | 3-B        | `polygons` 計算の計測ラップ                          |
| `src/components/Globe/SatelliteLayer.tsx` | 3-C        | `sampledPosition` 計算の計測ラップ                   |
| `src/lib/cache/lru-cache.ts`              | 4-A        | `estimatedBytes` getter・`sizeOf` コールバックの追加 |

---

## 検証チェックリスト

- [ ] `VITE_PERF_LOG=false`（デフォルト）のとき計測コードが動作せず、オーバーヘッドがないこと
- [ ] `VITE_PERF_LOG=true` のとき PerfOverlay が画面右上に表示されること
- [ ] Worker RTT の計測値が `ComputeDayResponse.timings.totalMs` と整合していること（RTT >= totalMs であること）
- [ ] LRU キャッシュの `estimatedBytes` が実際のバッファサイズと一致すること（ユニットテスト）
- [ ] ベースライン計測を 3 回実施し、値のばらつきが ±10% 以内に収まること
- [ ] `scripts/bench-worker.ts` が `bun run bench` で正常終了すること
