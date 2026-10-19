import React, { createContext, useContext, useState, useEffect } from 'react';
import { Site, Rack, Device, Port, VLAN, DeviceStatus, DeviceType, CableType, CableTraceResult } from '../types/infratrack';
import { initialSites, initialRacks, initialDevices, initialPorts, initialVlans } from '../data/mockData';

interface InfraContextType {
  sites: Site[];
  racks: Rack[];
  devices: Device[];
  ports: Port[];
  vlans: VLAN[];
  selectedSiteId: string;
  selectedRackId: string;
  selectedDeviceId: string | null;
  selectedPortId: string | null;
  activeTab: 'elevation' | 'cables' | 'devices' | 'intake' | 'vlans' | 'schema';
  searchQuery: string;
  filterStatus: 'ALL' | DeviceStatus;
  filterType: 'ALL' | DeviceType;
  
  // Setters
  setSelectedSiteId: (id: string) => void;
  setSelectedRackId: (id: string) => void;
  setSelectedDeviceId: (id: string | null) => void;
  setSelectedPortId: (id: string | null) => void;
  setActiveTab: (tab: 'elevation' | 'cables' | 'devices' | 'intake' | 'vlans' | 'schema') => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: 'ALL' | DeviceStatus) => void;
  setFilterType: (type: 'ALL' | DeviceType) => void;

  // Actions
  addDevice: (newDeviceData: Omit<Device, 'id'>, portCount?: number) => Device;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  deleteDevice: (id: string) => void;
  connectPorts: (
    sourcePortId: string, 
    targetPortId: string, 
    cableType: CableType, 
    cableColor: string, 
    vlanId?: string
  ) => void;
  disconnectPort: (portId: string) => void;
  getTraceResult: (portId: string) => CableTraceResult | null;
  isRackSlotAvailable: (rackId: string, startU: number, unitHeight: number, ignoreDeviceId?: string) => boolean;
  findNextAvailableSlot: (rackId: string, unitHeight: number) => number | null;
  resetToMockData: () => void;
  
  // Helpers
  currentSite: Site | undefined;
  currentRack: Rack | undefined;
  rackDevices: Device[];
  occupiedUUnits: Set<number>;
}

const InfraContext = createContext<InfraContextType | undefined>(undefined);

const STORAGE_PREFIX = 'infratrack_v1_';

