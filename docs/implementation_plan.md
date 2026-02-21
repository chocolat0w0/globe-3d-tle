# 実装計画書

## 1. 概要

本ドキュメントは、3D地球儀・衛星軌道・撮像範囲可視化Webアプリの実装計画を定義する。要件設計書（requirements_overview.md）に基づき、段階的な実装アプローチを採用する。

## 2. 実装方針

### 2.1 段階的アプローチ

- **Phase 1**: プロジェクト基盤構築（React + Vite + TypeScript）
- **Phase 2**: Cesium基本表示（地球儀 + 自前タイル）
- **Phase 3**: 衛星軌道計算・表示（1機、メインスレッド）
- **Phase 4**: Web Worker化（SGP4計算のオフロード）
- **Phase 5**: 複数衛星対応（10機、衛星管理UI）
- **Phase 6**: タイムスライダー（1日窓、キャッシュ）
- **Phase 7**: フットプリント描画
- **Phase 8**: スワス描画
- **Phase 9**: ポリゴン描画（AOI等）
- **Phase 10**: 最適化・品質向上

### 2.2 技術スタック詳細

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "cesium": "^1.110.x",
    "resium": "^1.17.x",
    "satellite.js": "^5.x",
    "geo4326": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

## 3. ディレクトリ構成

```
globe-3d-tle/
├── docs/
│   ├── requirements_overview.md
│   ├── implementation_plan.md
│   └── api_design.md (後で作成)
├── src/
│   ├── components/
│   │   ├── Globe/
│   │   │   ├── GlobeRenderer.tsx
│   │   │   ├── BaseMapLayer.tsx
│   │   │   ├── PolygonLayer.tsx
│   │   │   ├── SatelliteLayer.tsx
│   │   │   ├── FootprintLayer.tsx
│   │   │   └── SwathLayer.tsx
│   │   ├── TimeController/
│   │   │   ├── TimeSlider.tsx
│   │   │   └── PlaybackControls.tsx
│   │   ├── Satellite/
│   │   │   ├── SatelliteList.tsx
│   │   │   └── SatelliteLegend.tsx
│   │   └── HUD/
│   │       └── InfoPanel.tsx
│   ├── workers/
│   │   └── orbit-calculator.worker.ts
│   ├── lib/
│   │   ├── tle/
│   │   │   ├── orbit.ts (SGP4ラッパー)
│   │   │   ├── coordinate.ts (座標変換)
│   │   │   └── footprint.ts (自前フットプリント計算)
│   │   ├── cesium/
│   │   │   ├── entity-utils.ts
│   │   │   └── polygon-utils.ts
│   │   └── cache/
│   │       └── lru-cache.ts
│   ├── hooks/
│   │   ├── useTime.ts
│   │   ├── useSatellites.ts
│   │   ├── useOrbitData.ts
│   │   └── useWorker.ts
│   ├── types/
│   │   ├── satellite.ts
│   │   ├── orbit.ts
│   │   ├── polygon.ts
│   │   └── worker-messages.ts
│   ├── data/
│   │   └── sample-tle.json
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
│   └── tiles/ (自前タイル格納)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc
└── CLAUDE.md
```

## 4. フェーズ別実装計画

### Phase 1: プロジェクト基盤構築

**目標**: 開発環境のセットアップとプロジェクトの骨格作成

**タスク**:

1. Vite + React + TypeScript プロジェクト初期化
2. package.json依存関係の設定
3. TypeScript設定（tsconfig.json）
4. ESLint + Prettier設定
5. Vitest設定（テストフレームワーク）
6. ディレクトリ構成の作成
7. 基本的なApp.tsxとmain.tsxの作成

**成果物**:

- 動作するReactアプリ（Hello World）
- npm run dev で開発サーバーが起動
- npm test でテストが実行可能

**所要目安**: 1-2日

---

### Phase 2: Cesium基本表示

**目標**: 3D地球儀の表示と自前タイルの適用

**タスク**:

1. Cesium + Resium のインストール
2. Vite設定でCesiumアセットを正しく扱う設定
3. GlobeRenderer.tsx の実装
   - Cesium.Viewer の初期化
   - 基本的なカメラ設定
   - 地球儀の回転・ズーム・パン操作
