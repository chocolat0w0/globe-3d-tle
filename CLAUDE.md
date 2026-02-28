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

## プロジェクト概要

3D地球儀上に衛星軌道とその撮像範囲を可視化するWebアプリケーション。TLE（Two-Line Element）から衛星の軌道を計算し、約10機の衛星を同時表示。地球儀上にフットプリント（撮像範囲）とスワス（帯状掃引範囲）を描画する。

詳細な要件は `docs/requirements_overview.md` を参照。

## 技術スタック

- **React + TypeScript**: UIフレームワーク
- **CesiumJS**: 3D地球儀エンジン
- **Resium**: React統合（任意、Cesiumの参照/初期化は1箇所に集約）
- **satellite.js**: TLE計算（SGP4）
- **geo4326**: フットプリント・スワス計算（satellite.jsベース）
- **Web Worker**: 重計算のオフロード

## 時間モデル（重要）

- **1日窓（rolling window）方式**: 常に1日分（24h）の軌道・フットプリント・スワスを表示
- **時刻はUTCベース**: 内部計算・キーはすべてUTC（UI表示のみローカルタイム可）
- **日跨ぎ時の窓差し替え**: スライダーで日付境界を跨ぐと、次の1日窓データを取得（キャッシュ優先）
- **サンプリング**: stepSec=30秒（初期値）で1日あたり2,880点/衛星

## アーキテクチャの要点

### コンポーネント構成

```
App
└── GlobePage
    ├── GlobeRenderer (Cesium Viewerの生成・破棄)
    │   ├── BaseMapLayer (自前タイル)
    │   ├── PolygonLayer (AOI等のポリゴン)
    │   ├── SatelliteLayer (衛星エンティティ/軌道ライン)
    │   ├── FootprintLayer (撮像範囲フットプリント)
    │   └── SwathLayer (スワス帯状ポリゴン)
    ├── TimeController (タイムスライダー、再生/停止)
    ├── SatelliteList/Legend (10機の表示切替、色、選択)
    └── HUD (現在時刻、TLE更新日時等)
```

### データフロー

1. TLE + 撮像パラメータ（姿勢、FOV等）を入力
2. UIで表示対象衛星・時刻（T0）を決定
3. Main → Worker へ「1日窓計算要求」（軌道/フットプリント/スワス）
4. Worker で SGP4 + 自前フットプリント計算を実行
5. TypedArray（Transferable）で結果を返却
6. Main で Cesium へ反映（動点 + 軌道 + ポリゴン）
7. 同一日内はサンプル参照で追従、日跨ぎ時は窓差し替え

### Web Worker メッセージ仕様

#### Main → Worker: compute-day

```ts
type ComputeDayRequest = {
  type: "compute-day";
  requestId: string;
  satelliteId: string;
  tle1: string;
  tle2: string;
  dayStartMs: number; // UTC epoch ms
  durationMs: number; // 86400000 (24h)
  stepSec: number; // 30
  outputs: { orbit: true; footprint: true; swath: true };
  footprintParams?: unknown; // 姿勢/FOV等
  swathParams?: unknown;
};
```

#### Worker → Main: computed-day

```ts
type ComputeDayResponse = {
  type: "computed-day";
  requestId: string;
  satelliteId: string;
  dayStartMs: number;
  stepSec: number;
  orbit?: {
    timesMs: ArrayBuffer; // Float64Array
    ecef: ArrayBuffer; // Float32Array [x,y,z,...] meters
  };
  footprint?: {
    timesMs: ArrayBuffer; // Float64Array
    flat: FlatRings; // lon/lat ポリゴン配列
  };
  swath?: {
    flat: FlatRings; // 窓単位（1件）の帯状ポリゴン
  };
};
```

- **FlatRings**: `{ rings: ArrayBuffer, offsets: ArrayBuffer, counts: ArrayBuffer }`
- **重要**: postMessage時は Transferable を使用（メモリコピー回避）

## 地表ポリゴンの契約（重要）

### フットプリント

- 各サンプル時刻 `t` に対して地表面上のポリゴン（lon/lat度）を返す
- dateline（±180°）跨ぎがある場合は **分割してMultiPolygon相当** で返す（描画破綻を回避）

### スワス

- 1日窓（[T0, T0+24h]）の掃引範囲を帯状ポリゴンとして返す
- 窓単位で静的に描画し、窓切替時のみ差し替え（時刻ごとの更新なし）

## キャッシュ / 先読み

### LRUキャッシュ

- key: `${satelliteId}:${dayStartMs}:${stepSec}`
- value: orbit / footprint / swath の TypedArray
- 推奨保持量: 前後3日（計7日）程度

### 先読み（プリフェッチ）

- 表示要求 D が来たら、バックグラウンドで D+1（翌日）、D-1（前日）を生成
- スライダーが単調増加する利用が多い場合は D+1 を優先

## パフォーマンス設計

### 初期推奨値

- `stepSec = 30` 秒（1日あたり2,880点/衛星）
- 10機 → 28,800点/日（現実的な負荷）
- Worker + キャッシュでスムーズな操作を実現

### 最適化の優先順位

1. **Worker化**: SGP4計算をUIスレッドから隔離（必須）
2. **TypedArray + Transferable**: postMessageのメモリコピー回避（必須）
3. **LRUキャッシュ**: 日跨ぎ時の再計算を回避（必須）
4. **先読み**: スライダー操作時の待ち時間削減（推奨）
5. **Entity → Primitive移行**: 100機以上の大規模表示時に検討（将来）

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
- stepSec/簡略化の調整余地を確保

## 座標系の理解（参考）

- **ECI** (Earth-Centered Inertial): 慣性座標系（SGP4出力）
- **ECEF** (Earth-Centered Earth-Fixed): 地球固定座標系（Cesiumで使用）
- **LLA** (Latitude, Longitude, Altitude): 緯度経度高度
- 変換ロジックは satellite.js + Cesium.Transforms を活用

## 受け入れ基準

- 10機表示 + 1日窓で地球回転/ズームが滑らか
- スライダーで日付切替してもUIがフリーズしない
- 自前タイルが正しく表示される
- AOIポリゴンの描画とホバー/選択の強調ができる
- TLE軌道ラインと衛星動点が時刻に追従する
- フットプリントが時刻追従し、dateline跨ぎで破綻しない
- スワスが1日窓に対応して表示され、窓切替で正しく差し替わる
