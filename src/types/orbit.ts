export interface OrbitData {
  timesMs: Float64Array;
  ecef: Float32Array; // [x,y,z,...] meters
}

export interface ECEFPosition {
  x: number;
  y: number;
  z: number;
}
