# 3D地球儀・衛星軌道・撮像範囲可視化 Webアプリ 要件設計 / 概要設計（React前提）

## 1. 目的 / 背景

- Webブラウザ上で3D地球儀を操作（回転・ズーム・パン）し、地図（自前タイル）を表示する
- 地球儀上に任意ポリゴン（AOI等）を描画・強調表示する
- 衛星のTwo-Line Element（TLE）から軌道を計算し、地球儀上に描画する
- 衛星の姿勢・センサーFOV等のパラメータから算出した **撮像範囲（フットプリント）** を地球儀表面に描画する
- フットプリントの時間窓における **スワス（帯状ポリゴン）** を地球儀表面に描画する
- 衛星は約10機同時表示
- 軌道の「同時表示」は1日分だが、タイムスライダーにより最大2週間先まで時刻を進められる（表示窓は日単位で差し替え）

---

## 2. スコープ

### 2.1 対象（実装対象）

- 3D地球儀表示（地図タイル貼り付け）
- 任意ポリゴン描画・強調（ホバー/選択など）
- TLE（SGP4）による衛星位置・軌道の計算と描画
- タイムスライダー（任意時刻へジャンプ、日単位での表示窓切替）
- 撮像範囲（フットプリント）描画（計算済みの地表ポリゴンを表示）
- スワス（帯状ポリゴン）描画（計算済みの地表ポリゴンを表示）
- パフォーマンス設計（Web Worker、キャッシュ、先読み）

### 2.2 非対象（初期ではやらない / 将来検討）

- 3D地形（terrain）や建物などの高度データ（地形表現は必要なら後から拡張）
- オフライン対応（PWA/Service Worker）
- **センサーフラスタム等の3D視野体の描画（追加要件）**
- 100機以上の大規模同時表示（将来はPrimitive最適化を検討）

---

## 3. 要件定義

### 3.1 必須要件

1. 3Dで地球を回転・拡大縮小できること
2. Webブラウザで動作すること
3. 地球儀上に地図が表示されていること（地図タイルは自前）
4. 地球儀上に任意ポリゴンを描画し、強調できること
5. TLEから衛星軌道を計算し、地球儀上に描画できること
6. 姿勢・FOV等のパラメータから算出した **撮像範囲（フットプリント）** を地球儀表面に描画できること
7. フットプリントの時間窓における **スワス（帯状ポリゴン）** を地球儀表面に描画できること

### 3.2 希望要件

- 無料かつ商用利用可能な構成（ライブラリのOSSライセンスを優先）
  - 地図データは自前タイルのため外部タイル課金依存を避ける

### 3.3 非機能要件（パフォーマンス/UX）

- 衛星10機 + 1日分軌道表示を、通常操作（ドラッグ回転・ズーム・スライダー操作）でカクつかないこと
- スライダー操作時にUIがフリーズしないこと（計算はWeb Workerへオフロード）
- 表示窓（1日）を頻繁に切り替えても体感待ちが少ないこと（LRUキャッシュ + 先読み）
- 撮像範囲（フットプリント）/スワス表示の更新により地球儀操作が阻害されないこと

---

## 4. 技術選定（結論）

### 4.1 推奨スタック

- フロント：React + TypeScript
- 3D地球儀エンジン：CesiumJS
- React統合：Resium（任意。採用する場合もCesiumの参照/初期化は1箇所に集約）
- TLE計算：satellite.js（SGP4）
- 重計算：Web Worker（Dedicated Worker）
- フットプリント/スワス計算：**自前ロジック**（本アプリ側は「地表ポリゴンを描画」までを責務とする）

### 4.2 選定理由（要点）

- 「地球周回（高度付き）」の軌道表現が自然で、衛星可視化ユースケースに最短
- 地図タイルが自前のため、外部地図課金・TOS依存を回避しやすい
- フットプリント/スワスは「地球儀表面のポリゴン表示」で足りるため、CesiumのPolygon描画と相性が良い
- 10機・1日窓は現実的な負荷で、Worker＋キャッシュで十分スムーズにできる

---

## 5. 概要アーキテクチャ

### 5.1 コンポーネント構成（UI/描画）

