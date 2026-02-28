# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Git Operations

When performing git operations (push, pull, pr create, etc.), follow these rules:

1. **Authentication:**
   - Always use the environment variable `GH_TOKEN` for authentication.
   - Do NOT embed tokens directly in remote URLs.
   - At the beginning of a session or before the first git operation, ensure the credential helper is configured by running:
     ```bash
     git config --global credential.helper "!gh auth setup-git"
     ```

2. **Workflow:**
   - Prefer using the `gh` CLI for GitHub-specific tasks (like PR creation) as it automatically picks up `GH_TOKEN`.

## プロジェクト概要

3D地球儀上に衛星軌道とその撮像範囲を可視化するWebアプリケーション。TLE（Two-Line Element）から衛星の軌道を計算し、約10機の衛星を同時表示。地球儀上にフットプリント（撮像範囲）とスワス（帯状掃引範囲）を描画する。AOI（関心領域）のインタラクティブ描画・GeoJSON読込もサポート。

詳細な要件は `docs/requirements_overview.md` を参照。

## 技術スタック

- **React 19.2.4 + TypeScript**: UIフレームワーク
- **Cesium 1.138.0 + Resium 1.19.4**: 3D地球儀エンジン + React統合
- **satellite.js 6.0.2**: TLE計算（SGP4、型定義内包）
- **geo4326 1.7.1**: フットプリント・スワス計算（satellite.jsベース）
- **Web Worker**: 重計算のオフロード（WorkerPool、最大6ワーカー）

## 時間モデル（重要）

- **4時間窓（rolling window）方式**: 4時間単位に切り詰めた窓で軌道・フットプリント・スワスを計算
  - `WINDOW_MS = 4 * 3600 * 1000`（4時間 = 14,400,000 ms）
  - 窓開始: `Math.floor(now / WINDOW_MS) * WINDOW_MS`
- **時刻はUTCベース**: 内部計算・キーはすべてUTC（UI表示のみローカルタイム可）
- **窓跨ぎ時の差し替え**: スライダーで窓境界を跨ぐと、次の4時間窓データを取得（キャッシュ優先）
- **サンプリング**: stepSec はカメラ高度に応じて動的変更（`getStepSecForHeight`）、初期値 5 秒

## アーキテクチャの要点

### コンポーネント構成

```
App
├── GlobeRenderer (Cesium Viewer生成・破棄、FPS監視、stepSec動的調整)
│   ├── BaseMapLayer (自前XYZタイル)
│   ├── SatelliteLayer × 10 (衛星エンティティ/軌道ライン)
│   ├── FootprintLayer × 10 (撮像範囲フットプリント)
│   ├── SwathLayer × 10 (スワス帯状ポリゴン)
│   └── AoiLayer (AOI描画・表示・インタラクション)
├── TimeController (タイムスライダー、再生/停止)
├── right-panel-stack
│   ├── InfoPanel (軌道モード・夜間シェード切替)
│   └── AoiPanel (AOI描画モード、GeoJSON読込)
├── PerfOverlay (FPS・メモリ・Worker RTT表示)
└── SatelliteList (10機の表示切替、フットプリント/スワス切替)
```

### データフロー

1. TLE + 撮像パラメータ（off-nadir 角度範囲等）を入力
2. UIで表示対象衛星・時刻（T0）を決定
3. Main → Worker へ「4時間窓計算要求」（軌道/フットプリント/スワス）
4. Worker で SGP4 + geo4326フットプリント計算を実行
5. TypedArray（Transferable）で結果を返却（計算時間 timings 付き）
6. Main で Cesium へ反映（動点 + 軌道 + ポリゴン）
7. 同一窓内はサンプル参照で追従、窓跨ぎ時は差し替え

### Web Worker メッセージ仕様

#### Main → Worker: compute-day

```ts
interface ComputeDayRequest {
  type: "compute-day";
  requestId: string;
  satelliteId: string;
  tle1: string;
  tle2: string;
  dayStartMs: number;        // UTC epoch ms（4時間窓開始）
  durationMs: number;        // WINDOW_MS = 14400000 (4h)
  stepSec: number;           // カメラ高度依存の動的値（例: 5秒）
  outputs: { orbit: boolean; footprint: boolean; swath: boolean };
  footprintParams?: FootprintParams;  // off-nadir 角度範囲等
  swathParams?: SwathParams;
}
```

#### Worker → Main: computed-day

