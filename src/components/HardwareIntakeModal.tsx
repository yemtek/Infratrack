import React, { useState, useEffect } from 'react';
import { useInfra } from '../context/InfraContext';
import { DeviceType, DeviceStatus } from '../types/infratrack';
import { 
  Plus, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  Sparkles,
  Zap,
  HardDrive
} from 'lucide-react';

interface HardwareIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartU?: number;
}

interface HardwareTemplate {
  name: string;
  model: string;
  manufacturer: string;
  deviceType: DeviceType;
  unitHeight: number;
  powerDrawWatts: number;
  totalPorts: number;
  ipPlaceholder: string;
}

const TEMPLATES: HardwareTemplate[] = [
  {
    name: 'ESXI-COMPUTE-NODE',
    model: 'Dell PowerEdge R750 2x Xeon 6330',
    manufacturer: 'Dell Technologies',
    deviceType: 'SERVER',
    unitHeight: 2,
    powerDrawWatts: 580,
    totalPorts: 8,
    ipPlaceholder: '10.20.1.15',
  },
  {
    name: 'SW-ACCESS-TOR',
    model: 'Cisco Catalyst 9300-48P PoE+',
    manufacturer: 'Cisco Systems',
    deviceType: 'SWITCH',
    unitHeight: 1,
    powerDrawWatts: 380,
    totalPorts: 48,
    ipPlaceholder: '10.10.10.4',
  },
  {
    name: 'SW-SPINE-AGG',
    model: 'Arista 7050SX3-48YC8 25G/100G',
    manufacturer: 'Arista Networks',
    deviceType: 'SWITCH',
    unitHeight: 1,
    powerDrawWatts: 420,
    totalPorts: 48,
    ipPlaceholder: '10.10.10.5',
  },
  {
    name: 'SAN-STORAGE-NODE',
    model: 'HPE ProLiant DL380 Gen10 NVMe Storage',
    manufacturer: 'Hewlett Packard Enterprise',
    deviceType: 'STORAGE',
    unitHeight: 2,
    powerDrawWatts: 640,
    totalPorts: 6,
    ipPlaceholder: '10.30.1.103',
  },
  {
    name: 'FW-SECURITY-GW',
    model: 'FortiGate 200F NGFW Enterprise',
    manufacturer: 'Fortinet',
    deviceType: 'FIREWALL',
    unitHeight: 2,
    powerDrawWatts: 240,
    totalPorts: 16,
    ipPlaceholder: '10.40.10.2',
  },
  {
    name: 'PP-KEYSTONE-24',
    model: 'Panduit NetKey 24-Port Cat6A 1U',
    manufacturer: 'Panduit',
    deviceType: 'PATCH_PANEL',
    unitHeight: 1,
    powerDrawWatts: 0,
    totalPorts: 24,
    ipPlaceholder: '',
  },
  {
    name: 'UPS-SMART-3KVA',
    model: 'APC Smart-UPS RT 3000VA On-Line 2U',
    manufacturer: 'Schneider Electric / APC',
    deviceType: 'PDU_UPS',
    unitHeight: 2,
    powerDrawWatts: 85,
    totalPorts: 2,
    ipPlaceholder: '10.10.10.252',
  },
];

