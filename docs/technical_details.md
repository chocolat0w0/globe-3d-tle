# 技術詳細書

## 1. 概要

本ドキュメントは、実装における技術的な詳細、アルゴリズム、注意点を説明する。

## 2. 座標系と変換

### 2.1 座標系の定義

#### ECI (Earth-Centered Inertial) 慣性座標系

- 原点: 地球中心
- Z軸: 地球の自転軸（北極方向）
- X軸: 春分点方向（恒星に対して固定）
- Y軸: Z×Xの右手系
- 特徴: **地球の自転を考慮しない**慣性座標系
- 用途: SGP4の出力座標系

#### ECEF (Earth-Centered Earth-Fixed) 地球固定座標系

- 原点: 地球中心
- Z軸: 地球の自転軸（北極方向）
- X軸: 赤道面と本初子午線の交点
- Y軸: Z×Xの右手系
- 特徴: **地球と共に回転する**座標系
- 用途: Cesiumの内部座標系

#### LLA (Latitude, Longitude, Altitude) 緯度経度高度

- 緯度: -90° 〜 +90°（北緯が正）
- 経度: -180° 〜 +180°（東経が正）
- 高度: 地表からの高さ（meters）
- 基準楕円体: WGS84

### 2.2 座標変換のアルゴリズム

#### ECI → ECEF 変換

```typescript
function eciToEcef(
  eci: CartesianPosition,
  gmst: number, // Greenwich Mean Sidereal Time (radians)
): CartesianPosition {
  // Z軸周りの回転行列（GMST角）
  const cosGMST = Math.cos(gmst);
  const sinGMST = Math.sin(gmst);

  return {
    x: cosGMST * eci.x + sinGMST * eci.y,
    y: -sinGMST * eci.x + cosGMST * eci.y,
    z: eci.z,
  };
}
```

**GMST計算**:

```typescript
function computeGMST(timeMs: number): number {
  const date = new Date(timeMs);
  const jd = dateToJulianDay(date);
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries since J2000

  // GMST at 0h UT
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;

  // 時刻の端数を加算
  const hours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60.0 +
    date.getUTCSeconds() / 3600.0;
  gmst += hours * 15.0; // 15度/時

  // 0-360度に正規化
  gmst = gmst % 360.0;
  if (gmst < 0) gmst += 360.0;

  return gmst * (Math.PI / 180.0); // radians
}

function dateToJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  let jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  let jd = jdn + (hour - 12) / 24.0 + minute / 1440.0 + second / 86400.0;

  return jd;
}
```

#### ECEF → LLA 変換

WGS84楕円体パラメータ:

```typescript
const WGS84 = {
  a: 6378137.0, // 長半径（赤道半径）meters
  f: 1.0 / 298.257223563, // 扁平率
  e2: 0.00669437999014, // 第一離心率の2乗
};
```

Iterative法（高精度）:

```typescript
function ecefToLLA(ecef: CartesianPosition): LLAPosition {
  const { x, y, z } = ecef;
  const { a, e2 } = WGS84;

  const p = Math.sqrt(x * x + y * y);
  const lon = Math.atan2(y, x); // radians

  // 緯度の反復計算
  let lat = Math.atan2(z, p * (1 - e2)); // 初期値
  let N = 0;
  let prevLat = 0;

  for (let i = 0; i < 10; i++) {
    prevLat = lat;
    N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    lat = Math.atan2(z + e2 * N * Math.sin(lat), p);

    if (Math.abs(lat - prevLat) < 1e-12) break;
  }

  N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  const alt = p / Math.cos(lat) - N;

  return {
    latitude: lat * (180.0 / Math.PI), // degrees
    longitude: lon * (180.0 / Math.PI), // degrees
    altitude: alt, // meters
  };
}
```

#### LLA → ECEF 変換

