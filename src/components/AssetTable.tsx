import React, { useState } from 'react';
import { useInfra } from '../context/InfraContext';
import { Device, DeviceStatus, DeviceType } from '../types/infratrack';
import { 
  Server, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  ArrowUpDown, 
  Plus, 
  Download,
  Layers,
  MapPin
} from 'lucide-react';

interface AssetTableProps {
  onSelectDevice: (device: Device) => void;
  onOpenIntake: () => void;
}

export const AssetTable: React.FC<AssetTableProps> = ({
  onSelectDevice,
  onOpenIntake,
}) => {
  const {
    devices,
    sites,
    racks,
    deleteDevice,
    setSelectedDeviceId,
    setSelectedRackId,
    setActiveTab,
  } = useInfra();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeviceStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DeviceType>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');

  // Filter devices
  const filteredDevices = devices.filter((dev) => {
    if (statusFilter !== 'ALL' && dev.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && dev.deviceType !== typeFilter) return false;
    
    const rack = racks.find((r) => r.id === dev.rackId);
    if (siteFilter !== 'ALL' && rack?.siteId !== siteFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = dev.name.toLowerCase().includes(q);
      const matchModel = dev.model.toLowerCase().includes(q);
      const matchSerial = dev.serialNumber.toLowerCase().includes(q);
      const matchIp = dev.ipAddress?.toLowerCase().includes(q);
      return Boolean(matchName || matchModel || matchSerial || matchIp);
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['Name', 'Model', 'Manufacturer', 'Type', 'Serial', 'Asset Tag', 'Rack', 'Start U', 'Height', 'Status', 'IP', 'Power (W)'];
    const rows = filteredDevices.map((d) => {
      const rack = racks.find((r) => r.id === d.rackId);
      return [
        d.name,
        d.model,
        d.manufacturer,
        d.deviceType,
        d.serialNumber,
        d.assetTag || '',
        rack?.name || '',
        d.startU,
        d.unitHeight,
        d.status,
        d.ipAddress || '',
        d.powerDrawWatts || 0,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `infratrack_assets_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewInRack = (device: Device) => {
    setSelectedRackId(device.rackId);
    setSelectedDeviceId(device.id);
    setActiveTab('elevation');
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by name, model, serial, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 sm:w-72 rounded-lg border border-slate-700 bg-slate-800/90 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNED">Planned</option>
            <option value="STAGED">Staged</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OFFLINE">Offline</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Chassis Types</option>
            <option value="SERVER">Server</option>
            <option value="SWITCH">Switch</option>
            <option value="STORAGE">Storage</option>
            <option value="ROUTER">Router</option>
            <option value="FIREWALL">Firewall</option>
            <option value="PATCH_PANEL">Patch Panel</option>
            <option value="PDU_UPS">PDU / UPS</option>
          </select>

          {/* Site Filter */}
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Data Centers</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenIntake}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Assets High-Density Data Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono">
                <th className="py-2.5 px-4 font-semibold">Device Name</th>
                <th className="py-2.5 px-3 font-semibold">Model & Vendor</th>
                <th className="py-2.5 px-3 font-semibold">Type</th>
                <th className="py-2.5 px-3 font-semibold">Rack Location</th>
                <th className="py-2.5 px-3 font-semibold">Height</th>
                <th className="py-2.5 px-3 font-semibold">IP Address</th>
                <th className="py-2.5 px-3 font-semibold">Serial Number</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Power</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDevices.map((device) => {
                const rack = racks.find((r) => r.id === device.rackId);
                const site = rack ? sites.find((s) => s.id === rack.siteId) : null;

                return (
                  <tr
                    key={device.id}
                    className="hover:bg-slate-900/60 transition group cursor-pointer"
                    onClick={() => onSelectDevice(device)}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {device.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div>{device.model}</div>
                      <div className="text-[10px] text-slate-500">{device.manufacturer}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {device.deviceType}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      <div>{rack?.name || 'Unassigned'}</div>
                      <div className="text-[10px] text-slate-500">U{device.startU}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400 tabular-nums">
                      {device.unitHeight}U
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300 whitespace-nowrap">
                      {device.ipAddress || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {device.serialNumber}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          device.status === 'ACTIVE' ? 'text-emerald-400' :
                          device.status === 'MAINTENANCE' ? 'text-amber-400' :
                          device.status === 'STAGED' ? 'text-indigo-400' :
                          device.status === 'PLANNED' ? 'text-sky-400' : 'text-rose-400'
                        }`}
                      >
                        {device.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-right tabular-nums">
                      {device.powerDrawWatts ? `${device.powerDrawWatts} W` : '0 W'}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewInRack(device)}
                          title="View on 42U Rack Elevation"
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onSelectDevice(device)}
                          title="View Asset Details"
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDevices.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No hardware devices matching current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
