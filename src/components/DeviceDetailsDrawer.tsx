import React, { useState } from 'react';
import { useInfra } from '../context/InfraContext';
import { Device, DeviceStatus } from '../types/infratrack';
import { 
  X, 
  Server, 
  Cpu, 
  Network, 
  Zap, 
  HardDrive, 
  Trash2, 
  Edit3, 
  ArrowUpRight,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DeviceDetailsDrawerProps {
  device: Device | null;
  onClose: () => void;
  onTracePort: (portId: string) => void;
}

export const DeviceDetailsDrawer: React.FC<DeviceDetailsDrawerProps> = ({
  device,
  onClose,
  onTracePort,
}) => {
  const {
    currentRack,
    currentSite,
    ports,
    vlans,
    updateDevice,
    deleteDevice,
    setActiveTab,
    setSelectedPortId,
    isRackSlotAvailable,
  } = useInfra();

  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState<DeviceStatus>(device?.status || 'ACTIVE');
  const [editedIp, setEditedIp] = useState(device?.ipAddress || '');
  const [editedStartU, setEditedStartU] = useState(device?.startU || 1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!device) return null;

  const devicePorts = ports.filter((p) => p.deviceId === device.id).sort((a, b) => a.portNumber - b.portNumber);

  const handleSave = () => {
    // Check if moving Start U collides
    if (editedStartU !== device.startU) {
      const available = isRackSlotAvailable(device.rackId, editedStartU, device.unitHeight, device.id);
      if (!available) {
        setErrorMsg(`Target unit U${editedStartU} to U${editedStartU + device.unitHeight - 1} is already occupied!`);
        return;
      }
    }

    updateDevice(device.id, {
      status: editedStatus,
      ipAddress: editedIp.trim() || undefined,
      startU: editedStartU,
    });
    setIsEditing(false);
    setErrorMsg(null);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to decommission and delete ${device.name}? This will unplug all connected cables.`)) {
      deleteDevice(device.id);
      onClose();
    }
  };

  const handleTraceClick = (portId: string) => {
    setSelectedPortId(portId);
    setActiveTab('cables');
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-slate-900 border-l border-slate-800 shadow-2xl backdrop-blur-md">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-bold text-white">
                {device.name}
              </h3>
              <span className="font-mono text-xs text-cyan-400 font-semibold">
                U{device.startU}{device.unitHeight > 1 ? `-U${device.startU + device.unitHeight - 1}` : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400">{device.model}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => {
                setEditedStatus(device.status);
                setEditedIp(device.ipAddress || '');
                setEditedStartU(device.startU);
                setIsEditing(true);
              }}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500 transition"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status & Rack Positioning */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <h4 className="font-semibold text-slate-200">Hardware Identity & Location</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block mb-1">Operational Status</span>
              {isEditing ? (
                <select
                  value={editedStatus}
                  onChange={(e) => setEditedStatus(e.target.value as DeviceStatus)}
                  className="w-full rounded border border-slate-700 bg-slate-800 p-1.5 text-slate-200 outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PLANNED">PLANNED</option>
                  <option value="STAGED">STAGED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              ) : (
                <span className="font-mono font-semibold text-emerald-400">{device.status}</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Rack Location (Start U)</span>
              {isEditing ? (
                <input
                  type="number"
                  min={1}
                  max={42}
                  value={editedStartU}
                  onChange={(e) => setEditedStartU(parseInt(e.target.value) || 1)}
                  className="w-full rounded border border-slate-700 bg-slate-800 p-1.5 text-slate-200 font-mono outline-none"
                />
              ) : (
                <span className="font-mono text-slate-200">{currentRack?.name} · U{device.startU} ({device.unitHeight}U)</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">IP Address</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedIp}
                  onChange={(e) => setEditedIp(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 p-1.5 text-slate-200 font-mono outline-none"
                />
              ) : (
                <span className="font-mono text-cyan-400">{device.ipAddress || 'Unassigned'}</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">MAC Address</span>
              <span className="font-mono text-slate-300">{device.macAddress || 'N/A'}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Serial Number</span>
              <span className="font-mono text-slate-200">{device.serialNumber}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Asset Tag</span>
              <span className="font-mono text-slate-200">{device.assetTag || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Environmental & Power Metrics */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Power & Thermal Profile</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5">
              <span className="text-slate-400 text-[11px]">Rated Draw</span>
              <div className="font-mono text-base font-bold text-white mt-0.5">
                {device.powerDrawWatts || 0} Watts
              </div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5">
              <span className="text-slate-400 text-[11px]">Heat Dissipation</span>
              <div className="font-mono text-base font-bold text-white mt-0.5">
                {Math.round((device.powerDrawWatts || 0) * 3.412)} BTU/hr
              </div>
            </div>
          </div>
        </div>

        {/* Network Interfaces & Connected Cables */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Network className="h-4 w-4 text-cyan-400" />
              <span>Installed Network Ports ({devicePorts.length})</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {devicePorts.filter((p) => p.connectedPortId).length} Active Links
            </span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {devicePorts.map((port) => {
              const vlan = vlans.find((v) => v.id === port.vlanId);
              const isConnected = Boolean(port.connectedPortId);

              return (
                <div
                  key={port.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 p-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isConnected ? 'bg-emerald-400' : 'bg-slate-700'
                      }`}
                    />
                    <span className="font-mono font-bold text-slate-200">{port.label}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({port.portType})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {vlan && (
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${vlan.colorHex}20`,
                          color: vlan.colorHex,
                        }}
                      >
                        VLAN {vlan.vlanNumber}
                      </span>
                    )}

                    <button
                      onClick={() => handleTraceClick(port.id)}
                      className="flex items-center gap-1 rounded bg-slate-800 hover:bg-cyan-600 px-2 py-1 text-[11px] text-slate-300 hover:text-white transition"
                    >
                      <span>Trace</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decommission Danger Zone */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
          <span className="text-slate-500 text-[11px]">Decommission from Data Center</span>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Decommission Asset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
