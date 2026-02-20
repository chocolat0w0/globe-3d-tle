# API設計書

## 1. 概要

本ドキュメントは、アプリケーション内部のAPI設計、型定義、モジュール間インターフェースを定義する。

## 2. 型定義

### 2.1 衛星関連（types/satellite.ts）

```typescript
/**
 * 衛星の基本情報
 */
export interface Satellite {
  id: string;
  name: string;
  tle: TLE;
  color: string; // CSS color (e.g., "#FF5733")
  visible: boolean;
  selected: boolean;
  footprintVisible: boolean;
  swathVisible: boolean;
}

/**
 * Two-Line Element
 */
export interface TLE {
  line1: string;
  line2: string;
  updatedAt: Date; // TLE取得日時
}

/**
 * 衛星の現在位置情報
 */
export interface SatellitePosition {
  satelliteId: string;
  time: Date;
  position: CartesianPosition; // ECEF座標
  velocity?: CartesianPosition; // ECEF速度（オプション）
  lla: LLAPosition; // 緯度経度高度
}

export interface CartesianPosition {
  x: number; // meters
  y: number; // meters
  z: number; // meters
}

export interface LLAPosition {
  latitude: number; // degrees
  longitude: number; // degrees
  altitude: number; // meters
}
```

### 2.2 軌道データ（types/orbit.ts）

```typescript
/**
 * 軌道データ（1日窓分）
 */
export interface OrbitData {
  satelliteId: string;
  dayStartMs: number; // UTC epoch ms
  stepSec: number;
  samples: OrbitSample[];
}

/**
 * 軌道サンプル（1時刻分）
 */
export interface OrbitSample {
  timeMs: number; // UTC epoch ms
  ecef: CartesianPosition; // ECEF座標
}

/**
 * Workerから返却される軌道データ（TypedArray版）
 */
export interface OrbitDataFlat {
  satelliteId: string;
  dayStartMs: number;
  stepSec: number;
  timesMs: Float64Array; // [t0, t1, t2, ...]
  ecef: Float32Array; // [x0,y0,z0, x1,y1,z1, ...]
}
```

### 2.3 ポリゴン関連（types/polygon.ts）

```typescript
/**
 * GeoJSON Polygon（簡易版）
 */
export interface Polygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lon,lat], [lon,lat], ...]]
}

/**
 * GeoJSON MultiPolygon（簡易版）
 */
export interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][]; // [[[[lon,lat], ...]], ...]
}

export type GeoJSONPolygon = Polygon | MultiPolygon;

/**
 * ポリゴンの状態
 */
export type PolygonState = 'default' | 'hover' | 'selected';

/**
 * AOIポリゴン
 */
export interface AOIPolygon {
  id: string;
  name: string;
  geometry: GeoJSONPolygon;
  state: PolygonState;
  style?: PolygonStyle;
}

export interface PolygonStyle {
  fill?: string; // CSS color
  stroke?: string; // CSS color
  strokeWidth?: number;
  opacity?: number;
}

/**
 * フットプリント（地表ポリゴン）
 */
export interface Footprint {
  satelliteId: string;
  timeMs: number;
  geometry: GeoJSONPolygon; // dateline跨ぎ時はMultiPolygon
}

/**
 * Workerから返却されるフットプリント（TypedArray版）
 */
export interface FootprintDataFlat {
  satelliteId: string;
  dayStartMs: number;
  stepSec: number;
  timesMs: Float64Array;
  rings: Float32Array; // [lon,lat,lon,lat,...] フラット配列
  offsets: Uint32Array; // 各サンプルの開始位置
  counts: Uint16Array; // 各サンプルの頂点数
}

/**
 * スワス（帯状ポリゴン）
 */
export interface Swath {
  satelliteId: string;
  dayStartMs: number;
  geometry: GeoJSONPolygon;
}

/**
 * Workerから返却されるスワス（TypedArray版）
 */
export interface SwathDataFlat {
  satelliteId: string;
  dayStartMs: number;
  rings: Float32Array;
  offsets: Uint32Array;
  counts: Uint16Array;
}
```

### 2.4 Worker メッセージ（types/worker-messages.ts）

