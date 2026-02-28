import type { OffnadirRange } from "../lib/tle/offnadir-ranges";

export interface TLEData {
  line1: string;
  line2: string;
}

export interface Satellite {
  id: string;
  name: string;
  catalogNumber?: number;
  tle: TLEData;
  offnadirRanges: OffnadirRange[];
  color: string;
  visible: boolean;
  selected: boolean;
  showFootprint: boolean;
  showSwath: boolean;
}
