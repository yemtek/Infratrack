import React, { useState } from 'react';
import { useInfra } from '../context/InfraContext';
import { Device, DeviceStatus, DeviceType } from '../types/infratrack';
import { 
  Server, 
  Cpu, 
  Sliders, 
  Plus, 
  Eye, 
  Zap, 
  Thermometer, 
  HardDrive, 
  Wifi, 
  Info,
  Layers,
  Activity,
  ArrowUpDown
} from 'lucide-react';

interface RackElevationProps {
  onSelectDevice: (device: Device) => void;
  onOpenIntake: (targetU?: number) => void;
  onTracePort?: (portId: string) => void;
}

export const RackElevation: React.FC<RackElevationProps> = ({
  onSelectDevice,
  onOpenIntake,
}) => {
  const {
    currentRack,
    currentSite,
    rackDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    searchQuery,
    filterStatus,
    filterType,
  } = useInfra();

  const [numberingDirection, setNumberingDirection] = useState<'TOP_DOWN' | 'BOTTOM_UP'>('TOP_DOWN');
  const [elevationSide, setElevationSide] = useState<'FRONT' | 'REAR'>('FRONT');
  const [colorMode, setColorMode] = useState<'DEFAULT' | 'TYPE' | 'STATUS'>('DEFAULT');

  const totalHeight = currentRack?.height || 42;

  // Generate array of U numbers
  const uUnits = Array.from({ length: totalHeight }, (_, i) => 
    numberingDirection === 'TOP_DOWN' ? totalHeight - i : i + 1
  );

  // Map each occupied U to its owning device
  const uToDeviceMap = new Map<number, Device>();
  rackDevices.forEach((dev) => {
    for (let u = dev.startU; u < dev.startU + dev.unitHeight; u++) {
      uToDeviceMap.set(u, dev);
    }
  });

  // Calculate metrics
  const occupiedUnitsCount = rackDevices.reduce((sum, d) => sum + d.unitHeight, 0);
  const freeUnitsCount = totalHeight - occupiedUnitsCount;
  const occupancyPct = Math.round((occupiedUnitsCount / totalHeight) * 100);
  const totalPowerW = rackDevices.reduce((sum, d) => sum + (d.powerDrawWatts || 0), 0);
  const totalBtu = Math.round(totalPowerW * 3.412);

  // Find contiguous free blocks
  const contiguousFreeBlocks: { start: number; count: number }[] = [];
  let currentBlockStart: number | null = null;
  let currentBlockCount = 0;

  for (let u = 1; u <= totalHeight; u++) {
    if (!uToDeviceMap.has(u)) {
      if (currentBlockStart === null) currentBlockStart = u;
      currentBlockCount++;
    } else {
      if (currentBlockStart !== null) {
        contiguousFreeBlocks.push({ start: currentBlockStart, count: currentBlockCount });
        currentBlockStart = null;
        currentBlockCount = 0;
      }
    }
  }
  if (currentBlockStart !== null) {
    contiguousFreeBlocks.push({ start: currentBlockStart, count: currentBlockCount });
  }

  // Filter check for dimming
  const isDeviceMatchingFilter = (device: Device): boolean => {
    if (filterStatus !== 'ALL' && device.status !== filterStatus) return false;
    if (filterType !== 'ALL' && device.deviceType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = device.name.toLowerCase().includes(q);
      const matchModel = device.model.toLowerCase().includes(q);
      const matchIp = device.ipAddress?.toLowerCase().includes(q);
      const matchSerial = device.serialNumber.toLowerCase().includes(q);
      return Boolean(matchName || matchModel || matchIp || matchSerial);
    }
    return true;
  };

  // Helper for status colors
  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Active', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
      case 'MAINTENANCE':
        return { label: 'Maintenance', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      case 'PLANNED':
        return { label: 'Planned', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' };
      case 'STAGED':
        return { label: 'Staged', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
      case 'OFFLINE':
        return { label: 'Offline', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
    }
  };

  // Helper for type color styles
  const getTypeColor = (type: DeviceType) => {
    switch (type) {
      case 'SWITCH': return 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200';
      case 'ROUTER': return 'border-blue-500/50 bg-blue-950/40 text-blue-200';
      case 'FIREWALL': return 'border-rose-500/50 bg-rose-950/40 text-rose-200';
      case 'SERVER': return 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200';
      case 'STORAGE': return 'border-purple-500/50 bg-purple-950/40 text-purple-200';
      case 'PATCH_PANEL': return 'border-slate-500/50 bg-slate-900/60 text-slate-300';
      case 'PDU_UPS': return 'border-amber-500/50 bg-amber-950/40 text-amber-200';
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: 42U Vertical Rack Elevation Enclosure (7 cols) */}
      <div className="lg:col-span-8 flex flex-col items-center">
        {/* Controls bar above rack */}
        <div className="mb-4 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{currentRack?.name}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{currentSite?.name}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Front / Rear Toggle */}
            <div className="flex items-center rounded border border-slate-700 bg-slate-800 p-0.5">
              <button
                onClick={() => setElevationSide('FRONT')}
                className={`rounded px-2 py-1 font-medium transition ${
                  elevationSide === 'FRONT'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setElevationSide('REAR')}
                className={`rounded px-2 py-1 font-medium transition ${
                  elevationSide === 'REAR'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rear
              </button>
            </div>

            {/* Numbering Direction Toggle */}
            <button
              onClick={() =>
                setNumberingDirection(
                  numberingDirection === 'TOP_DOWN' ? 'BOTTOM_UP' : 'TOP_DOWN'
                )
              }
              title="Toggle U numbering direction (42->1 or 1->42)"
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>{numberingDirection === 'TOP_DOWN' ? '42→1' : '1→42'}</span>
            </button>

            {/* Color Highlight Mode */}
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as any)}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none"
            >
              <option value="DEFAULT">Hardware Bezel</option>
              <option value="TYPE">Color by Type</option>
              <option value="STATUS">Color by Status</option>
            </select>
          </div>
        </div>

        {/* 42U Physical Rack Cabinet Frame */}
        <div className="relative w-full max-w-2xl rounded-t-xl border-4 border-b-8 border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-cyan-950/20">
          {/* Rack Top Roof Ventilation / Eyebolt header */}
          <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2 px-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-700" />
              <div className="h-2 w-2 rounded-full bg-slate-700" />
              <span className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
                EIA-310-D 19&quot; CABINET · 42U
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
              <span>{occupancyPct}% OCCUPIED</span>
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500/80" />
              </div>
            </div>
          </div>

          {/* Vertical Rack Structure with Side Rails & Mounting Slots */}
          <div className="relative flex flex-col bg-slate-900/50 border border-slate-800">
            {uUnits.map((uNumber) => {
              const deviceAtU = uToDeviceMap.get(uNumber);
              const isStartU = deviceAtU && deviceAtU.startU === uNumber;
              const isOccupiedByDevice = Boolean(deviceAtU);

              // If this unit is part of a multi-U device but NOT the top-rendered row in our loop,
              // we handle it cleanly:
              // When numbering TOP_DOWN (42 -> 1):
              // For a 2U device with startU=13, it occupies U13 and U14.
              // In TOP_DOWN, U14 is encountered first.
              const isDeviceTopEdge = deviceAtU
                ? numberingDirection === 'TOP_DOWN'
                  ? uNumber === deviceAtU.startU + deviceAtU.unitHeight - 1
                  : uNumber === deviceAtU.startU
                : false;

              // If it's part of a device and NOT the top edge, we don't render a new box;
              // the multi-U container will occupy the full height!
              if (deviceAtU && !isDeviceTopEdge) {
                return null;
              }

              if (deviceAtU && isDeviceTopEdge) {
                const isSelected = selectedDeviceId === deviceAtU.id;
                const matchesFilter = isDeviceMatchingFilter(deviceAtU);
                const heightPx = deviceAtU.unitHeight * 40; // 40px per 1U
                const statusInfo = getStatusBadge(deviceAtU.status);

                return (
                  <div
                    key={`device-${deviceAtU.id}`}
                    onClick={() => {
                      setSelectedDeviceId(deviceAtU.id);
                      onSelectDevice(deviceAtU);
                    }}
                    style={{ height: `${heightPx}px` }}
                    className={`group relative flex w-full cursor-pointer items-center border-y transition-all ${
                      isSelected
                        ? 'border-cyan-400 z-10 ring-2 ring-cyan-500/50'
                        : 'border-slate-800/90 hover:border-slate-600'
                    } ${
                      matchesFilter ? 'opacity-100' : 'opacity-30'
                    }`}
                  >
                    {/* Left Rail Post with U Number and Cage Nut Holes */}
                    <div 
                      style={{ height: `${heightPx}px` }}
                      className="flex w-10 shrink-0 flex-col items-center justify-between border-r border-slate-800 bg-slate-900 px-1 py-1 font-mono text-[10px] text-slate-400 select-none"
                    >
                      <div className="flex flex-col items-center justify-between h-full">
                        <span className="font-semibold text-slate-300 tabular-nums">{uNumber}U</span>
                        <div className="flex flex-col gap-1 py-0.5 opacity-40 group-hover:opacity-80">
                          <div className="h-1 w-1 rounded-sm bg-slate-500" />
                          <div className="h-1 w-1 rounded-sm bg-slate-500" />
                          <div className="h-1 w-1 rounded-sm bg-slate-500" />
                        </div>
                        {deviceAtU.unitHeight > 1 && (
                          <span className="text-[9px] text-slate-600 tabular-nums">
                            {deviceAtU.unitHeight}U
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hardware Bezel Faceplate */}
                    <div className="relative flex h-full flex-1 items-center justify-between overflow-hidden px-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
                      {/* Rack Mount Ear Screws */}
                      <div className="absolute left-1 top-2 h-1.5 w-1.5 rounded-full border border-slate-600 bg-slate-800" />
                      <div className="absolute left-1 bottom-2 h-1.5 w-1.5 rounded-full border border-slate-600 bg-slate-800" />
                      <div className="absolute right-1 top-2 h-1.5 w-1.5 rounded-full border border-slate-600 bg-slate-800" />
                      <div className="absolute right-1 bottom-2 h-1.5 w-1.5 rounded-full border border-slate-600 bg-slate-800" />

                      {/* Device Visual by Type */}
                      <div className="flex items-center gap-3 z-10 pl-2">
                        {/* Status LED */}
                        <div 
                          className={`h-2.5 w-2.5 rounded-full ${
                            deviceAtU.status === 'ACTIVE' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/80' :
                            deviceAtU.status === 'MAINTENANCE' ? 'bg-amber-500' :
                            deviceAtU.status === 'STAGED' ? 'bg-indigo-500' :
                            deviceAtU.status === 'PLANNED' ? 'bg-sky-500' : 'bg-rose-500'
                          }`} 
                          title={`Status: ${deviceAtU.status}`}
                        />

                        {/* Device Info */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white tracking-wide">
                              {deviceAtU.name}
                            </span>
                            <span className="font-mono text-[10px] text-cyan-400/90 hidden sm:inline">
                              {deviceAtU.ipAddress || 'No IP'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                            {deviceAtU.model}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Faceplate Detail (Drive bays, Ports, or Vents) */}
                      <div className="flex items-center gap-2 pr-2 z-10">
                        {/* Device type visual cues */}
                        {deviceAtU.deviceType === 'SWITCH' && (
                          <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded">
                            <Wifi className="h-3 w-3 text-cyan-400" />
                            <span className="font-mono text-[10px] text-slate-300">
                              {deviceAtU.totalPorts || 48}P
                            </span>
                            {/* Mini simulated port lights */}
                            <div className="hidden sm:flex gap-0.5 ml-1">
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1 w-1 rounded-full ${
                                    i % 2 === 0 ? 'bg-emerald-400' : 'bg-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {deviceAtU.deviceType === 'SERVER' && (
                          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded">
                            <Server className="h-3 w-3 text-emerald-400" />
                            {/* Simulated 2.5" SFF Drive Caddies */}
                            <div className="hidden sm:flex gap-1">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="h-4 w-2 border border-slate-700 bg-slate-850 flex flex-col justify-end p-0.5"
                                >
                                  <div className="h-0.5 w-full bg-emerald-500/80" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {deviceAtU.deviceType === 'PATCH_PANEL' && (
                          <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded">
                            <Layers className="h-3 w-3 text-slate-400" />
                            <span className="font-mono text-[10px] text-slate-300">Keystone 24</span>
                          </div>
                        )}

                        {deviceAtU.deviceType === 'STORAGE' && (
                          <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded">
                            <HardDrive className="h-3 w-3 text-purple-400" />
                            <span className="font-mono text-[10px] text-purple-300">NVMe Array</span>
                          </div>
                        )}

                        {deviceAtU.deviceType === 'PDU_UPS' && (
                          <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded">
                            <Zap className="h-3 w-3 text-amber-400" />
                            <span className="font-mono text-[10px] text-amber-300">
                              {deviceAtU.powerDrawWatts || 300}W
                            </span>
                          </div>
                        )}

                        {/* Power metric */}
                        <div className="hidden md:flex flex-col items-end font-mono text-[9px] text-slate-400">
                          <span>{deviceAtU.powerDrawWatts ? `${deviceAtU.powerDrawWatts}W` : 'Passive'}</span>
                          <span className={statusInfo.text}>{statusInfo.label}</span>
                        </div>
                      </div>

                      {/* Visual Texture Grille in background */}
                      <div 
                        className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:6px_6px]" 
                      />
                    </div>

                    {/* Right Rail Post */}
                    <div 
                      style={{ height: `${heightPx}px` }}
                      className="flex w-10 shrink-0 flex-col items-center justify-between border-l border-slate-800 bg-slate-900 px-1 py-1 font-mono text-[10px] text-slate-400 select-none"
                    >
                      <div className="flex flex-col items-center justify-between h-full">
                        <span className="font-semibold text-slate-300 tabular-nums">{uNumber}U</span>
                        <div className="flex flex-col gap-1 py-0.5 opacity-40 group-hover:opacity-80">
                          <div className="h-1 w-1 rounded-sm bg-slate-500" />
                          <div className="h-1 w-1 rounded-sm bg-slate-500" />
                          <div className="h-1 w-1 rounded-sm bg-slate-500" />
                        </div>
                        {deviceAtU.unitHeight > 1 && (
                          <span className="text-[9px] text-slate-600 tabular-nums">
                            {deviceAtU.unitHeight}U
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Empty U Slot
              return (
                <div
                  key={`empty-${uNumber}`}
                  className="group relative flex h-10 w-full items-center border-y border-slate-800/40 bg-slate-950 hover:bg-slate-900/60 transition"
                >
                  {/* Left Rail Post */}
                  <div className="flex h-full w-10 shrink-0 items-center justify-center border-r border-slate-800/60 bg-slate-950 font-mono text-[10px] text-slate-600 select-none group-hover:text-cyan-400">
                    <span className="tabular-nums">{uNumber}</span>
                  </div>

                  {/* Empty Mounting Space */}
                  <div className="flex h-full flex-1 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-2 opacity-25 group-hover:opacity-50">
                        <div className="h-1.5 w-1.5 rounded-sm bg-slate-600" />
                        <div className="h-1.5 w-1.5 rounded-sm bg-slate-600" />
                        <div className="h-1.5 w-1.5 rounded-sm bg-slate-600" />
                      </div>
                      <span className="font-mono text-[11px] text-slate-600 group-hover:text-slate-400">
                        Available Slot
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenIntake(uNumber)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white px-2 py-1 text-[11px] font-medium transition"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Mount at U{uNumber}</span>
                    </button>
                  </div>

                  {/* Right Rail Post */}
                  <div className="flex h-full w-10 shrink-0 items-center justify-center border-l border-slate-800/60 bg-slate-950 font-mono text-[10px] text-slate-600 select-none group-hover:text-cyan-400">
                    <span className="tabular-nums">{uNumber}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cabinet Base with Heavy Duty Leveling Feet */}
          <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 px-3 text-slate-600 font-mono text-[10px]">
            <span>FRONT INTAKE AIRFLOW</span>
            <span>BOTTOM CABLE GLAND</span>
          </div>
        </div>
      </div>

      {/* Right Column: Rack Telemetry, Slot Map & Inspector (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        {/* Rack Utilization Summary Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Rack Utilization</span>
            </h3>
            <span className="font-mono text-xs text-cyan-400 font-bold">
              {occupiedUnitsCount}/{totalHeight} U
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Occupancy</span>
              <span className="font-mono font-bold text-white">{occupancyPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Power Draw</span>
              </div>
              <div className="font-mono text-base font-bold text-white tabular-nums">
                {(totalPowerW / 1000).toFixed(2)} kW
              </div>
              <div className="text-[10px] text-slate-500">
                {(totalPowerW / 208).toFixed(1)} A @ 208V
              </div>
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                <span>Thermal Output</span>
              </div>
              <div className="font-mono text-base font-bold text-white tabular-nums">
                {totalBtu.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">BTU / hr</div>
            </div>
          </div>

          {/* Available Contiguous Space */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-xs font-medium text-slate-300 mb-2">
              Available Contiguous Slots ({freeUnitsCount}U Free):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contiguousFreeBlocks.map((block, idx) => (
                <button
                  key={idx}
                  onClick={() => onOpenIntake(block.start)}
                  className="rounded border border-slate-700 bg-slate-800/80 px-2 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition"
                >
                  U{block.start}
                  {block.count > 1 ? `-U${block.start + block.count - 1}` : ''} ({block.count}U)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Device Quick Card (if any selected) */}
        {selectedDeviceId && (
          <div className="rounded-xl border border-cyan-500/40 bg-slate-900/90 p-4 shadow-lg shadow-cyan-950/20">
            {(() => {
              const device = rackDevices.find((d) => d.id === selectedDeviceId);
              if (!device) return null;
              const status = getStatusBadge(device.status);

              return (
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono text-sm font-bold text-white">
                          {device.name}
                        </h4>
                        <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${status.bg} ${status.text} ${status.border} border`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{device.model}</p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-cyan-400">
                      U{device.startU}
                      {device.unitHeight > 1 ? `-U${device.startU + device.unitHeight - 1}` : ''}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Manufacturer:</span>
                      <span className="text-slate-200">{device.manufacturer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Serial Number:</span>
                      <span className="font-mono text-slate-200">{device.serialNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Asset Tag:</span>
                      <span className="font-mono text-slate-200">{device.assetTag || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP Address:</span>
                      <span className="font-mono text-cyan-400">{device.ipAddress || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">MAC Address:</span>
                      <span className="font-mono text-slate-300">{device.macAddress || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Power Rating:</span>
                      <span className="font-mono text-slate-200">{device.powerDrawWatts || 0} Watts</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                    <button
                      onClick={() => onSelectDevice(device)}
                      className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium text-white transition text-center"
                    >
                      Device Details
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick Inventory Breakdown in this Rack */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-slate-400" />
            <span>Chassis Composition</span>
          </h4>
          <div className="space-y-1.5 text-xs">
            {['SWITCH', 'SERVER', 'STORAGE', 'ROUTER', 'FIREWALL', 'PATCH_PANEL', 'PDU_UPS'].map((typeKey) => {
              const count = rackDevices.filter((d) => d.deviceType === typeKey).length;
              if (count === 0) return null;
              return (
                <div key={typeKey} className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">{typeKey.replace('_', ' ')}</span>
                  <span className="font-mono font-semibold text-slate-200">{count} units</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