4. BaseMapLayer.tsx の実装
   - 自前タイルのImageryLayer設定
   - XYZ/TMS形式対応
5. 基本的なHUD（座標表示）

**成果物**:

- 3D地球儀が表示され、マウス操作で回転・ズーム可能
- 自前タイル（または仮タイル）が地球儀に貼られている

**技術メモ**:

```typescript
// vite.config.ts でCesiumプラグイン設定
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  plugins: [react(), cesium()],
});
```

自前タイル URL
`https://osm.tellusxdp.com/osm/{z}/{x}/{y}.png`

**所要目安**: 2-3日

---

### Phase 3: 衛星軌道計算・表示（1機）

**目標**: TLEから1機の衛星軌道を計算し、地球儀上に表示

**タスク**:

1. satellite.js のインストール
2. types/satellite.ts, types/orbit.ts の定義
3. lib/tle/orbit.ts の実装
   - TLEパース
   - SGP4計算（時刻列→ECI座標列）
   - ECI→ECEF変換
4. lib/tle/coordinate.ts の実装
   - 座標変換ユーティリティ
5. SatelliteLayer.tsx の実装（1機版）
   - 軌道ライン（Polyline）描画
   - 衛星動点（Point Entity）描画
   - SampledPositionProperty で補間
6. サンプルTLEデータの用意
7. 時刻固定で1日分の軌道を表示

**成果物**:

- 1機の衛星軌道が地球儀上に線で表示される
- 衛星の現在位置がマーカーで表示される

**技術メモ**:

```typescript
// SGP4計算の基本フロー
import * as satellite from "satellite.js";

const satrec = satellite.twoline2satrec(tle1, tle2);
const positionAndVelocity = satellite.propagate(satrec, date);
// ECI座標を取得し、ECEFへ変換
```

**所要目安**: 3-4日

---

### Phase 4: Web Worker化

**目標**: SGP4計算をWorkerへ移行し、UIスレッドの負荷を軽減

**タスク**:

1. types/worker-messages.ts の定義
   - ComputeDayRequest
   - ComputeDayResponse
   - WorkerError
2. workers/orbit-calculator.worker.ts の実装
   - メッセージハンドラ
   - SGP4計算（1日窓、stepSec=30）
   - TypedArray（Float64Array/Float32Array）で結果を返却
   - Transferable対応
3. hooks/useWorker.ts の実装
   - Worker生成・破棄
   - postMessage/onmessage ラッパー
4. hooks/useOrbitData.ts の実装
   - Workerへ計算要求
   - キャンセル/競合対策（requestId管理）
5. SatelliteLayer.tsx の修正
   - Workerから返却されたデータを使用

**成果物**:

- 軌道計算がWorkerで実行され、UIがフリーズしない
- TypedArrayで効率的にデータ転送

**技術メモ**:

```typescript
// Transferable使用例
const orbit = { timesMs: timesBuffer, ecef: ecefBuffer };
postMessage(
  { type: 'computed-day', orbit, ... },
  [timesBuffer, ecefBuffer]
);
```

**所要目安**: 3-4日

---

### Phase 5: 複数衛星対応（10機）

**目標**: 10機の衛星を同時表示し、衛星管理UIを実装

**タスク**:

1. types/satellite.ts の拡張
   - Satellite型（id, name, tle, color, visible等）
2. hooks/useSatellites.ts の実装
   - 衛星リストの状態管理
   - 表示ON/OFF
   - 選択状態
3. SatelliteList.tsx の実装
   - 10機のリスト表示
   - チェックボックスで表示切替
   - 色の表示
4. SatelliteLegend.tsx の実装
   - 凡例表示
5. SatelliteLayer.tsx の修正
   - 複数衛星のループ処理
   - 色ごとのEntity生成
6. サンプルTLEデータ（10機分）の用意
7. カメラ追尾機能（選択衛星を追従）

**成果物**:

- 10機の衛星が同時に表示される
- UIで表示切替が可能
- 選択した衛星をカメラが追尾

**所要目安**: 3-4日

---

### Phase 6: タイムスライダー

**目標**: 時刻操作と1日窓のキャッシュ機構

**タスク**:

1. hooks/useTime.ts の実装
   - 現在時刻の状態管理
   - UTC基準
   - 再生/停止/速度倍率