export const HardwareIntakeModal: React.FC<HardwareIntakeModalProps> = ({
  isOpen,
  onClose,
  initialStartU,
}) => {
  const {
    sites,
    racks,
    selectedSiteId,
    selectedRackId,
    addDevice,
    isRackSlotAvailable,
    findNextAvailableSlot,
    devices,
  } = useInfra();

  const [siteId, setSiteId] = useState<string>(selectedSiteId);
  const [rackId, setRackId] = useState<string>(selectedRackId);
  const [name, setName] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('Dell Technologies');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [assetTag, setAssetTag] = useState<string>('');
  const [deviceType, setDeviceType] = useState<DeviceType>('SERVER');
  const [status, setStatus] = useState<DeviceStatus>('ACTIVE');
  const [startU, setStartU] = useState<number>(initialStartU || 1);
  const [unitHeight, setUnitHeight] = useState<number>(2);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [macAddress, setMacAddress] = useState<string>('');
  const [powerDrawWatts, setPowerDrawWatts] = useState<number>(450);
  const [totalPorts, setTotalPorts] = useState<number>(8);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initialStartU when modal opens
  useEffect(() => {
    if (initialStartU) {
      setStartU(initialStartU);
    } else {
      const freeSlot = findNextAvailableSlot(rackId, unitHeight);
      if (freeSlot) setStartU(freeSlot);
    }
    // Generate random serial and asset tag for convenience
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSerialNumber(`SN-${Date.now().toString().slice(-6)}-${randomHex}`);
    setAssetTag(`AST-${Math.floor(1000 + Math.random() * 9000)}`);
  }, [isOpen, initialStartU, rackId, unitHeight]);

  if (!isOpen) return null;

  // Collision check
  const isAvailable = isRackSlotAvailable(rackId, startU, unitHeight);

  // Apply template helper
  const handleApplyTemplate = (tmpl: HardwareTemplate) => {
    setName(`${tmpl.name}-${Math.floor(10 + Math.random() * 89)}`);
    setModel(tmpl.model);
    setManufacturer(tmpl.manufacturer);
    setDeviceType(tmpl.deviceType);
    setUnitHeight(tmpl.unitHeight);
    setPowerDrawWatts(tmpl.powerDrawWatts);
    setTotalPorts(tmpl.totalPorts);
    setIpAddress(tmpl.ipPlaceholder);

    const slot = findNextAvailableSlot(rackId, tmpl.unitHeight);
    if (slot) setStartU(slot);
  };

  const handleAutoFindSlot = () => {
    const slot = findNextAvailableSlot(rackId, unitHeight);
    if (slot) {
      setStartU(slot);
      setErrorMsg(null);
    } else {
      setErrorMsg(`No contiguous ${unitHeight}U space available in this rack!`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('Device name is required');
      return;
    }
    if (!model.trim()) {
      setErrorMsg('Model name is required');
      return;
    }
    if (!serialNumber.trim()) {
      setErrorMsg('Serial number is required');
      return;
    }

    // Check duplicate serial
    if (devices.some((d) => d.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase())) {
      setErrorMsg('Serial number must be globally unique. This serial is already registered.');
      return;
    }

    // Check collision
    if (!isAvailable) {
      setErrorMsg(`Collision: Rack unit range U${startU} to U${startU + unitHeight - 1} is already occupied!`);
      return;
    }

    addDevice(
      {
        name: name.trim(),
        model: model.trim(),
        manufacturer: manufacturer.trim(),
        serialNumber: serialNumber.trim(),
        assetTag: assetTag.trim(),
        deviceType,
        rackId,
        startU,
        unitHeight,
        status,
        ipAddress: ipAddress.trim() || undefined,
        macAddress: macAddress.trim() || undefined,
        powerDrawWatts,
      },
      totalPorts
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Hardware Intake & Provisioning
              </h3>
              <p className="text-xs text-slate-400">
                Register a new physical appliance, server, or switch into the DCIM database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets Carousel */}
        <div className="my-4 border-b border-slate-800 pb-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Quick Hardware Templates:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="rounded border border-slate-700 bg-slate-800/70 px-2 py-1 text-[11px] text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition"
              >
                {tmpl.manufacturer.split(' ')[0]} {tmpl.unitHeight}U {tmpl.deviceType}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Error / Collision Alert */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Location & Rack Unit Placement */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>Rack Location & Unit Coordinates</span>
              {isAvailable ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-normal">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>U{startU}–U{startU + unitHeight - 1} Slot Available</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-rose-400 font-normal">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Slot Occupied / Out of bounds</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Site</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Rack</label>
                <select
                  value={rackId}
                  onChange={(e) => setRackId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (42U)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Start Unit (RU)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={1}
                    max={42}
                    value={startU}
                    onChange={(e) => setStartU(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFindSlot}
                    title="Auto-find next free slot"
                    className="rounded border border-slate-700 bg-slate-800 px-2 text-[10px] text-cyan-400 hover:bg-slate-700 whitespace-nowrap"
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Chassis Height</label>
                <select
                  value={unitHeight}
                  onChange={(e) => setUnitHeight(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
                >
                  <option value={1}>1U (Standard)</option>
                  <option value={2}>2U (Enterprise Server)</option>
                  <option value={3}>3U (Storage Chassis)</option>
                  <option value={4}>4U (Blade / High-Density)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Device Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Device Hostname / Name *</label>
              <input
                type="text"
                placeholder="e.g. ESXI-COMPUTE-04"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Hardware Model *</label>
              <input
                type="text"
                placeholder="e.g. Dell PowerEdge R750"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Manufacturer</label>
              <input
                type="text"
                placeholder="e.g. Dell Technologies, Cisco, Arista"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Device Type</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="SERVER">Server / Compute</option>
                <option value="SWITCH">Network Switch</option>
                <option value="STORAGE">Storage Array (SAN/NAS)</option>
                <option value="ROUTER">Edge Router</option>
                <option value="FIREWALL">Firewall / Security</option>
                <option value="PATCH_PANEL">Patch Panel</option>
                <option value="PDU_UPS">PDU / UPS Power</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Serial Number (Unique) *</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Asset Tag</label>
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Network & Power Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeviceStatus)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="ACTIVE">Active (Live in service)</option>
                <option value="PLANNED">Planned (Future install)</option>
                <option value="STAGED">Staged (In lab testing)</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OFFLINE">Offline (Powered down)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Primary IP Address</label>
              <input
                type="text"
                placeholder="10.20.1.50"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">MAC Address</label>
              <input
                type="text"
                placeholder="00:1A:2B:3C:4D:5E"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Power Draw (Watts)</label>
              <input
                type="number"
                min={0}
                max={5000}
                value={powerDrawWatts}
                onChange={(e) => setPowerDrawWatts(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Port Count Configuration */}
          <div>
            <label className="block text-slate-400 mb-1">
              Network Ports to Auto-Provision
            </label>
            <div className="flex items-center gap-3">
              {[2, 4, 8, 16, 24, 48].map((count) => (
                <label key={count} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="portCount"
                    checked={totalPorts === count}
                    onChange={() => setTotalPorts(count)}
                    className="accent-cyan-500"
                  />
                  <span>{count} Ports</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isAvailable}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              <span>Complete Hardware Intake</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
