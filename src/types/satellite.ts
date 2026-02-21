export interface TLEData {
  line1: string;
  line2: string;
}

export interface Satellite {
  id: string;
  name: string;
  tle: TLEData;
  color: string;
  visible: boolean;
  selected: boolean;
  showFootprint: boolean;
}