```typescript
/**
 * Main → Worker: 1日窓計算要求
 */
export interface ComputeDayRequest {
  type: 'compute-day';
  requestId: string; // 最新判定用
  satelliteId: string;
  tle1: string;
  tle2: string;
  dayStartMs: number; // UTC epoch ms（その日の00:00）
  durationMs: number; // 86400000（24h固定）
  stepSec: number; // サンプル間隔（例: 30）
  outputs: {
    orbit: boolean;
    footprint: boolean;
    swath: boolean;
  };
  footprintParams?: FootprintParams;
  swathParams?: SwathParams;
}

/**
 * フットプリント計算パラメータ（geo4326準拠）
 */
export interface FootprintParams {
  fov: [number, number]; // [クロストラック, アロングトラック] 度
  offnadir: number; // オフナディア角（度）
  insert?: number; // エッジ補間点数（デフォルト: 10）
}

/**
 * スワス計算パラメータ（geo4326準拠）
 */
export interface SwathParams {
  roll: number; // 最大ロール角（度）
  split?: number; // 軌道周期の分割数（デフォルト: 360）
}

/**
 * Worker → Main: 1日窓計算結果
 */
export interface ComputeDayResponse {
  type: 'computed-day';
  requestId: string;
  satelliteId: string;
  dayStartMs: number;
  stepSec: number;
  orbit?: {
    timesMs: ArrayBuffer; // Float64Array buffer (Transferable)
    ecef: ArrayBuffer; // Float32Array buffer (Transferable)
  };
  footprint?: {
    timesMs: ArrayBuffer; // Float64Array buffer
    rings: ArrayBuffer; // Float32Array buffer
    offsets: ArrayBuffer; // Uint32Array buffer
    counts: ArrayBuffer; // Uint16Array buffer
  };
  swath?: {
    rings: ArrayBuffer; // Float32Array buffer
    offsets: ArrayBuffer; // Uint32Array buffer
    counts: ArrayBuffer; // Uint16Array buffer
  };
}

/**
 * Worker → Main: エラー
 */
export interface WorkerError {
  type: 'error';
  requestId?: string;
  satelliteId?: string;
  message: string;
  detail?: unknown;
}

export type WorkerRequest = ComputeDayRequest;
export type WorkerResponse = ComputeDayResponse | WorkerError;
```

### 2.5 時間管理（types/time.ts）

```typescript
/**
 * 時間管理の状態
 */
export interface TimeState {
  currentTimeMs: number; // UTC epoch ms
  isPlaying: boolean;
  speedMultiplier: number; // 1, 10, 100, 1000
  displayRange: {
    startMs: number; // UTC epoch ms
    endMs: number; // UTC epoch ms
  };
}

/**
 * 1日窓の定義
 */
export interface DayWindow {
  dayStartMs: number; // UTC epoch ms（その日の00:00）
  dayEndMs: number; // UTC epoch ms（次の日の00:00）
}
```

## 3. モジュールAPI

### 3.1 lib/tle/orbit.ts

```typescript
/**
 * TLEから軌道サンプル列を計算
 */
export function computeOrbitSamples(
  tle1: string,
  tle2: string,
  startTimeMs: number,
  endTimeMs: number,
  stepSec: number
): OrbitSample[];

/**
 * SGP4で1時刻の位置を計算
 */
export function propagateTLE(
  tle1: string,
  tle2: string,
  timeMs: number
): SatellitePosition | null;
```

### 3.2 lib/tle/coordinate.ts

```typescript
/**
 * ECI座標をECEF座標へ変換
 */
export function eciToEcef(
  eci: CartesianPosition,
  gmst: number
): CartesianPosition;

/**
 * ECEF座標を緯度経度高度へ変換
 */
export function ecefToLLA(ecef: CartesianPosition): LLAPosition;

/**
 * 緯度経度高度をECEF座標へ変換
 */
export function llaToEcef(lla: LLAPosition): CartesianPosition;

/**
 * GMSTを計算（Greenwich Mean Sidereal Time）
 */
export function computeGMST(timeMs: number): number;
```

### 3.3 lib/tle/footprint.ts

```typescript
/**
 * 衛星位置とFOVからフットプリントを計算
 */
export function computeFootprint(
  satellitePosition: SatellitePosition,
  params: FootprintParams
): GeoJSONPolygon;

/**
 * 1日窓のフットプリント列からスワスを生成
 */
export function computeSwath(
  footprints: Footprint[]
): GeoJSONPolygon;

/**
 * dateline跨ぎを検出してポリゴンを分割
 */
export function splitPolygonAtDateline(
  polygon: Polygon
): MultiPolygon | Polygon;
```

### 3.4 lib/cache/lru-cache.ts

```typescript
/**
 * LRUキャッシュ
 */
export class LRUCache<K, V> {
  constructor(maxSize: number);

  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
}

/**
 * 軌道データ専用キャッシュ
 */
export class OrbitDataCache {
  constructor(maxDays: number);

  get(
    satelliteId: string,
    dayStartMs: number,
    stepSec: number
  ): OrbitDataFlat | undefined;

  set(
    satelliteId: string,
    dayStartMs: number,
    stepSec: number,
    data: OrbitDataFlat
  ): void;

  getCacheKey(
    satelliteId: string,
    dayStartMs: number,
    stepSec: number
  ): string;
}
```

### 3.5 lib/cesium/entity-utils.ts