```ts
interface ComputeDayResponse {
  type: "computed-day";
  requestId: string;
  satelliteId: string;
  dayStartMs: number;
  stepSec: number;
  orbit?: {
    timesMs: ArrayBuffer;   // Float64Array
    ecef: ArrayBuffer;      // Float32Array [x,y,z,...] meters
  };
  footprint?: {
    timesMs: ArrayBuffer;   // Float64Array
    flat: FlatRings;        // lon/lat ポリゴン配列
    timeSizes: ArrayBuffer; // Int32Array: 各タイムステップのポリゴン数
  };
  swath?: {
    flat: FlatRings;        // 窓単位（1件）の帯状ポリゴン
  };
  timings?: ComputeTimings; // orbitMs, footprintMs, swathMs, totalMs
}
```

- **FlatRings**: `{ rings: ArrayBuffer, offsets: ArrayBuffer, counts: ArrayBuffer }`
- **重要**: postMessage時は Transferable を使用（メモリコピー回避）

## 地表ポリゴンの契約（重要）

### フットプリント

- 各サンプル時刻 `t` に対して地表面上のポリゴン（lon/lat度）を返す
- dateline（±180°）跨ぎがある場合は **分割してMultiPolygon相当** で返す（描画破綻を回避）
- `timeSizes[i]` で i 番目のタイムステップのポリゴン数（dateline分割で 1 または 2）

### スワス

- 4時間窓（[T0, T0+4h]）の掃引範囲を帯状ポリゴンとして返す
- 窓単位で静的に描画し、窓切替時のみ差し替え（時刻ごとの更新なし）

## キャッシュ / 先読み

### LRUキャッシュ

- key: `${satelliteId}:${dayStartMs}:${stepSec}`
- フットプリントは `${paramsKey}` も付加（JSON化した FootprintParams）
- 容量: 各30エントリ（10機 × 約7窓 = 70エントリ相当）
- disabled 衛星のキャッシュは 5秒デバウンスで解放

### 先読み（プリフェッチ）

- 表示要求 W が来たら、バックグラウンドで W-1（前窓）、W+1（後窓）を生成
- 既にキャッシュ済みの窓はスキップ

## パフォーマンス設計

### stepSec の動的調整

- `getStepSecForHeight(height)` でカメラ高度から自動計算
- 近くにズームするほど細かいサンプリング（点密度増加）
- 1秒デバウンスで不要な再計算を防止

### 最適化の優先順位

1. **Worker化**: SGP4計算をUIスレッドから隔離（必須）
2. **TypedArray + Transferable**: postMessageのメモリコピー回避（必須）
3. **LRUキャッシュ**: 窓跨ぎ時の再計算を回避（必須）
4. **先読み**: スライダー操作時の待ち時間削減（実装済み）
5. **Entity → Primitive移行**: 100機以上の大規模表示時に検討（将来）

### パフォーマンス監視（`lib/perf/`）

- `perf-logger`: ラベル付きタイマー記録
- `perf-metrics-store`: メトリクス集約（FPS・Worker RTT等）
- `memory-monitor`: メモリ使用量追跡
- **有効化**: `VITE_PERF_LOG=true` 環境変数で FPS 監視 + PerfOverlay 表示

## リスク / 留意点

### TLE予測誤差

- TLEは時間が経つほど誤差が増える
- 2週間先は概略として扱い、重要用途ならTLE更新頻度を要件化

### dateline跨ぎ（描画破綻の主要因）

- フットプリント/スワスは±180°跨ぎが起きやすい
- MultiPolygon相当（分割済み）での入力を許容する契約を明確化

### Worker通信・メモリ

- オブジェクト配列での postMessage は避け、TypedArray + Transferable を使用
- キャッシュ容量が膨らみすぎないようLRUで制御

### 描画性能

- Entityの大量生成はボトルネックになり得る（将来はPrimitiveへ）
- stepSec の動的調整で高度に応じた適切な密度を実現

## 座標系の理解（参考）

- **ECI** (Earth-Centered Inertial): 慣性座標系（SGP4出力）
- **ECEF** (Earth-Centered Earth-Fixed): 地球固定座標系（Cesiumで使用）
- **LLA** (Latitude, Longitude, Altitude): 緯度経度高度
- 変換ロジックは satellite.js + Cesium.Transforms を活用

## 受け入れ基準

- 10機表示 + 4時間窓で地球回転/ズームが滑らか
- スライダーで窓切替してもUIがフリーズしない
- 自前タイルが正しく表示される
- AOIポリゴンのインタラクティブ描画・GeoJSON読込ができる
- TLE軌道ラインと衛星動点が時刻に追従する
- フットプリントが時刻追従し、dateline跨ぎで破綻しない
- スワスが4時間窓に対応して表示され、窓切替で正しく差し替わる
- カメラ高度に応じて stepSec が自動調整される