- App
  - GlobePage
    - GlobeRenderer（Cesium Viewerの生成・破棄・基本設定）
      - BaseMapLayer（自前タイルのimagery設定）
      - PolygonLayer（AOI等のポリゴン描画・強調）
      - SatelliteLayer（衛星エンティティ/ポリライン管理）
      - FootprintLayer（撮像範囲フットプリントの描画・強調）
      - SwathLayer（スワス（帯状ポリゴン）の描画・強調）
    - TimeController（タイムスライダー、再生/停止、日窓切替の制御）
    - SatelliteList/Legend（10機の表示切替、色、選択状態）
    - HUD（現在時刻、TLE更新日時、座標表示等）

### 5.2 データフロー（TLE/撮像範囲→表示）

1. 入力取得
   - TLE（API / 設定 / ファイル等）
   - 撮像範囲計算に必要な追加パラメータ（姿勢、FOV、運用モード等）
2. UIで表示対象衛星・時刻（T0）を決定
3. Main → Workerへ「1日窓計算要求」
   - 軌道（SGP4）
   - フットプリント（自前計算結果を地表ポリゴンとして出力）
   - スワス（帯状ポリゴン）
4. Workerで各種サンプル列を生成し、TypedArrayで返却（Transferable）
5. MainでCesiumへ反映（衛星動点 + 軌道ライン + フットプリント + スワス）
6. スライダー/再生で時刻が進む（同一日内は再計算不要、サンプル参照で追従）
7. 日付境界を跨ぐ場合は、次の1日窓を取得（キャッシュ/先読みがあれば即反映）

---

## 6. 時間モデル / 表示モデル

### 6.1 基本方針：1日窓（rolling window）

- 表示する軌道ラインは常に「1日分」： [T0, T0 + 24h]
- フットプリントは「時刻に応じて変化する」ため、1日窓内の **サンプル列** を作り、現在時刻に最も近いサンプルを表示
- スワスは「1日窓内の掃引範囲」を **帯状ポリゴン** として表示（1日窓切替のタイミングで差し替え）
- 2週間先へ進めるが、常時計算はせず「必要になった日だけ生成」

### 6.2 時刻はUTCを正とする

- dayStart（T0）はUTCで丸める（例：00:00 UTC）
- ローカルタイム表記はUI上の表示のみ（内部計算・キーはUTC）

---

## 7. 地表ポリゴンのデータ契約（重要）

### 7.1 フットプリント出力形式（採用方針：A）

- 自前計算ロジックは、各サンプル時刻 `t` に対して **地表面上のポリゴン** を返す
- 表現は（少なくとも）以下を満たすこと：
  - 単一リング（Polygon）または分割済み複数リング（MultiPolygon相当）
  - 座標は lon/lat（度）
  - dateline（±180°）跨ぎがある場合は、描画破綻を避けるため **分割してMultiPolygon相当**で渡すことを推奨（または同等の連続化処理）

### 7.2 スワス（帯状ポリゴン）の出力形式

- 自前計算ロジックは、1日窓（[T0, T0+24h]）における掃引範囲を **帯状ポリゴン** として返す
- 表現は Polygon/MultiPolygon相当（lon/lat）
- スワスは窓単位で静的に描画し、窓切替で差し替える（時刻ごとの差し替えはしない）

---

## 8. Web Worker 設計（Dedicated Worker）

### 8.1 目的

- SGP4（TLE→位置列）およびフットプリント/スワスの生成をUIスレッドから隔離し、スライダー操作・地球儀操作のカクつきを防ぐ

### 8.2 メッセージ仕様（案）

#### 8.2.1 Main → Worker: compute-day

- requestId: 最新判定用（古い結果は破棄）
- satelliteId: 衛星識別子
- tle1 / tle2: Two-Line Element
- dayStartMs: UTCのepoch ms（その日の開始）
- durationMs: 86,400,000（固定でも可）
- stepSec: サンプル間隔（初期推奨 30、動作を見て調整）
- outputs: 必要な出力（orbit / footprint / swath）
- footprintParams/swathParams: 自前計算ロジックに必要なパラメータ（具体形式はプロジェクト内で定義）

例：