```typescript
/**
 * 軌道ラインのEntity生成
 */
export function createOrbitPolyline(
  orbitData: OrbitDataFlat,
  color: string
): Cesium.Entity;

/**
 * 衛星動点のEntity生成
 */
export function createSatellitePoint(
  orbitData: OrbitDataFlat,
  color: string
): Cesium.Entity;

/**
 * SampledPositionPropertyの生成
 */
export function createSampledPositionProperty(
  orbitData: OrbitDataFlat
): Cesium.SampledPositionProperty;
```

### 3.6 lib/cesium/polygon-utils.ts

```typescript
/**
 * GeoJSONポリゴンをCesium Entityへ変換
 */
export function createPolygonEntity(
  polygon: GeoJSONPolygon,
  style: PolygonStyle
): Cesium.Entity;

/**
 * ポリゴンのスタイルを更新
 */
export function updatePolygonStyle(
  entity: Cesium.Entity,
  style: PolygonStyle
): void;
```

## 4. カスタムフック

### 4.1 hooks/useTime.ts

```typescript
/**
 * 時間管理フック
 */
export function useTime() {
  return {
    currentTimeMs: number;
    isPlaying: boolean;
    speedMultiplier: number;
    displayRange: { startMs: number; endMs: number };

    // アクション
    setCurrentTime: (timeMs: number) => void;
    play: () => void;
    pause: () => void;
    setSpeedMultiplier: (multiplier: number) => void;
    jumpToDate: (date: Date) => void;

    // ユーティリティ
    getCurrentDayWindow: () => DayWindow;
    isInSameDay: (timeMs1: number, timeMs2: number) => boolean;
  };
}
```

### 4.2 hooks/useSatellites.ts

```typescript
/**
 * 衛星管理フック
 */
export function useSatellites() {
  return {
    satellites: Satellite[];
    selectedSatellite: Satellite | null;

    // アクション
    addSatellite: (satellite: Satellite) => void;
    removeSatellite: (id: string) => void;
    toggleVisibility: (id: string) => void;
    selectSatellite: (id: string) => void;
    updateSatellite: (id: string, updates: Partial<Satellite>) => void;

    // ユーティリティ
    getVisibleSatellites: () => Satellite[];
    getSatelliteById: (id: string) => Satellite | undefined;
  };
}
```

### 4.3 hooks/useOrbitData.ts

```typescript
/**
 * 軌道データ取得フック
 */
export function useOrbitData(
  satellite: Satellite,
  dayWindow: DayWindow,
  stepSec: number
) {
  return {
    orbitData: OrbitDataFlat | null;
    footprintData: FootprintDataFlat | null;
    swathData: SwathDataFlat | null;
    isLoading: boolean;
    error: Error | null;

    // アクション
    refresh: () => void;
  };
}
```

### 4.4 hooks/useWorker.ts

```typescript
/**
 * Web Workerフック
 */
export function useWorker<Request, Response>(
  workerUrl: string
) {
  return {
    postMessage: (message: Request, transfer?: Transferable[]) => void;
    onMessage: (callback: (response: Response) => void) => void;
    terminate: () => void;
  };
}
```

## 5. Workerの実装詳細

### 5.1 orbit-calculator.worker.ts

```typescript
// グローバルスコープでメッセージハンドラを設定
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  switch (request.type) {
    case 'compute-day':
      handleComputeDay(request);
      break;
    default:
      sendError('Unknown request type');
  }
};

async function handleComputeDay(request: ComputeDayRequest) {
  try {
    // 1. 軌道計算
    const orbit = request.outputs.orbit
      ? computeOrbitFlat(request)
      : undefined;

    // 2. フットプリント計算
    const footprint = request.outputs.footprint
      ? computeFootprintFlat(request, orbit)
      : undefined;

    // 3. スワス計算
    const swath = request.outputs.swath
      ? computeSwathFlat(request, footprint)
      : undefined;

    // 4. レスポンス送信（Transferable）
    const response: ComputeDayResponse = {
      type: 'computed-day',
      requestId: request.requestId,
      satelliteId: request.satelliteId,
      dayStartMs: request.dayStartMs,
      stepSec: request.stepSec,
      orbit,
      footprint,
      swath,
    };

    const transferables: ArrayBuffer[] = [];
    if (orbit) {
      transferables.push(orbit.timesMs, orbit.ecef);
    }
    if (footprint) {
      transferables.push(
        footprint.timesMs,
        footprint.rings,
        footprint.offsets,
        footprint.counts
      );
    }
    if (swath) {
      transferables.push(
        swath.rings,
        swath.offsets,
        swath.counts
      );
    }

    self.postMessage(response, transferables);
  } catch (error) {
    sendError(error.message, request.requestId, request.satelliteId);
  }
}

function computeOrbitFlat(request: ComputeDayRequest) {
  const { tle1, tle2, dayStartMs, durationMs, stepSec } = request;

  // SGP4計算
  const satrec = satellite.twoline2satrec(tle1, tle2);
  const numSamples = Math.floor(durationMs / 1000 / stepSec);

  const timesMs = new Float64Array(numSamples);
  const ecef = new Float32Array(numSamples * 3);

  for (let i = 0; i < numSamples; i++) {
    const timeMs = dayStartMs + i * stepSec * 1000;
    const date = new Date(timeMs);

    const posVel = satellite.propagate(satrec, date);
    if (posVel.position) {
      const eci = posVel.position as satellite.EciVec3<number>;
      const gmst = computeGMST(timeMs);
      const ecefPos = eciToEcef(
        { x: eci.x * 1000, y: eci.y * 1000, z: eci.z * 1000 },
        gmst
      );

      timesMs[i] = timeMs;
      ecef[i * 3] = ecefPos.x;
      ecef[i * 3 + 1] = ecefPos.y;
      ecef[i * 3 + 2] = ecefPos.z;
    }
  }

  return {
    timesMs: timesMs.buffer,
    ecef: ecef.buffer,
  };
}

function sendError(
  message: string,
  requestId?: string,
  satelliteId?: string
) {
  const error: WorkerError = {
    type: 'error',
    requestId,
    satelliteId,
    message,
  };
  self.postMessage(error);
}
```