2. TimeSlider.tsx の実装
   - スライダーUI（-?日〜+14日）
   - 時刻ジャンプ
   - 日付境界検知
3. PlaybackControls.tsx の実装
   - 再生/停止ボタン
   - 速度倍率選択
4. lib/cache/lru-cache.ts の実装
   - LRUキャッシュ（前後3日分）
   - key: `${satelliteId}:${dayStartMs}:${stepSec}`
5. 先読み機能
   - 表示日の前後1日をバックグラウンド生成
6. useOrbitData.ts の修正
   - キャッシュ統合
   - 日跨ぎ時の窓差し替え

**成果物**:

- タイムスライダーで時刻を操作可能
- 同一日内はスムーズに追従
- 日跨ぎ時も待ち時間が少ない（キャッシュヒット）

**技術メモ**:

- dayStartMs は UTC 00:00 に丸める
- 同一日内は Cesium.Clock 操作で対応
- 日跨ぎは新しい1日窓データへの差し替え

**所要目安**: 4-5日

---

### Phase 7: フットプリント描画

**目標**: 撮像範囲（フットプリント）の地表ポリゴン表示

**タスク**:

1. geo4326 のインストール
   - npm install geo4326
2. lib/tle/footprint.ts の実装
   - geo4326の footprint 関数を使用
   - 入力: TLE、時刻、FOV、offnadir角
   - 出力: 地表ポリゴン（lon/lat）
   - dateline跨ぎは geo4326 が自動処理
3. types/worker-messages.ts の拡張
   - footprintParams追加（fov, offnadir等）
   - FlatRings型定義
4. orbit-calculator.worker.ts の修正
   - geo4326でフットプリント計算を統合
   - サンプル列として出力（TypedArray）
5. FootprintLayer.tsx の実装
   - 現在時刻に対応するフットプリントを表示
   - サンプル参照で追従
   - Cesium.Entity としてポリゴン描画
6. 衛星ごとのフットプリント表示ON/OFF

**成果物**:

- 衛星の撮像範囲が地球儀上にポリゴンで表示される
- 時刻に追従してフットプリントが更新される
- dateline跨ぎで描画破綻しない

**技術メモ**:

```typescript
// geo4326でのフットプリント計算例
import { footprint } from 'geo4326/satellite';

const result = footprint(tle1, tle2, date, {
  fov: [30, 30], // [クロストラック, アロングトラック]度
  offnadir: 0, // オフナディア角（度）
  insert: 10 // エッジ補間点数
});
// result: [[[lon, lat], [lon, lat], ...]] 形式
```

- geo4326はsatellite.jsに依存しているため統合が容易
- dateline跨ぎは自動で処理される
- MITライセンス（商用利用可能）

**所要目安**: 3-4日（geo4326使用により簡略化）

---

### Phase 8: スワス描画

**目標**: 1日窓の掃引範囲（スワス）の帯状ポリゴン表示

**タスク**:

1. lib/tle/footprint.ts の拡張
   - geo4326の accessArea 関数を使用（推奨）
   - または: subSatelliteTrack で軌跡取得→各点でfootprint計算→結合
2. types/worker-messages.ts の拡張
   - swathParams追加（roll角等）
3. orbit-calculator.worker.ts の修正
   - スワス計算を統合
   - 窓単位（1件）として出力
4. SwathLayer.tsx の実装
   - 窓単位の帯状ポリゴンを表示
   - 窓切替時のみ差し替え
   - Cesium.Entity としてポリゴン描画
5. 衛星ごとのスワス表示ON/OFF

**成果物**:

- 1日窓の掃引範囲が帯状ポリゴンで表示される
- 窓切替時に正しく差し替わる

**技術メモ**:

```typescript
// geo4326でのスワス計算例
import { accessArea } from 'geo4326/satellite';

const swath = accessArea(tle1, tle2, startDate, endDate, {
  roll: 30, // 最大ロール角（度）
  split: 360 // 分割数
});
// swath: LinearRing配列（複数ポリゴン）
```

- geo4326のaccessArea関数が機体姿勢制御を考慮した観測可能範囲を計算
- dateline跨ぎは自動処理
- 計算量が大きいためWorkerでの実行必須

**所要目安**: 3-4日（geo4326使用により簡略化）

---

### Phase 9: AOI描画ツール