```ts
type ComputeDayRequest = {
  type: "compute-day";
  requestId: string;
  satelliteId: string;
  tle1: string;
  tle2: string;
  dayStartMs: number; // UTC
  durationMs: number; // 24h
  stepSec: number; // e.g. 30 (tune later)
  outputs: {
    orbit: true;
    footprint: true;
    swath: true;
  };
  footprintParams?: unknown; // 自前ロジック入力（姿勢/FOV等）
  swathParams?: unknown; // 自前ロジック入力（帯状ポリゴン用）
};
```

#### 8.2.2 Worker → Main: computed-day

- orbit
  - timesMs: Float64Array.buffer（Transferable）
  - ecef: Float32Array.buffer（Transferable, meters）
- footprint（サンプル列）
  - timesMs: Float64Array.buffer（Transferable）
  - rings: Float32Array.buffer（Transferable） ※ lon/lat をフラット配列化
  - offsets: Uint32Array.buffer（Transferable） ※ 時刻ごとのring開始位置
  - counts: Uint16Array.buffer（Transferable） ※ 時刻ごとの頂点数
  - ※ MultiPolygon相当が必要なら、polygonごとのoffset/counterの階層を追加（別途設計）
- swath（窓単位の帯状ポリゴン）
  - rings/offets/counts など（フットプリントと同型で窓単位1件）

例（概念）：

```ts
type FlatRings = {
  rings: ArrayBuffer; // Float32Array [lon,lat,lon,lat,...]
  offsets: ArrayBuffer; // Uint32Array
  counts: ArrayBuffer; // Uint16Array
};

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
    flat: FlatRings; // 時刻配列と同じ長さのサンプルを表現
  };
  swath?: {
    flat: FlatRings; // 窓単位（1件）
  };
};
```

#### 8.2.3 エラー返却

```ts
type WorkerError = {
  type: "error";
  requestId?: string;
  satelliteId?: string;
  message: string;
  detail?: unknown;
};
```

### 8.3 重要：キャンセル/競合対策

- Main側：最新requestId以外の結果は反映しない
- Worker側：generationToken方式で計算ループ中断（新要求が来たらトークン更新）

---

## 9. サンプリング / 性能設計

### 9.1 初期推奨値（1日窓）

- stepSec = 30秒（まずは固定。動作を見て調整）
  - 1日あたり2,880点/衛星（軌道/フットプリント）
  - 10機 → 28,800点/日（現実的）
- スワスは「窓単位」なので stepSec と独立（窓切替時に再生成）

### 9.2 表示要素ごとの最適化

- 軌道ライン：静的Polyline（1日分を一括生成し差し替え）
- 衛星動点：SampledPositionProperty（補間を有効化）
- フットプリント：現在時刻に対応するサンプル1件を表示（同一日内はサンプル参照で追従）
- スワス：窓単位の帯状ポリゴンを表示（同一日内で差し替え不要）

### 9.3 追加最適化（必要になったら）

- カメラ高度による可変stepSec（全体表示は粗く、追尾時は細かく）
- 同時表示衛星数が増える場合：Entity中心 → Primitive/PolylineCollection中心へ寄せる
- フットプリントの頂点数が大きい場合：簡略化（Douglas-Peucker等）や分割描画の検討

---

## 10. キャッシュ / 先読み

### 10.1 日単位LRUキャッシュ

- key = `${satelliteId}:${dayStartMs}:${stepSec}`
- value = orbit / footprint / swath の各出力（TypedArray or ArrayBuffer）

推奨保持量：

- 前後3日（計7日）程度を目安にLRU
- スワスは窓単位で1件なので追加コストは小さい

### 10.2 先読み（プリフェッチ）

- 表示要求Dが来たら、余力で D+1（翌日）、D-1（前日）をバックグラウンド生成
- スライダーが単調増加の利用が多い場合は D+1を優先

---

## 11. 地図タイル（自前）統合

### 11.1 方針

- CesiumのImageryLayerとして自前タイルを設定する
- タイル種別（XYZ / TMS / WMTS 等）に応じてプロバイダを選択
- 認証が必要ならトークン付与（ヘッダ/クエリ）方式を整理

### 11.2 注意点

- タイルの投影（Web Mercator / EPSG:3857 前提など）とCesium側の取り扱い確認
- CORS設定、キャッシュヘッダ、CDNなど運用面の前提整理

