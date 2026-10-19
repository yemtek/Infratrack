import React, { useState } from 'react';
import { useInfra } from '../context/InfraContext';
import { Port, Device, CableType, VLAN } from '../types/infratrack';
import { 
  Network, 
  Unplug, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ArrowRight, 
  Wifi, 
  Sliders,
  Sparkles,
  Server,
  Layers,
  Cpu
} from 'lucide-react';

export const CableTracing: React.FC = () => {
  const {
    devices,
    ports,
    vlans,
    connectPorts,
    disconnectPort,
    selectedPortId,
    setSelectedPortId,
  } = useInfra();

  // Find switch and patch panel devices
  const switchDevices = devices.filter(
    (d) => d.deviceType === 'SWITCH' || d.deviceType === 'PATCH_PANEL' || d.deviceType === 'ROUTER'
  );

  const [activeSwitchId, setActiveSwitchId] = useState<string>(
    switchDevices[1]?.id || switchDevices[0]?.id || devices[0]?.id || ''
  );
  const [filterVlanId, setFilterVlanId] = useState<string>('ALL');
  const [isPatchModalOpen, setIsPatchModalOpen] = useState<boolean>(false);

  // Patching modal state
  const [patchTargetDeviceId, setPatchTargetDeviceId] = useState<string>('');
  const [patchTargetPortId, setPatchTargetPortId] = useState<string>('');
  const [patchCableType, setPatchCableType] = useState<CableType>('CAT6A');
  const [patchCableColor, setPatchCableColor] = useState<string>('#3b82f6');
  const [patchVlanId, setPatchVlanId] = useState<string>('vlan-20');

  const activeSwitch = devices.find((d) => d.id === activeSwitchId);
  const switchPorts = ports.filter((p) => p.deviceId === activeSwitchId).sort((a, b) => a.portNumber - b.portNumber);

  // Active selected port
  const currentSelectedPort = ports.find((p) => p.id === selectedPortId);
  const connectedPeerPort = currentSelectedPort?.connectedPortId
    ? ports.find((p) => p.id === currentSelectedPort.connectedPortId)
    : null;
  const connectedPeerDevice = connectedPeerPort
    ? devices.find((d) => d.id === connectedPeerPort.deviceId)
    : null;
  const currentPortVlan = vlans.find(
    (v) => v.id === (currentSelectedPort?.vlanId || connectedPeerPort?.vlanId)
  );

  // Available candidate devices for patching
  const candidateTargetDevices = devices.filter((d) => d.id !== activeSwitchId);
  const candidateTargetPorts = ports.filter(
    (p) => p.deviceId === patchTargetDeviceId && !p.connectedPortId
  );

  const handleSelectPort = (port: Port) => {
    setSelectedPortId(port.id);
  };

  const handleOpenPatchModal = () => {
    if (!currentSelectedPort) return;
    if (candidateTargetDevices.length > 0) {
      setPatchTargetDeviceId(candidateTargetDevices[0].id);
      const firstFree = ports.find(
        (p) => p.deviceId === candidateTargetDevices[0].id && !p.connectedPortId
      );
      if (firstFree) {
        setPatchTargetPortId(firstFree.id);
      }
    }
    setIsPatchModalOpen(true);
  };

  const handleApplyPatch = () => {
    if (!currentSelectedPort || !patchTargetPortId) return;
    connectPorts(
      currentSelectedPort.id,
      patchTargetPortId,
      patchCableType,
      patchCableColor,
      patchVlanId
    );
    setIsPatchModalOpen(false);
  };

  const handleDisconnectCurrent = () => {
    if (currentSelectedPort) {
      disconnectPort(currentSelectedPort.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Switch Selector & VLAN Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Network className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-white">Active Chassis:</span>
            <select
              value={activeSwitchId}
              onChange={(e) => {
                setActiveSwitchId(e.target.value);
                setSelectedPortId(null);
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
            >
              {switchDevices.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name} · {dev.model} (U{dev.startU})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-400">VLAN Filter:</span>
            <select
              value={filterVlanId}
              onChange={(e) => setFilterVlanId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All VLANs (Highlight)</option>
              {vlans.map((v) => (
                <option key={v.id} value={v.id}>
                  VLAN {v.vlanNumber} - {v.name} ({v.subnet})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>{switchPorts.filter((p) => p.connectedPortId).length} Connected</span>
          <span>·</span>
          <span>{switchPorts.filter((p) => !p.connectedPortId).length} Available</span>
        </div>
      </div>

      {/* Switch Faceplate Visualizer (48/24 Ports Grid) */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Network className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-white">
                {activeSwitch?.name}
              </h3>
              <p className="text-xs text-slate-400">{activeSwitch?.model} · IP: {activeSwitch?.ipAddress}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
              <span>Link UP</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-700" />
              <span>Unpatched</span>
            </span>
          </div>
        </div>

        {/* Physical Port Plate: Staggered Dual-Row (Odd on Top, Even on Bottom) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Top Row: Odd Ports (1, 3, 5, 7, ... 47) */}
            <div className="flex gap-1.5 mb-2">
              {switchPorts
                .filter((p) => p.portNumber % 2 !== 0)
                .map((port) => {
                  const isSelected = selectedPortId === port.id;
                  const isConnected = Boolean(port.connectedPortId);
                  const portVlan = vlans.find((v) => v.id === port.vlanId);
                  const isHighlightedByVlan =
                    filterVlanId === 'ALL' || port.vlanId === filterVlanId;

                  return (
                    <button
                      key={port.id}
                      onClick={() => handleSelectPort(port)}
                      title={`Port ${port.portNumber} (${port.label}) - ${
                        isConnected ? 'Patched' : 'Open'
                      } ${portVlan ? `[VLAN ${portVlan.vlanNumber}]` : ''}`}
                      className={`group relative flex flex-col items-center justify-between rounded border p-1 transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/80 ring-2 ring-cyan-400/50 scale-105 z-10'
                          : isConnected
                          ? 'border-slate-700 bg-slate-850 hover:border-slate-500'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                      } ${isHighlightedByVlan ? 'opacity-100' : 'opacity-25'}`}
                      style={{ width: '40px', height: '48px' }}
                    >
                      {/* Link LED */}
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          isConnected
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80'
                            : 'bg-slate-700'
                        }`}
                      />

                      {/* RJ45 / SFP Port Jack Icon Graphic */}
                      <div className="flex h-5 w-6 items-center justify-center rounded border border-slate-700 bg-slate-950">
                        <div className="h-2 w-3.5 border-t-2 border-slate-600 bg-slate-900" />
                      </div>

                      {/* Port Number */}
                      <span className="font-mono text-[9px] font-semibold text-slate-400 group-hover:text-cyan-300">
                        {port.portNumber}
                      </span>

                      {/* VLAN color dot if assigned */}
                      {portVlan && (
                        <div
                          className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: portVlan.colorHex }}
                        />
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Bottom Row: Even Ports (2, 4, 6, 8, ... 48) */}
            <div className="flex gap-1.5">
              {switchPorts
                .filter((p) => p.portNumber % 2 === 0)
                .map((port) => {
                  const isSelected = selectedPortId === port.id;
                  const isConnected = Boolean(port.connectedPortId);
                  const portVlan = vlans.find((v) => v.id === port.vlanId);
                  const isHighlightedByVlan =
                    filterVlanId === 'ALL' || port.vlanId === filterVlanId;

                  return (
                    <button
                      key={port.id}
                      onClick={() => handleSelectPort(port)}
                      title={`Port ${port.portNumber} (${port.label}) - ${
                        isConnected ? 'Patched' : 'Open'
                      } ${portVlan ? `[VLAN ${portVlan.vlanNumber}]` : ''}`}
                      className={`group relative flex flex-col items-center justify-between rounded border p-1 transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/80 ring-2 ring-cyan-400/50 scale-105 z-10'
                          : isConnected
                          ? 'border-slate-700 bg-slate-850 hover:border-slate-500'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                      } ${isHighlightedByVlan ? 'opacity-100' : 'opacity-25'}`}
                      style={{ width: '40px', height: '48px' }}
                    >
                      {/* Port Number */}
                      <span className="font-mono text-[9px] font-semibold text-slate-400 group-hover:text-cyan-300">
                        {port.portNumber}
                      </span>

                      {/* RJ45 / SFP Port Jack Graphic */}
                      <div className="flex h-5 w-6 items-center justify-center rounded border border-slate-700 bg-slate-950">
                        <div className="h-2 w-3.5 border-b-2 border-slate-600 bg-slate-900" />
                      </div>

                      {/* Link LED */}
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          isConnected
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80'
                            : 'bg-slate-700'
                        }`}
                      />

                      {/* VLAN color dot */}
                      {portVlan && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: portVlan.colorHex }}
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Cable Trace Result Banner & Diagram */}
      {currentSelectedPort ? (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-cyan-400" />
              <h4 className="font-semibold text-sm text-white">
                Port-to-Port Trace Details: Port {currentSelectedPort.portNumber} ({currentSelectedPort.label})
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {currentSelectedPort.connectedPortId ? (
                <button
                  onClick={handleDisconnectCurrent}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  <span>Unplug Cable</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenPatchModal}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500 transition"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Patch / Connect Cable</span>
                </button>
              )}
            </div>
          </div>

          {/* Trace Diagram */}
          {connectedPeerPort && connectedPeerDevice ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-7 items-center gap-4">
              {/* Left: Source Port Card (3 cols) */}
              <div className="md:col-span-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-2">
                  <Network className="h-3.5 w-3.5" />
                  <span>Switch Port (Local)</span>
                </div>
                <div className="font-mono text-sm font-bold text-white">
                  {activeSwitch?.name}
                </div>
                <div className="text-xs text-slate-400 mb-2">{activeSwitch?.model}</div>
                <div className="space-y-1 font-mono text-xs border-t border-slate-900 pt-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Port Label:</span>
                    <span className="font-semibold text-white">{currentSelectedPort.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Port Media:</span>
                    <span>{currentSelectedPort.portType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rack Location:</span>
                    <span>U{activeSwitch?.startU}</span>
                  </div>
                </div>
              </div>

              {/* Middle: Cable Run Indicator (1 col) */}
              <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
                <div 
                  className="h-1.5 w-full rounded-full transition-all"
                  style={{ backgroundColor: currentSelectedPort.cableColor || '#3b82f6' }}
                />
                <div className="my-1 text-center font-mono text-[10px] text-slate-400">
                  {currentSelectedPort.linkSpeed || '10Gbps'}
                </div>
                <div className="text-center font-mono text-[9px] text-slate-500 uppercase">
                  {currentSelectedPort.cableType || 'CAT6A'}
                </div>
                <ArrowRight className="h-4 w-4 text-cyan-400 mt-1" />
              </div>

              {/* Right: Target Device Card (3 cols) */}
              <div className="md:col-span-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                  <Server className="h-3.5 w-3.5" />
                  <span>Connected Endpoint (Remote)</span>
                </div>
                <div className="font-mono text-sm font-bold text-white">
                  {connectedPeerDevice.name}
                </div>
                <div className="text-xs text-slate-400 mb-2">{connectedPeerDevice.model}</div>
                <div className="space-y-1 font-mono text-xs border-t border-slate-900 pt-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Port:</span>
                    <span className="font-semibold text-white">{connectedPeerPort.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Endpoint IP:</span>
                    <span className="text-cyan-400">{connectedPeerDevice.ipAddress || 'DHCP/Dynamic'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rack Location:</span>
                    <span>U{connectedPeerDevice.startU} ({connectedPeerDevice.unitHeight}U)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-6 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-500 mb-2">
                <Unplug className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-slate-300">
                Port {currentSelectedPort.portNumber} is currently unpatched (no physical cable connection).
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Click &quot;Patch / Connect Cable&quot; to link this port to a server, storage array, or router.
              </p>
            </div>
          )}

          {/* VLAN Tagging & Broadcast Domain Information */}
          {currentPortVlan && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: currentPortVlan.colorHex }}
                />
                <span className="font-bold text-white font-mono">
                  802.1Q VLAN {currentPortVlan.vlanNumber}: {currentPortVlan.name}
                </span>
                <span className="text-slate-400">({currentPortVlan.subnet})</span>
              </div>
              <span className="text-slate-400 text-[11px]">
                {currentPortVlan.description}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-xs text-slate-400">
          <Network className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <p className="font-medium text-slate-300">Click any switch port above to trace its end-to-end cable connection</p>
          <p className="text-slate-500 text-[11px] mt-1">
            Visualizes patch panel links, endpoint network interfaces (vmnic, eno), link negotiation speed, and 802.1Q VLAN tags.
          </p>
        </div>
      )}

      {/* Patch / Connect Modal */}
      {isPatchModalOpen && currentSelectedPort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2 mb-4">
              <Link2 className="h-5 w-5 text-cyan-400" />
              <span>Patch Cable: Port {currentSelectedPort.portNumber}</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Endpoint Device</label>
                <select
                  value={patchTargetDeviceId}
                  onChange={(e) => {
                    const devId = e.target.value;
                    setPatchTargetDeviceId(devId);
                    const firstFree = ports.find(
                      (p) => p.deviceId === devId && !p.connectedPortId
                    );
                    if (firstFree) setPatchTargetPortId(firstFree.id);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  {candidateTargetDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.model}) - U{d.startU}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Device Port</label>
                <select
                  value={patchTargetPortId}
                  onChange={(e) => setPatchTargetPortId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  {candidateTargetPorts.length > 0 ? (
                    candidateTargetPorts.map((p) => (
                      <option key={p.id} value={p.id}>
                        Port {p.portNumber} ({p.label}) - {p.portType}
                      </option>
                    ))
                  ) : (
                    <option value="">No free ports on this device</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Cable Type</label>
                  <select
                    value={patchCableType}
                    onChange={(e) => setPatchCableType(e.target.value as CableType)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="CAT6A">Cat6A Copper</option>
                    <option value="FIBER_SINGLEMODE_OS2">Fiber OS2 Singlemode</option>
                    <option value="FIBER_MULTIMODE_OM4">Fiber OM4 Multimode</option>
                    <option value="DAC_TWINAX">Direct Attach Copper (DAC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Cable Jacket Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    {[
                      { name: 'Blue', hex: '#3b82f6' },
                      { name: 'Yellow', hex: '#eab308' },
                      { name: 'Green', hex: '#10b981' },
                      { name: 'Purple', hex: '#a855f7' },
                      { name: 'Amber', hex: '#f59e0b' },
                      { name: 'Cyan', hex: '#06b6d4' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setPatchCableColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          patchCableColor === c.hex ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">VLAN Assignment</label>
                <select
                  value={patchVlanId}
                  onChange={(e) => setPatchVlanId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 outline-none focus:border-cyan-500"
                >
                  {vlans.map((v) => (
                    <option key={v.id} value={v.id}>
                      VLAN {v.vlanNumber} - {v.name} ({v.subnet})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPatchModalOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!patchTargetPortId}
                onClick={handleApplyPatch}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-40"
              >
                Establish Patch Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