```typescript
function llaToEcef(lla: LLAPosition): CartesianPosition {
  const { latitude, longitude, altitude } = lla;
  const { a, e2 } = WGS84;

  const lat = latitude * (Math.PI / 180.0);
  const lon = longitude * (Math.PI / 180.0);

  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);

  return {
    x: (N + altitude) * Math.cos(lat) * Math.cos(lon),
    y: (N + altitude) * Math.cos(lat) * Math.sin(lon),
    z: (N * (1 - e2) + altitude) * Math.sin(lat),
  };
}
```

### 2.3 Cesiumでの座標扱い

Cesiumは内部でECEF座標系（Cartesian3）を使用:

```typescript
// ECEF → Cesium.Cartesian3
const cesiumPosition = new Cesium.Cartesian3(ecef.x, ecef.y, ecef.z);

// LLA → Cesium.Cartesian3
const cesiumPosition = Cesium.Cartesian3.fromDegrees(
  longitude,
  latitude,
  altitude,
);

// Cesium.Cartesian3 → LLA
const cartographic = Cesium.Cartographic.fromCartesian(cesiumPosition);
const longitude = Cesium.Math.toDegrees(cartographic.longitude);
const latitude = Cesium.Math.toDegrees(cartographic.latitude);
const altitude = cartographic.height;
```

## 3. フットプリント計算

### 3.1 推奨: geo4326ライブラリの使用

**geo4326**はsatellite.jsベースのフットプリント計算ライブラリで、dateline跨ぎ処理も自動対応。

**基本的な使い方**:

```typescript
import { footprint } from "geo4326/satellite";

// TLEと時刻からフットプリントを計算
const result = footprint(tle1, tle2, date, {
  fov: [30, 30], // [クロストラック, アロングトラック] 度
  offnadir: 0, // オフナディア角（度）
  insert: 10, // エッジ補間点数
});

// result: [[[lon, lat], [lon, lat], ...]] 形式（GeoJSON Polygon互換）
```

**パラメータ詳細**:

- `fov`: 視野角 `[クロストラック, アロングトラック]`（度）
  - クロストラック: 衛星進行方向に垂直な方向の視野角
  - アロングトラック: 衛星進行方向の視野角
- `offnadir`: オフナディア角（度）- センサーが直下点から傾いている角度
- `insert`: エッジ上の補間点数 - 大きいほど滑らかな曲線

**利点**:

- TLEから直接計算可能（衛星位置の事前計算不要）
- dateline跨ぎは自動でMultiPolygon分割される
- WGS84楕円体を考慮した正確な計算
- MITライセンス（商用利用可能）

### 3.2 参考: 簡易版（円錐投影）

geo4326を使わない場合の自前実装例。

**前提**:

- 衛星は地球を向いている（nadir pointing）
- センサーFOVは円錐状（半角θ）

**アルゴリズム**:

```typescript
function computeFootprintSimple(
  satellitePosition: SatellitePosition,
  sensorFOV: number, // degrees
): GeoJSONPolygon {
  const { lla, position: ecef } = satellitePosition;
  const { latitude, longitude, altitude } = lla;

  // 1. フットプリントの半径を計算
  const fovRad = (sensorFOV / 2) * (Math.PI / 180.0);
  const earthRadius = 6371000; // meters（簡易版は球面近似）

  const radius = altitude * Math.tan(fovRad);

  // 2. 衛星直下点を中心とした円を生成
  const numPoints = 64; // 円の分割数
  const coordinates: number[][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;

    // 方位角から緯度経度オフセットを計算
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);

    // メートル単位のオフセットを度に変換
    const dLat = (dy / earthRadius) * (180.0 / Math.PI);
    const dLon =
      (dx / (earthRadius * Math.cos((latitude * Math.PI) / 180.0))) *
      (180.0 / Math.PI);

    const newLat = latitude + dLat;
    const newLon = longitude + dLon;

    coordinates.push([newLon, newLat]);
  }

  return {
    type: "Polygon",
    coordinates: [coordinates],
  };
}
```

### 3.3 参考: 詳細版（姿勢考慮）

衛星の姿勢（Quaternion）を考慮した正確なフットプリント計算が必要な場合。

**手順**:

1. センサーの視錐台（frustum）を定義
2. 視錐台の各辺と地球楕円体の交線を計算
3. 交線から地表ポリゴンを生成

**推奨**: geo4326の`fov`と`offnadir`パラメータで多くのケースに対応可能。より複雑な姿勢制御が必要な場合のみ自前実装を検討。

### 3.4 dateline跨ぎ対策

経度が-180°と+180°を跨ぐポリゴンは描画破綻するため、分割が必要。

**重要**: geo4326の`footprint`関数はdateline跨ぎを自動検出して分割するため、通常は以下の実装は不要。geo4326を使わない場合の参考実装として記載。

**検出方法**:

```typescript
function detectDatelineCrossing(coordinates: number[][]): boolean {
  for (let i = 0; i < coordinates.length - 1; i++) {
    const lon1 = coordinates[i][0];
    const lon2 = coordinates[i + 1][0];

    // 経度差が180度以上なら跨いでいる
    if (Math.abs(lon2 - lon1) > 180) {
      return true;
    }
  }
  return false;
}
```

**分割方法**:

```typescript
function splitPolygonAtDateline(polygon: Polygon): MultiPolygon | Polygon {
  if (!detectDatelineCrossing(polygon.coordinates[0])) {
    return polygon; // 跨いでいない
  }

  // 西半球ポリゴン（-180〜0）と東半球ポリゴン（0〜180）に分割
  const westRing: number[][] = [];
  const eastRing: number[][] = [];

  const ring = polygon.coordinates[0];

  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];

    if (Math.abs(lon2 - lon1) > 180) {
      // 跨ぎ点で補間
      const crossLat = lat1 + (lat2 - lat1) * 0.5; // 簡易補間

      if (lon1 < 0) {
        // 西→東への跨ぎ
        westRing.push([lon1, lat1]);
        westRing.push([-180, crossLat]);

        eastRing.push([180, crossLat]);
        eastRing.push([lon2, lat2]);
      } else {
        // 東→西への跨ぎ
        eastRing.push([lon1, lat1]);
        eastRing.push([180, crossLat]);

        westRing.push([-180, crossLat]);
        westRing.push([lon2, lat2]);
      }
    } else {
      // 通常の点
      if (lon1 < 0) {
        westRing.push([lon1, lat1]);
      } else {
        eastRing.push([lon1, lat1]);
      }
    }
  }

  // リングを閉じる
  if (westRing.length > 0) {
    westRing.push(westRing[0]);
  }
  if (eastRing.length > 0) {
    eastRing.push(eastRing[0]);
  }

  return {
    type: "MultiPolygon",
    coordinates: [
      westRing.length > 2 ? [westRing] : [],
      eastRing.length > 2 ? [eastRing] : [],
    ].filter((p) => p.length > 0),
  };
}
```