**目標**: ユーザーが地球儀上で任意のAOI（関心領域）を1つ描画・編集できる機能の実装

**制約**:

- AOIは同時に1つのみ（新しく描画すると前のAOIはクリアされる）
- AOIの種別: 閉じたポリゴン または ポイント
- **描画モード中は時刻アニメーションを一時停止する**（地球の自転で地点がずれないようにするため）

**タスク**:

1. types/polygon.ts の定義
   - `AoiPoint`: `{ type: "Point"; coordinate: [lon, lat] }`
   - `AoiPolygon`: `{ type: "Polygon"; coordinates: [lon, lat][] }` （GeoJSON準拠）
   - `Aoi`: `AoiPoint | AoiPolygon | null`
2. hooks/useAoi.ts の実装
   - AOI状態管理（`Aoi | null`）
   - 描画モード管理（`"point" | "polygon" | "none"`）
   - `setAoi`, `clearAoi`, `setMode` 操作
3. AOI描画UIパネルの実装
   - 「ポイント」「ポリゴン」「GeoJSON読込」「クリア」ボタン
   - 現在のモード/AOI種別を表示
4. 描画モード中の時刻一時停止
   - 描画モードに入ったとき: `viewer.clock.shouldAnimate = false`
   - 描画モードを抜けたとき（確定・キャンセル・クリア）: 元の状態を復元
   - `useTime` フックと連携し、一時停止前の `shouldAnimate` 状態を保存しておく
5. Cesiumでのインタラクティブ描画実装
   - **ポイントモード**: クリックで1点を配置
   - **ポリゴンモード**: クリックで頂点を追加、ダブルクリックまたは「確定」ボタンで閉じる
     - ゴムバンドライン（仮線）を `MOUSE_MOVE` イベントで更新（毎フレームではない）
     - 頂点は3点以上で確定可能
6. GeoJSON読み込み機能
   - ファイル選択（`<input type="file">`）でGeoJSONを読み込む
   - `Feature<Point>` または `Feature<Polygon>` の1件目を採用
   - 不正なファイルはエラーメッセージを表示
7. PolygonLayer.tsx の実装
   - `Aoi` を受け取り Cesium.Entity として描画
   - ポイント: BillboardまたはPointPrimitive
   - ポリゴン: 塗りつぶし + アウトライン

**成果物**:

- 地球儀上でポイントをクリックして配置できる
- 地球儀上でクリックを繰り返してポリゴンを描画し、確定できる
- 描画モード中は時刻が一時停止し、確定/キャンセル後に元の状態に戻る
- GeoJSONファイルを読み込んでAOIを表示できる
- 新しく描画すると前のAOIはクリアされる（1つのみ制約）
- 「クリア」ボタンでAOIを削除できる

**技術メモ**:

```typescript
// Cesiumでの地表クリック取得
viewer.screenSpaceEventHandler.setInputAction((e) => {
  const cartesian = viewer.scene.globe.pick(
    viewer.camera.getPickRay(e.position)!, scene
  );
  if (cartesian) {
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    // ...頂点追加
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// ゴムバンドライン: 毎フレームではなく MOUSE_MOVE イベントで更新
viewer.screenSpaceEventHandler.setInputAction((e) => {
  const cartesian = viewer.scene.globe.pick(...);
  if (cartesian) rubberbandEntity.polyline.positions = [...vertices, cartesian];
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// 描画モード開始/終了時の時刻一時停止
const prevShouldAnimate = viewer.clock.shouldAnimate;
viewer.clock.shouldAnimate = false;          // 描画開始
// ...描画処理...
viewer.clock.shouldAnimate = prevShouldAnimate; // 描画終了（確定/キャンセル）
```

- GeoJSON読み込みは `FileReader` + `JSON.parse` でブラウザ完結
- dateline跨ぎ入力の考慮は将来課題とする（Phase 9では非対応と明記）

**所要目安**: 3-4日

---

### Phase 10: 最適化・品質向上

**目標**: パフォーマンス最適化とエラー処理の強化

**タスク**:

1. パフォーマンス計測
   - 処理時間ログ
   - メモリ使用量モニタリング
2. stepSec調整
   - カメラ高度による可変stepSec検討
3. エラー処理
   - TLE無効時のエラー表示
   - Worker計算失敗時のリトライ
   - ネットワークエラー処理
