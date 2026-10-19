export type DeviceStatus = 'ACTIVE' | 'PLANNED' | 'STAGED' | 'MAINTENANCE' | 'OFFLINE';

export type DeviceType = 
  | 'SERVER' 
  | 'SWITCH' 
  | 'ROUTER' 
  | 'FIREWALL' 
  | 'PATCH_PANEL' 
  | 'PDU_UPS' 
  | 'STORAGE';

export type PortType = 
  | 'RJ45_1G' 
  | 'RJ45_10G' 
  | 'SFP_PLUS_10G' 
  | 'SFP28_25G' 
  | 'QSFP28_100G';

export type CableType = 
  | 'CAT6A' 
  | 'FIBER_SINGLEMODE_OS2' 
  | 'FIBER_MULTIMODE_OM4' 
  | 'DAC_TWINAX';

export interface Site {
  id: string;
  name: string;
  location: string;
  facility?: string;
  rackIds: string[];
}

export interface Rack {
  id: string;
  name: string;
  height: number; // default 42
  siteId: string;
  row?: string;
  maxPowerKw?: number;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  assetTag: string;
  deviceType: DeviceType;
  rackId: string;
  startU: number; // 1 to 42 (bottom-most unit)
  unitHeight: number; // e.g. 1, 2, 3, 4
  status: DeviceStatus;
  ipAddress?: string;
  macAddress?: string;
  powerDrawWatts?: number;
  totalPorts?: number;
  ports?: Port[];
}

export interface Port {
  id: string;
  portNumber: number;
  label: string;
  portType: PortType;
  deviceId: string;
  connectedPortId?: string | null;
  vlanId?: string | null;
  cableType?: CableType;
  cableColor?: string; // hex color for cable tracing visual
  linkSpeed?: string;
  isUp?: boolean;
}

export interface VLAN {
  id: string;
  vlanNumber: number;
  name: string;
  description: string;
  subnet: string;
  colorHex: string;
}

export interface CableTraceResult {
  sourcePort: Port;
  sourceDevice: Device;
  targetPort: Port;
  targetDevice: Device;
  vlan?: VLAN;
  cableType: CableType;
  cableColor: string;
  linkSpeed: string;
}
