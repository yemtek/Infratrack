import React, { useState } from 'react';
import { InfraProvider, useInfra } from './context/InfraContext';
import { Header } from './components/Header';
import { RackElevation } from './components/RackElevation';
import { CableTracing } from './components/CableTracing';
import { HardwareIntakeModal } from './components/HardwareIntakeModal';
import { PrismaSchemaViewer } from './components/PrismaSchemaViewer';
import { DeviceDetailsDrawer } from './components/DeviceDetailsDrawer';
import { AssetTable } from './components/AssetTable';
import { VlanManager } from './components/VlanManager';
import { Device } from './types/infratrack';

const InfraTrackApp: React.FC = () => {
  const { activeTab, selectedDeviceId, setSelectedDeviceId, devices, setSelectedPortId, setActiveTab } = useInfra();
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [intakeStartU, setIntakeStartU] = useState<number | undefined>(undefined);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || null;

  const handleOpenIntake = (targetU?: number) => {
    setIntakeStartU(targetU);
    setIsIntakeOpen(true);
  };

  const handleSelectDevice = (device: Device) => {
    setSelectedDeviceId(device.id);
  };

  const handleTracePort = (portId: string) => {
    setSelectedPortId(portId);
    setActiveTab('cables');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Header with Navigation and Rack selectors */}
      <Header onOpenIntake={() => handleOpenIntake()} />

      {/* Main Workspace Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'elevation' && (
          <RackElevation
            onSelectDevice={handleSelectDevice}
            onOpenIntake={handleOpenIntake}
            onTracePort={handleTracePort}
          />
        )}

        {activeTab === 'cables' && <CableTracing />}

        {activeTab === 'devices' && (
          <AssetTable
            onSelectDevice={handleSelectDevice}
            onOpenIntake={() => handleOpenIntake()}
          />
        )}

        {activeTab === 'vlans' && <VlanManager />}

        {activeTab === 'schema' && <PrismaSchemaViewer />}
      </main>

      {/* Hardware Intake Form Modal */}
      <HardwareIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => {
          setIsIntakeOpen(false);
          setIntakeStartU(undefined);
        }}
        initialStartU={intakeStartU}
      />

      {/* Device Inspector Drawer */}
      <DeviceDetailsDrawer
        device={selectedDevice}
        onClose={() => setSelectedDeviceId(null)}
        onTracePort={handleTracePort}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">InfraTrack</span>
            <span>·</span>
            <span>Enterprise DCIM & Asset Management</span>
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            EIA-310 19-Inch Standard · PostgreSQL / Prisma ORM Architecture
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <InfraProvider>
      <InfraTrackApp />
    </InfraProvider>
  );
}