4. ログ機構
   - デバッグログ
   - エラーログ
5. 単体テストの拡充
   - 座標変換ロジックのテスト
   - キャッシュロジックのテスト
   - Workerメッセージのテスト
6. E2Eテスト
   - Playwright等で基本操作テスト
7. ドキュメント整備
   - README.md
   - APIドキュメント

**成果物**:

- 安定したアプリケーション
- 適切なエラーメッセージ
- テストカバレッジ向上

**所要目安**: 5-7日

---

## 5. テスト戦略

### 5.1 単体テスト（Vitest）

**対象**:

- lib/tle/orbit.ts（SGP4計算、座標変換）
- lib/tle/coordinate.ts（座標変換ユーティリティ）
- lib/tle/footprint.ts（フットプリント計算）
- lib/cache/lru-cache.ts（キャッシュロジック）
- hooks（カスタムフック）

**方針**:

- 既知のTLEデータで期待位置と照合
- 境界値テスト（dateline跨ぎ、極地方）
- エラーケース

### 5.2 統合テスト（React Testing Library）

**対象**:

- コンポーネント間の連携
- 状態管理フロー
- Worker通信

### 5.3 E2Eテスト（Playwright）

**対象**:

- 地球儀の基本操作（回転、ズーム）
- タイムスライダー操作
- 衛星表示切替
- フットプリント/スワス表示

## 6. リスク管理

### 6.1 技術リスク

| リスク                       | 影響               | 対策                           |
| ---------------------------- | ------------------ | ------------------------------ |
| Cesiumのビルドサイズが大きい | 初期ロード遅延     | コード分割、遅延ロード         |
| Worker通信のオーバーヘッド   | パフォーマンス低下 | TypedArray + Transferable使用  |
| dateline跨ぎの描画破綻       | 表示不具合         | MultiPolygon分割を契約化       |
| TLE予測誤差                  | 位置精度問題       | 仕様として明記、更新頻度要件化 |

### 6.2 スケジュールリスク

| リスク                     | 対策                           |
| -------------------------- | ------------------------------ |
| フットプリント計算の複雑さ | 簡易版から段階的に実装         |
| Cesium習得コスト           | 公式ドキュメント・サンプル活用 |
| Worker実装の複雑さ         | 小さく始めて段階的に拡張       |

## 7. 受け入れ基準（再掲）

- [ ] 10機表示 + 1日窓（step=30秒）で地球回転/ズームが滑らか
- [ ] スライダーで日付切替してもUIがフリーズしない
- [ ] 自前タイルが正しく表示される
- [ ] 地球儀上でポイント・ポリゴンをインタラクティブに描画できる
- [ ] GeoJSONファイルを読み込んでAOIを表示できる
- [ ] AOIは1つのみ保持され、新規描画・クリアが正しく動作する
- [ ] TLE軌道ラインと衛星動点が時刻に追従する
- [ ] フットプリントが時刻追従し、dateline跨ぎで破綻しない
- [ ] スワスが1日窓に対応して表示され、窓切替で差し替わる

## 8. 全体スケジュール概算

| Phase                      | 所要目安 | 累積 |
| -------------------------- | -------- | ---- |
| Phase 1                    | 1-2日    | 2日  |
| Phase 2                    | 2-3日    | 5日  |
| Phase 3 (衛星軌道)         | 3-4日    | 9日  |
| Phase 4 (Worker化)         | 3-4日    | 13日 |
| Phase 5 (複数衛星)         | 3-4日    | 17日 |
| Phase 6 (タイムスライダー) | 4-5日    | 22日 |
| Phase 7 (フットプリント)   | 3-4日    | 26日 |
| Phase 8 (スワス)           | 3-4日    | 30日 |
| Phase 9 (AOI描画ツール)    | 3-4日    | 34日 |
| Phase 10                   | 5-7日    | 41日 |

**合計**: 約6-8週間（バッファ含む）

**注**: Phase 7-8でgeo4326ライブラリを使用することで、自前実装と比較して約1週間の短縮を見込む

## 9. 次のステップ

1. Phase 1の実装開始
2. 各Phase完了時に受け入れ基準を確認
3. 週次で進捗レビュー
4. 必要に応じて計画を調整