export const InfraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sites, setSites] = useState<Site[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}sites`);
    return saved ? JSON.parse(saved) : initialSites;
  });

  const [racks, setRacks] = useState<Rack[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}racks`);
    return saved ? JSON.parse(saved) : initialRacks;
  });

  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}devices`);
    return saved ? JSON.parse(saved) : initialDevices;
  });

  const [ports, setPorts] = useState<Port[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}ports`);
    return saved ? JSON.parse(saved) : initialPorts;
  });

  const [vlans, setVlans] = useState<VLAN[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}vlans`);
    return saved ? JSON.parse(saved) : initialVlans;
  });

  const [selectedSiteId, setSelectedSiteId] = useState<string>('site-1');
  const [selectedRackId, setSelectedRackId] = useState<string>('rack-1');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'elevation' | 'cables' | 'devices' | 'intake' | 'vlans' | 'schema'>('elevation');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | DeviceStatus>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | DeviceType>('ALL');

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}sites`, JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}racks`, JSON.stringify(racks));
  }, [racks]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}devices`, JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}ports`, JSON.stringify(ports));
  }, [ports]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}vlans`, JSON.stringify(vlans));
  }, [vlans]);

  const currentSite = sites.find((s) => s.id === selectedSiteId) || sites[0];
  const currentRack = racks.find((r) => r.id === selectedRackId) || racks[0];

  const rackDevices = devices.filter((d) => d.rackId === currentRack?.id);

  // Compute set of occupied U units for current rack
  const occupiedUUnits = new Set<number>();
  rackDevices.forEach((device) => {
    for (let u = device.startU; u < device.startU + device.unitHeight; u++) {
      occupiedUUnits.add(u);
    }
  });

  // Check if target U slot is available
  const isRackSlotAvailable = (
    rackId: string,
    startU: number,
    unitHeight: number,
    ignoreDeviceId?: string
  ): boolean => {
    const targetRack = racks.find((r) => r.id === rackId);
    const maxU = targetRack ? targetRack.height : 42;

    if (startU < 1 || startU + unitHeight - 1 > maxU) {
      return false;
    }

    const otherDevices = devices.filter(
      (d) => d.rackId === rackId && (!ignoreDeviceId || d.id !== ignoreDeviceId)
    );

    for (let u = startU; u < startU + unitHeight; u++) {
      const collision = otherDevices.some(
        (d) => u >= d.startU && u < d.startU + d.unitHeight
      );
      if (collision) return false;
    }

    return true;
  };

  // Find next contiguous free slot in rack
  const findNextAvailableSlot = (rackId: string, unitHeight: number): number | null => {
    const targetRack = racks.find((r) => r.id === rackId);
    const maxU = targetRack ? targetRack.height : 42;

    for (let u = 1; u <= maxU - unitHeight + 1; u++) {
      if (isRackSlotAvailable(rackId, u, unitHeight)) {
        return u;
      }
    }
    return null;
  };

  // Add device and optionally initialize default ports
  const addDevice = (newDeviceData: Omit<Device, 'id'>, portCount: number = 8): Device => {
    const newId = `dev-${Date.now()}`;
    const newDevice: Device = {
      ...newDeviceData,
      id: newId,
      totalPorts: portCount,
    };

    // Auto-create ports for the device
    const newPorts: Port[] = [];
    for (let i = 1; i <= Math.min(portCount, 48); i++) {
      const portType = newDevice.deviceType === 'SWITCH' 
        ? (i > 40 ? 'SFP28_25G' : 'RJ45_10G') 
        : (newDevice.deviceType === 'STORAGE' ? 'SFP28_25G' : 'RJ45_10G');
      
      newPorts.push({
        id: `port-${newId}-${i}`,
        portNumber: i,
        label: newDevice.deviceType === 'SWITCH' ? `Gi1/0/${i}` : `eth${i - 1}`,
        portType,
        deviceId: newId,
        connectedPortId: null,
        vlanId: 'vlan-20',
        cableType: 'CAT6A',
        isUp: newDevice.status === 'ACTIVE',
      });
    }

    setDevices((prev) => [...prev, newDevice]);
    setPorts((prev) => [...prev, ...newPorts]);
    return newDevice;
  };

  const updateDevice = (id: string, updates: Partial<Device>) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const deleteDevice = (id: string) => {
    // Also disconnect connected ports
    const devicePorts = ports.filter((p) => p.deviceId === id);
    const devicePortIds = new Set(devicePorts.map((p) => p.id));

    setPorts((prev) =>
      prev
        .filter((p) => p.deviceId !== id)
        .map((p) => {
          if (p.connectedPortId && devicePortIds.has(p.connectedPortId)) {
            return { ...p, connectedPortId: null, isUp: false };
          }
          return p;
        })
    );

    setDevices((prev) => prev.filter((d) => d.id !== id));
    if (selectedDeviceId === id) {
      setSelectedDeviceId(null);
    }
  };

  const connectPorts = (
    sourcePortId: string,
    targetPortId: string,
    cableType: CableType,
    cableColor: string,
    vlanId?: string
  ) => {
    setPorts((prev) =>
      prev.map((port) => {
        if (port.id === sourcePortId) {
          return {
            ...port,
            connectedPortId: targetPortId,
            cableType,
            cableColor,
            vlanId: vlanId || port.vlanId,
            isUp: true,
          };
        }
        if (port.id === targetPortId) {
          return {
            ...port,
            connectedPortId: sourcePortId,
            cableType,
            cableColor,
            vlanId: vlanId || port.vlanId,
            isUp: true,
          };
        }
        return port;
      })
    );
  };

  const disconnectPort = (portId: string) => {
    const targetPort = ports.find((p) => p.id === portId);
    const peerPortId = targetPort?.connectedPortId;

    setPorts((prev) =>
      prev.map((p) => {
        if (p.id === portId || (peerPortId && p.id === peerPortId)) {
          return {
            ...p,
            connectedPortId: null,
            cableType: undefined,
            cableColor: undefined,
            isUp: false,
          };
        }
        return p;
      })
    );
  };

  const getTraceResult = (portId: string): CableTraceResult | null => {
    const sourcePort = ports.find((p) => p.id === portId);
    if (!sourcePort) return null;

    const sourceDevice = devices.find((d) => d.id === sourcePort.deviceId);
    if (!sourceDevice) return null;

    if (!sourcePort.connectedPortId) {
      return null;
    }

    const targetPort = ports.find((p) => p.id === sourcePort.connectedPortId);
    if (!targetPort) return null;

    const targetDevice = devices.find((d) => d.id === targetPort.deviceId);
    if (!targetDevice) return null;

    const vlan = vlans.find((v) => v.id === sourcePort.vlanId || v.id === targetPort.vlanId);

    return {
      sourcePort,
      sourceDevice,
      targetPort,
      targetDevice,
      vlan,
      cableType: sourcePort.cableType || targetPort.cableType || 'CAT6A',
      cableColor: sourcePort.cableColor || targetPort.cableColor || '#3b82f6',
      linkSpeed: sourcePort.linkSpeed || targetPort.linkSpeed || '10Gbps',
    };
  };

  const resetToMockData = () => {
    setSites(initialSites);
    setRacks(initialRacks);
    setDevices(initialDevices);
    setPorts(initialPorts);
    setVlans(initialVlans);
    setSelectedSiteId('site-1');
    setSelectedRackId('rack-1');
    setSelectedDeviceId(null);
    setSelectedPortId(null);
    localStorage.removeItem(`${STORAGE_PREFIX}sites`);
    localStorage.removeItem(`${STORAGE_PREFIX}racks`);
    localStorage.removeItem(`${STORAGE_PREFIX}devices`);
    localStorage.removeItem(`${STORAGE_PREFIX}ports`);
    localStorage.removeItem(`${STORAGE_PREFIX}vlans`);
  };

  return (
    <InfraContext.Provider
      value={{
        sites,
        racks,
        devices,
        ports,
        vlans,
        selectedSiteId,
        selectedRackId,
        selectedDeviceId,
        selectedPortId,
        activeTab,
        searchQuery,
        filterStatus,
        filterType,
        setSelectedSiteId,
        setSelectedRackId,
        setSelectedDeviceId,
        setSelectedPortId,
        setActiveTab,
        setSearchQuery,
        setFilterStatus,
        setFilterType,
        addDevice,
        updateDevice,
        deleteDevice,
        connectPorts,
        disconnectPort,
        getTraceResult,
        isRackSlotAvailable,
        findNextAvailableSlot,
        resetToMockData,
        currentSite,
        currentRack,
        rackDevices,
        occupiedUUnits,
      }}
    >
      {children}
    </InfraContext.Provider>
  );
};

export const useInfra = () => {
  const context = useContext(InfraContext);
  if (!context) {
    throw new Error('useInfra must be used within an InfraProvider');
  }
  return context;
};
