import React from 'react';
import { useInfra } from '../context/InfraContext';
import { 
  Server, 
  Plus, 
  MapPin, 
  Layers, 
  RotateCcw,
  Zap,
  Activity,
  Search
} from 'lucide-react';

interface HeaderProps {
  onOpenIntake: (targetU?: number) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenIntake }) => {
  const {
    sites,
    racks,
    selectedSiteId,
    selectedRackId,
    setSelectedSiteId,
    setSelectedRackId,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    currentRack,
    rackDevices,
    resetToMockData,
  } = useInfra();

  // Filter racks by selected site
  const siteRacks = racks.filter((r) => r.siteId === selectedSiteId);

  // Compute Rack Metrics
  const totalOccupiedU = rackDevices.reduce((sum, d) => sum + d.unitHeight, 0);
  const occupancyPct = currentRack ? Math.round((totalOccupiedU / currentRack.height) * 100) : 0;
  const totalPowerW = rackDevices.reduce((sum, d) => sum + (d.powerDrawWatts || 0), 0);
  const totalPowerKw = (totalPowerW / 1000).toFixed(2);

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSiteId = e.target.value;
    setSelectedSiteId(newSiteId);
    const firstRack = racks.find((r) => r.siteId === newSiteId);
    if (firstRack) {
      setSelectedRackId(firstRack.id);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Server className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            InfraTrack
          </span>
          <span className="hidden sm:inline text-xs text-slate-500 font-mono">
            DCIM·v2.4
          </span>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('elevation')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              activeTab === 'elevation' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            42U Elevation
          </button>
          <button
            onClick={() => setActiveTab('cables')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              activeTab === 'cables' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Cable Tracing
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              activeTab === 'devices' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Asset Matrix
          </button>
          <button
            onClick={() => setActiveTab('vlans')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              activeTab === 'vlans' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            VLAN Topology
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              activeTab === 'schema' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Prisma Schema
          </button>
        </nav>

        {/* Zone 3: Primary action button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenIntake()}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-500 active:scale-95 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Intake Device</span>
          </button>
        </div>
      </div>

      {/* Sub-Header: Contextual Breadcrumbs, Selectors & Rack Telemetry */}
      <div className="border-t border-slate-900 bg-slate-900/60 px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
          {/* Site and Rack Pickers */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Site:</span>
              <select
                value={selectedSiteId}
                onChange={handleSiteChange}
                className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Rack:</span>
              <select
                value={selectedRackId}
                onChange={(e) => setSelectedRackId(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
              >
                {siteRacks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.name} ({rack.height}U standard)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Metrics */}
            <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-800 font-mono text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-cyan-400" />
                <span className="text-slate-300 font-semibold tabular-nums">{totalOccupiedU}/{currentRack?.height || 42}U</span>
                <span className="text-slate-400">({occupancyPct}% utilized)</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" />
                <span className="text-slate-300 font-semibold tabular-nums">{totalPowerKw} kW</span>
                <span className="text-slate-400">/ {currentRack?.maxPowerKw || 10} kW Cap</span>
              </span>
            </div>
          </div>

          {/* Search bar & Reset */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search device, IP, serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 sm:w-56 rounded-md border border-slate-800 bg-slate-900/90 pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={resetToMockData}
              title="Reset to default mock data"
              className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