---

## 12. ポリゴン（AOI等）設計

### 12.1 入力形式

- GeoJSON（Polygon/MultiPolygon）を第一級とする
- 取り込み時に座標バリデーション（閉曲線、経度範囲、アンチメリディアン等）を検討

### 12.2 状態と表現

- default / hover / selected を定義
- 表現は stroke/fill + 必要ならextrude（高さ）やラベルを追加
- 大量ポリゴンの場合は表示レイヤやタイル化を将来検討

---

## 13. UI仕様（最低限）

### 13.1 タイムスライダー

- 表示範囲：現在を含む任意基準で「-?日〜+14日」程度
- 操作：
  - 任意時刻へジャンプ（スクラブ）
  - 再生/停止（任意、将来）
  - 日付境界を跨ぐと「1日窓差し替え」
- 実装方針：同一日内はサンプル参照で追従し、日跨ぎ時のみ再計算（またはキャッシュヒット）

### 13.2 衛星管理

- 10機の表示ON/OFF
- 色（衛星ごとに固定）
- 選択した衛星を追尾（カメラ追従）
- フットプリント/スワスの表示ON/OFF（衛星ごと）

### 13.3 表示情報

- 現在時刻（UTC/ローカルの切替は任意）
- TLE更新日時（仕様化推奨）
- 選択衛星の現在位置（lat/lon/height）

---

## 14. リスク / 留意点

### 14.1 TLEの予測誤差（仕様リスク）

- TLEは時間が経つほど誤差が増える可能性があるため、「2週間先」は概略として扱うことを明記
- 重要用途ならTLE更新頻度、表示許容誤差、更新時の再計算戦略を要件化

### 14.2 dateline跨ぎ（描画破綻の主要因）

- フットプリント/スワスはdateline（±180°）跨ぎが起きやすい
- 入力として MultiPolygon相当（分割済み）を許容する契約を明確化し、描画側で正しく表示できることを受け入れ基準に含める

### 14.3 Worker通信・メモリ

- オブジェクト配列でのpostMessageは避け、TypedArray + Transferableで返す
- キャッシュ容量が膨らみすぎないようLRUで制御

### 14.4 描画性能

- Entityの大量生成はボトルネックになり得る（将来のスケール時はPrimitiveへ）
- 線の点数・フットプリント頂点数が増えるほど描画負荷が上がるため、stepSec/簡略化の調整余地を確保

---

## 15. 受け入れ基準（例）

- 10機表示 + 1日窓（step=30秒）で、地球回転/ズームが体感で滑らか
- スライダーで日付を切り替えてもUIがフリーズしない
- 自前タイルが地球儀上に正しく貼られ、切替や拡大で破綻しない
- AOIポリゴンが描画され、ホバー/選択で強調できる
- TLEから計算された軌道ラインが描画され、衛星動点が時刻に追従する
- フットプリントが時刻に追従して更新され、表示破綻（特にdateline跨ぎ）がない
- スワス（帯状ポリゴン）が1日窓に対応して表示され、窓切替で正しく差し替わる

---

## 16. 実装タスク分割（粗）

1. Cesium Viewer表示 + 自前タイル適用
2. AOIポリゴンレイヤ（GeoJSON入力、hover/selected）
3. 衛星1機：TLE固定で軌道1日分描画（メイン直計算でも可）
4. Web Worker導入：SGP4計算をWorkerへ移行（TypedArray返却）
5. 10機対応：衛星管理UI（ON/OFF、色、追尾）
6. タイムスライダー：同一日内はClock操作、日跨ぎで窓差し替え
7. フットプリント：自前計算結果を地表ポリゴンとして表示（サンプル参照で追従）
8. スワス：帯状ポリゴン（窓単位）を表示（窓切替で差し替え）
9. キャッシュ（LRU）+ 先読み
10. 品質：エラー表示、ログ、計測（処理時間、メモリ等）

---

## 17. 付録：推奨パラメータ（初期値）

- stepSec: 30（動作を見て調整）
- cacheDays: 7（前後3日＋当日）
- prefetch: enabled（D+1優先）
- orbitWindow: 24h固定
- timeBase: UTC
