import React from 'react';
import { useInfra } from '../context/InfraContext';
import { Network, Server, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

export const VlanManager: React.FC = () => {
  const { vlans, ports, devices, setActiveTab, setSelectedPortId } = useInfra();

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              802.1Q VLAN Network Segments & Broadcast Domains
            </h2>
            <p className="text-xs text-slate-400">
              Virtual LAN isolation, IP subnetting, and switch port assignments
            </p>
          </div>
        </div>
      </div>

      {/* VLAN Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vlans.map((vlan) => {
          // Find all ports assigned to this VLAN
          const memberPorts = ports.filter((p) => p.vlanId === vlan.id);
          // Find unique devices with ports on this VLAN
          const memberDeviceIds = Array.from(new Set(memberPorts.map((p) => p.deviceId)));
          const memberDevices = devices.filter((d) => memberDeviceIds.includes(d.id));

          return (
            <div
              key={vlan.id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                {/* Header with Color Tag */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: vlan.colorHex }}
                    />
                    <span className="font-mono text-xs font-bold text-white">
                      VLAN {vlan.vlanNumber}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-cyan-400">
                    {vlan.subnet}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="font-mono text-sm font-bold text-slate-100">
                    {vlan.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{vlan.description}</p>
                </div>

                {/* Member Devices */}
                <div className="mt-4 pt-3 border-t border-slate-900">
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono mb-2">
                    <span>MEMBER INTERFACES:</span>
                    <span className="text-slate-300 font-bold">{memberPorts.length} Ports</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {memberDevices.map((dev) => (
                      <span
                        key={dev.id}
                        className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                      >
                        {dev.name}
                      </span>
                    ))}
                    {memberDevices.length === 0 && (
                      <span className="text-slate-600 text-[11px]">No ports assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    const firstPort = memberPorts[0];
                    if (firstPort) {
                      setSelectedPortId(firstPort.id);
                    }
                    setActiveTab('cables');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  <span>Inspect Ports & Cables</span>
                  <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