**より高精度な分割**: [turf.js](https://turfjs.org/) の `turf.lineString` + `turf.lineSlice` を活用。

## 4. スワス計算

### 4.1 推奨: geo4326のaccessArea関数

**geo4326**のaccessArea関数は、衛星の機体姿勢制御を考慮した観測可能範囲を計算。

```typescript
import { accessArea } from "geo4326/satellite";

// 期間指定でスワス（観測可能範囲）を計算
const swath = accessArea(tle1, tle2, startDate, endDate, {
  roll: 30, // 最大ロール角（左右傾き、度）
  split: 360, // 軌道周期の分割数
});

// swath: LinearRing配列
// 各要素は [[lon, lat], [lon, lat], ...] 形式
```

**パラメータ**:

- `roll`: 最大ロール角（度）- 衛星が左右に傾ける最大角度
- `split`: 軌道周期の分割数 - 大きいほど精密だが計算時間が増加

**利点**:

- 期間を指定するだけでスワス全体を計算
- dateline跨ぎは自動処理
- 姿勢制御（ロール角）を考慮した実用的な計算

### 4.2 参考: 自前実装

geo4326を使わない場合の簡易実装。

**手順**:

1. 時系列のフットプリントリストを取得
2. 各フットプリントの外周点を順に接続
3. 始点と終点を閉じて1つのポリゴンを生成
4. dateline跨ぎ処理を適用

**簡易実装例**:

```typescript
function computeSwathSimple(footprints: Footprint[]): GeoJSONPolygon {
  const outerRing: number[][] = [];

  // 前進方向の外周点を追加
  for (const fp of footprints) {
    const coords = fp.geometry.coordinates[0];
    // 外周の半分（例: 右側）を追加
    const halfIndex = Math.floor(coords.length / 2);
    for (let i = 0; i < halfIndex; i++) {
      outerRing.push(coords[i]);
    }
  }

  // 後退方向の外周点を追加（逆順）
  for (let i = footprints.length - 1; i >= 0; i--) {
    const coords = footprints[i].geometry.coordinates[0];
    const halfIndex = Math.floor(coords.length / 2);
    for (let j = halfIndex; j < coords.length; j++) {
      outerRing.push(coords[j]);
    }
  }

  // リングを閉じる
  outerRing.push(outerRing[0]);

  const polygon: Polygon = {
    type: "Polygon",
    coordinates: [outerRing],
  };

  // dateline跨ぎ処理
  return splitPolygonAtDateline(polygon);
}
```

**高精度版**: turf.js の `turf.union()` を使って全フットプリントを結合。

### 4.3 最適化

- **間引き**: フットプリントのサンプル間隔を粗くする（例: 60秒間隔）
- **簡略化**: Douglas-Peuckerアルゴリズムで頂点数を削減
  - turf.js: `turf.simplify(polygon, { tolerance: 0.01 })`

## 5. Web Worker実装の詳細

### 5.1 Transferable活用

**メリット**:

- メモリコピーなしでデータ転送（所有権の移動）
- 大量データの転送が高速

**対象**:

- ArrayBuffer（TypedArrayの.buffer）

**注意**:

- 転送後、送信側でそのバッファは使用不可になる

```typescript
// Main側
const timesMs = new Float64Array(2880);
// ... データ設定 ...

worker.postMessage(
  { data: timesMs.buffer },
  [timesMs.buffer], // Transferable指定
);

// この後、timesMs.bufferは使用不可
```

### 5.2 キャンセル/競合対策

**問題**:

- ユーザーがスライダーを素早く動かすと、複数の計算要求が並行実行される
- 古い結果が新しい結果を上書きする可能性

**対策1: requestId管理（Main側）**

```typescript
let latestRequestId = '';

function requestOrbitData(satelliteId: string, dayStartMs: number) {
  const requestId = `${satelliteId}-${dayStartMs}-${Date.now()}`;
  latestRequestId = requestId;

  worker.postMessage({ requestId, satelliteId, dayStartMs, ... });
}

worker.onmessage = (event) => {
  const response = event.data;

  // 最新のrequestIdでなければ無視
  if (response.requestId !== latestRequestId) {
    console.log('Ignoring stale response:', response.requestId);
    return;
  }

  // 結果を反映
  applyOrbitData(response);
};
```

**対策2: generationToken（Worker側）**

```typescript
let currentGeneration = 0;

self.onmessage = (event) => {
  const request = event.data;

  // 新要求が来たらトークンを更新
  currentGeneration++;
  const myGeneration = currentGeneration;

  // 計算ループ
  for (let i = 0; i < numSamples; i++) {
    // 古いトークンなら中断
    if (myGeneration !== currentGeneration) {
      console.log("Computation cancelled");
      return;
    }

    // 計算処理
    // ...
  }

  // 結果送信
  self.postMessage(response);
};
```

### 5.3 エラーハンドリング

```typescript
// Worker側
try {
  const result = computeOrbit(...);
  self.postMessage({ type: 'success', result });
} catch (error) {
  self.postMessage({
    type: 'error',
    message: error.message,
    stack: error.stack,
  });
}

// Main側
worker.onmessage = (event) => {
  const response = event.data;

  if (response.type === 'error') {
    console.error('Worker error:', response.message);
    showErrorToUser(response.message);
    return;
  }

  // 正常処理
  applyOrbitData(response.result);
};

worker.onerror = (error) => {
  console.error('Worker fatal error:', error);
  showErrorToUser('計算エラーが発生しました');
};
```

## 6. Cesium描画の最適化

### 6.1 Entity vs Primitive

| 特徴           | Entity            | Primitive         |
| -------------- | ----------------- | ----------------- |
| 使いやすさ     | 高レベルAPI、簡単 | 低レベルAPI、複雑 |
| パフォーマンス | 少数なら十分      | 大量表示で高速    |
| メモリ使用量   | 多い              | 少ない            |
| 推奨用途       | 〜100オブジェクト | 100+オブジェクト  |

**初期はEntityで実装し、パフォーマンス問題が出たらPrimitiveへ移行**。

### 6.2 Entityのベストプラクティス

**軌道ライン**:

```typescript
const entity = viewer.entities.add({
  id: `orbit-${satelliteId}`,
  polyline: {
    positions: positionsArray, // Cesium.Cartesian3[]
    width: 2,
    material: Cesium.Color.fromCssColorString(color),
    clampToGround: false,
  },
});
```

**衛星動点（SampledPositionProperty）**:

```typescript
const sampledPosition = new Cesium.SampledPositionProperty();

for (let i = 0; i < orbitData.timesMs.length; i++) {
  const time = Cesium.JulianDate.fromDate(new Date(orbitData.timesMs[i]));
  const position = new Cesium.Cartesian3(
    orbitData.ecef[i * 3],
    orbitData.ecef[i * 3 + 1],
    orbitData.ecef[i * 3 + 2],
  );
  sampledPosition.addSample(time, position);
}

// 補間を有効化
sampledPosition.setInterpolationOptions({
  interpolationDegree: 5,
  interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
});

viewer.entities.add({
  id: `satellite-${satelliteId}`,
  position: sampledPosition,
  point: {
    pixelSize: 8,
    color: Cesium.Color.fromCssColorString(color),
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
  },
});
```

**フットプリント（ポリゴン）**:

```typescript
const positions = Cesium.Cartesian3.fromDegreesArray(
  flattenCoordinates(footprint.geometry.coordinates),
);

viewer.entities.add({
  id: `footprint-${satelliteId}`,
  polygon: {
    hierarchy: new Cesium.PolygonHierarchy(positions),
    material: Cesium.Color.fromCssColorString(color).withAlpha(0.3),
    outline: true,
    outlineColor: Cesium.Color.fromCssColorString(color),
    outlineWidth: 2,
  },
});
```

### 6.3 描画更新の最適化

**問題**: 毎フレーム更新するとパフォーマンス低下。

**対策**:

1. **フットプリントは時刻変化時のみ更新**:

```typescript
let previousFootprintIndex = -1;

function updateFootprint(
  currentTimeMs: number,
  footprintData: FootprintDataFlat,
) {
  // 現在時刻に対応するサンプルインデックスを検索
  const index = findClosestSampleIndex(currentTimeMs, footprintData.timesMs);

  // インデックスが変わった時のみ更新
  if (index !== previousFootprintIndex) {
    previousFootprintIndex = index;
    updateFootprintGeometry(index, footprintData);
  }
}
```

2. **Entity削除時はremoveAllを避ける**:

```typescript
// ❌ 遅い
viewer.entities.removeAll();

// ✅ 速い（IDベース）
viewer.entities.removeById(`orbit-${satelliteId}`);
```

3. **show/hideでパフォーマンス向上**:

```typescript
// 非表示にするだけなら削除より高速
const entity = viewer.entities.getById(`orbit-${satelliteId}`);
if (entity) {
  entity.show = false;
}
```

## 7. キャッシュ戦略

### 7.1 LRUキャッシュの実装

```typescript
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // アクセスされたら最新に移動
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 最古のエントリを削除（Mapの先頭）
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
```

### 7.2 先読み戦略

```typescript
async function prefetchAdjacentDays(
  satelliteId: string,
  currentDayStartMs: number,
  stepSec: number,
) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // 翌日を優先的に先読み
  const nextDayStartMs = currentDayStartMs + MS_PER_DAY;
  if (!cache.has(getCacheKey(satelliteId, nextDayStartMs, stepSec))) {
    requestOrbitData(satelliteId, nextDayStartMs, stepSec, { priority: "low" });
  }

  // 前日も先読み
  const prevDayStartMs = currentDayStartMs - MS_PER_DAY;
  if (!cache.has(getCacheKey(satelliteId, prevDayStartMs, stepSec))) {
    requestOrbitData(satelliteId, prevDayStartMs, stepSec, { priority: "low" });
  }
}
```

## 8. パフォーマンス計測

### 8.1 計測ポイント

```typescript
function measurePerformance<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// 使用例
const orbitData = measurePerformance("Orbit calculation", () => {
  return computeOrbitSamples(tle1, tle2, startTimeMs, endTimeMs, stepSec);
});
```

### 8.2 メモリ監視

```typescript
function logMemoryUsage() {
  if (performance.memory) {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } =
      performance.memory;
    console.log(
      `[Memory] Used: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
    );
  }
}

