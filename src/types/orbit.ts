export interface OrbitData {
  timesMs: Float64Array;
  ecef: Float32Array; // [x,y,z,...] meters
}

export interface ECEFPosition {
  x: number;
  y: number;
  z: number;
}

export interface FootprintData {
  timesMs: Float64Array;
  rings: Float32Array;    // [lon, lat, lon, lat, ...] 全ポリゴンの座標列
  offsets: Int32Array;    // 各ポリゴンの開始インデックス（座標ペア単位）
  counts: Int32Array;     // 各ポリゴンの座標ペア数
  timeSizes: Int32Array;  // 各タイムステップのポリゴン数（dateline分割で1または2）
}