## 6. コンポーネントProps

### 6.1 GlobeRenderer.tsx

```typescript
interface GlobeRendererProps {
  satellites: Satellite[];
  currentTimeMs: number;
  aois?: AOIPolygon[];
  onPolygonClick?: (polygonId: string) => void;
  onCameraChange?: (camera: Cesium.Camera) => void;
}
```

### 6.2 SatelliteLayer.tsx

```typescript
interface SatelliteLayerProps {
  viewer: Cesium.Viewer;
  satellites: Satellite[];
  currentTimeMs: number;
  dayWindow: DayWindow;
  stepSec: number;
}
```

### 6.3 FootprintLayer.tsx

```typescript
interface FootprintLayerProps {
  viewer: Cesium.Viewer;
  satellite: Satellite;
  currentTimeMs: number;
  footprintData: FootprintDataFlat | null;
}
```

### 6.4 TimeSlider.tsx

```typescript
interface TimeSliderProps {
  currentTimeMs: number;
  displayRange: { startMs: number; endMs: number };
  onChange: (timeMs: number) => void;
  onDayChange?: (dayStartMs: number) => void;
}
```

### 6.5 SatelliteList.tsx

```typescript
interface SatelliteListProps {
  satellites: Satellite[];
  onToggleVisibility: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleFootprint: (id: string) => void;
  onToggleSwath: (id: string) => void;
}
```

## 7. イベント定義

### 7.1 カスタムイベント

```typescript
/**
 * 日窓変更イベント
 */
export interface DayWindowChangeEvent {
  previousDayStartMs: number;
  newDayStartMs: number;
}

/**
 * 衛星選択イベント
 */
export interface SatelliteSelectEvent {
  satelliteId: string;
  satellite: Satellite;
}

/**
 * 計算完了イベント
 */
export interface ComputationCompleteEvent {
  satelliteId: string;
  dayStartMs: number;
  duration: number; // 計算時間（ms）
}
```

## 8. 定数

### 8.1 時間関連

```typescript
export const TIME_CONSTANTS = {
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  DEFAULT_STEP_SEC: 30,
  SPEED_MULTIPLIERS: [1, 10, 100, 1000],
  MAX_FUTURE_DAYS: 14,
  CACHE_DAYS: 7,
};
```

### 8.2 描画関連

```typescript
export const RENDER_CONSTANTS = {
  SATELLITE_POINT_SIZE: 8,
  ORBIT_LINE_WIDTH: 2,
  FOOTPRINT_OPACITY: 0.3,
  SWATH_OPACITY: 0.2,
  POLYGON_STROKE_WIDTH: 2,
  HIGHLIGHT_MULTIPLIER: 1.5,
};
```

### 8.3 色定義

```typescript
export const DEFAULT_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33F5',
  '#F5FF33', '#33FFF5', '#FF8C33', '#8C33FF',
  '#33FF8C', '#FF3333',
];
```

## 9. エラーコード

```typescript
export enum ErrorCode {
  TLE_PARSE_ERROR = 'TLE_PARSE_ERROR',
  TLE_PROPAGATION_ERROR = 'TLE_PROPAGATION_ERROR',
  WORKER_TIMEOUT = 'WORKER_TIMEOUT',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  CACHE_ERROR = 'CACHE_ERROR',
  FOOTPRINT_CALCULATION_ERROR = 'FOOTPRINT_CALCULATION_ERROR',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```