// 定期的にログ
setInterval(logMemoryUsage, 10000);
```

## 9. デバッグのヒント

### 9.1 座標の検証

```typescript
function validateECEF(ecef: CartesianPosition): boolean {
  const magnitude = Math.sqrt(ecef.x ** 2 + ecef.y ** 2 + ecef.z ** 2);
  const earthRadius = 6371000; // meters
  const maxSatelliteAlt = 1000000; // meters（例: 1000km）

  // 地球半径〜地球半径+最大高度の範囲にあるか
  return magnitude >= earthRadius && magnitude <= earthRadius + maxSatelliteAlt;
}

function validateLLA(lla: LLAPosition): boolean {
  return (
    lla.latitude >= -90 &&
    lla.latitude <= 90 &&
    lla.longitude >= -180 &&
    lla.longitude <= 180 &&
    lla.altitude >= 0
  );
}
```

### 9.2 TLEの検証

```typescript
function validateTLE(tle1: string, tle2: string): boolean {
  // 基本的な形式チェック
  if (tle1.length !== 69 || tle2.length !== 69) {
    return false;
  }

  // 1行目は"1 "で始まる
  if (!tle1.startsWith("1 ")) {
    return false;
  }

  // 2行目は"2 "で始まる
  if (!tle2.startsWith("2 ")) {
    return false;
  }

  // チェックサムの検証（オプション）
  // ...

  return true;
}
```

## 10. AOI描画ツール

### 10.1 インタラクティブ描画の実装

AOI描画中はCesiumのデフォルトインタラクション（カメラ操作）と干渉しないよう、専用の `ScreenSpaceEventHandler` を使う。描画モード終了時に `destroy()` して後始末すること。

**クリックで頂点を追加（ポリゴンモード）**:

```typescript
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
  const ray = viewer.camera.getPickRay(e.position);
  if (!ray) return;
  const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  if (!cartesian) return;

  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(carto.longitude);
  const lat = Cesium.Math.toDegrees(carto.latitude);

  vertices.push([lon, lat]);
  updateVertexEntities(vertices); // 頂点マーカーを再描画
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// 確定: ダブルクリック（最後の重複点を除いて閉じる）
handler.setInputAction(() => {
  if (vertices.length >= 3) confirmPolygon(vertices);
}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
```

### 10.2 ゴムバンドライン（MOUSE_MOVE イベント）

ゴムバンドラインはアニメーションフレームと無関係に、マウス移動イベントのみで更新する。

```typescript
// 仮線 Entity（描画開始時に1度だけ生成）
const rubberbandEntity = viewer.entities.add({
  polyline: {
    positions: new Cesium.CallbackProperty(() => rubberbandPositions, false),
    width: 1,
    material: Cesium.Color.YELLOW.withAlpha(0.6),
  },
});

handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
  if (vertices.length === 0) return;
  const ray = viewer.camera.getPickRay(e.endPosition);
  if (!ray) return;
  const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  if (!cartesian) return;

  // 確定済み頂点 + カーソル位置で仮線を更新
  rubberbandPositions = [
    ...confirmedCartesians,
    cartesian,
    confirmedCartesians[0], // 閉じる仮線
  ];
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
```

### 10.3 描画モード中の時刻一時停止

描画モードに入ると地球の自転（時刻進行）によってクリックした地点が視覚的にずれるため、時刻アニメーションを一時停止する。

```typescript
// 描画モード開始（useAoi 内部で管理）
const prevShouldAnimate = viewer.clock.shouldAnimate;
viewer.clock.shouldAnimate = false;

// 描画モード終了（確定/キャンセル/クリア）
viewer.clock.shouldAnimate = prevShouldAnimate;
```

`useTime` フックとの連携:

- 描画モード開始時: `pause()` を呼び出し、呼び出し前の `isPlaying` を保存
- 描画モード終了時: 保存した `isPlaying` が `true` なら `play()` を呼び出して復元

### 10.4 GeoJSON ファイル読み込み

```typescript
function parseAoiFromGeoJSON(
  json: unknown,
): { success: true; aoi: Aoi } | { success: false; error: string } {
  try {
    const obj = json as Record<string, unknown>;

    // FeatureCollection の場合は1件目のFeatureを採用
    const feature =
      obj.type === 'FeatureCollection'
        ? (obj.features as unknown[])[0]
        : obj;

    const geom = (feature as Record<string, unknown>).geometry as Record<
      string,
      unknown
    >;

    if (geom?.type === 'Point') {
      const [lon, lat] = geom.coordinates as [number, number];
      return { success: true, aoi: { type: 'Point', coordinate: [lon, lat] } };
    }

    if (geom?.type === 'Polygon') {
      const ring = (geom.coordinates as number[][][])[0];
      return { success: true, aoi: { type: 'Polygon', coordinates: ring as [number, number][] } };
    }

    return { success: false, error: 'Point または Polygon の GeoJSON を指定してください' };
  } catch {
    return { success: false, error: '無効なJSONファイルです' };
  }
}
```

- ファイル読み込みは `FileReader` + `JSON.parse` でブラウザ完結
- サポート形式: `Feature<Point>`, `Feature<Polygon>`, `FeatureCollection`（1件目を採用）
- dateline跨ぎ入力は Phase 9 では非対応（将来課題）

### 10.5 描画中の Entity 管理

```typescript
// 頂点マーカー管理
const vertexEntities: Cesium.Entity[] = [];

function addVertexMarker(cartesian: Cesium.Cartesian3): void {
  vertexEntities.push(
    viewer.entities.add({
      position: cartesian,
      point: { pixelSize: 8, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.WHITE, outlineWidth: 1 },
    })
  );
}

// 描画終了時のクリーンアップ
function clearDrawingEntities(): void {
  vertexEntities.forEach((e) => viewer.entities.remove(e));
  vertexEntities.length = 0;
  if (rubberbandEntity) viewer.entities.remove(rubberbandEntity);
  handler.destroy();
}
```

## 11. まとめ

本ドキュメントでは以下を説明した:

1. **座標系と変換**: ECI/ECEF/LLAの定義と変換アルゴリズム
2. **フットプリント計算**: 簡易版と詳細版、dateline跨ぎ対策
3. **スワス計算**: フットプリント結合による帯状ポリゴン生成
4. **Web Worker**: Transferable、キャンセル対策、エラーハンドリング
5. **Cesium描画**: Entity vs Primitive、ベストプラクティス、更新最適化
6. **キャッシュ**: LRU実装と先読み戦略
7. **パフォーマンス**: 計測方法とメモリ監視
8. **デバッグ**: 座標検証とTLE検証
9. **AOI描画ツール**: インタラクティブ描画、ゴムバンドライン、時刻一時停止、GeoJSON読み込み

これらの技術詳細を踏まえて実装を進めることで、高品質なアプリケーションを構築できる。
