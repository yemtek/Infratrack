import React, { useState } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Layers, 
  ArrowRight,
  Code2,
  TableProperties
} from 'lucide-react';

const PRISMA_SCHEMA_CODE = `// InfraTrack DCIM - Prisma Schema for PostgreSQL
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum DeviceStatus {
  ACTIVE
  PLANNED
  STAGED
  MAINTENANCE
  OFFLINE
}

enum DeviceType {
  SERVER
  SWITCH
  ROUTER
  FIREWALL
  PATCH_PANEL
  PDU_UPS
  STORAGE
}

enum PortType {
  RJ45_1G
  RJ45_10G
  SFP_PLUS_10G
  SFP28_25G
  QSFP28_100G
}

model Site {
  id        String   @id @default(uuid())
  name      String   // e.g. "Ashburn DC-1"
  location  String   // e.g. "Ashburn, VA"
  facility  String?
  racks     Rack[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("sites")
}

model Rack {
  id         String   @id @default(uuid())
  name       String   // e.g. "Rack A01"
  height     Int      @default(42) // Standard 42U rack
  siteId     String
  site       Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  devices    Device[]
  row        String?
  maxPowerKw Decimal? @default(10.0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([siteId])
  @@map("racks")
}

model Device {
  id             String       @id @default(uuid())
  name           String       // e.g. "SW-CORE-01"
  model          String       // e.g. "Arista 7050SX3-48YC8"
  manufacturer   String?
  serialNumber   String       @unique
  assetTag       String?      @unique
  deviceType     DeviceType   @default(SERVER)
  rackId         String
  rack           Rack         @relation(fields: [rackId], references: [id], onDelete: Cascade)
  startU         Int          // 1 to 42
  unitHeight     Int          @default(1) // 1U, 2U, etc.
  status         DeviceStatus @default(ACTIVE)
  ipAddress      String?
  macAddress     String?
  powerDrawWatts Int?         @default(350)
  ports          Port[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([rackId])
  @@index([status])
  @@map("devices")
}

model Port {
  id              String      @id @default(uuid())
  portNumber      Int         // e.g. 1..48
  label           String?     // e.g. "Gi1/0/1"
  portType        PortType    @default(RJ45_1G)
  deviceId        String
  device          Device      @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  
  // Port-to-Port cable connection
  connectedPortId String?     @unique
  connectedPort   Port?       @relation("PortToPortCable", fields: [connectedPortId], references: [id], onDelete: SetNull)
  remoteCablePeer Port?       @relation("PortToPortCable")

  // 802.1Q VLAN assignment
  vlanId          String?
  vlan            VLAN?       @relation(fields: [vlanId], references: [id], onDelete: SetNull)

  cableType       String?     @default("CAT6A")
  cableColor      String?     @default("#3b82f6")
  linkSpeed       String?     @default("10Gbps")
  isUp            Boolean     @default(true)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([deviceId])
  @@index([vlanId])
  @@map("ports")
}

model VLAN {
  id          String   @id @default(uuid())
  vlanNumber  Int      @unique // 1..4094
  name        String   // e.g. "PROD-APP"
  description String?
  subnet      String?  // e.g. "10.20.0.0/22"
  colorHex    String?  @default("#38bdf8")
  ports       Port[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("vlans")
}`;

const POSTGRESQL_DDL_CODE = `-- PostgreSQL DDL Schema for InfraTrack
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enum Types
CREATE TYPE device_status AS ENUM ('ACTIVE', 'PLANNED', 'STAGED', 'MAINTENANCE', 'OFFLINE');
CREATE TYPE device_type AS ENUM ('SERVER', 'SWITCH', 'ROUTER', 'FIREWALL', 'PATCH_PANEL', 'PDU_UPS', 'STORAGE');
CREATE TYPE port_type AS ENUM ('RJ45_1G', 'RJ45_10G', 'SFP_PLUS_10G', 'SFP28_25G', 'QSFP28_100G');

-- 1. Sites Table
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    facility VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Racks Table (Standard 42U default)
CREATE TABLE racks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    height INTEGER NOT NULL DEFAULT 42,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    row VARCHAR(50),
    max_power_kw NUMERIC(5,2) DEFAULT 10.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_racks_site_id ON racks(site_id);

-- 3. Devices Table
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    model VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(150),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    asset_tag VARCHAR(100) UNIQUE,
    device_type device_type NOT NULL DEFAULT 'SERVER',
    rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
    start_u INTEGER NOT NULL CHECK (start_u >= 1 AND start_u <= 42),
    unit_height INTEGER NOT NULL DEFAULT 1 CHECK (unit_height >= 1),
    status device_status NOT NULL DEFAULT 'ACTIVE',
    ip_address INET,
    mac_address MACADDR,
    power_draw_watts INTEGER DEFAULT 350,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_devices_rack_id ON devices(rack_id);
CREATE INDEX idx_devices_status ON devices(status);

-- 4. VLANs Table
CREATE TABLE vlans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vlan_number INTEGER UNIQUE NOT NULL CHECK (vlan_number >= 1 AND vlan_number <= 4094),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    subnet CIDR,
    color_hex VARCHAR(7) DEFAULT '#38bdf8',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Ports Table with Self-referencing Cable Connection & VLAN
CREATE TABLE ports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    port_number INTEGER NOT NULL,
    label VARCHAR(50),
    port_type port_type NOT NULL DEFAULT 'RJ45_1G',
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    connected_port_id UUID UNIQUE REFERENCES ports(id) ON DELETE SET NULL,
    vlan_id UUID REFERENCES vlans(id) ON DELETE SET NULL,
    cable_type VARCHAR(50) DEFAULT 'CAT6A',
    cable_color VARCHAR(20) DEFAULT '#3b82f6',
    link_speed VARCHAR(20) DEFAULT '10Gbps',
    is_up BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_device_port UNIQUE (device_id, port_number)
);
CREATE INDEX idx_ports_device_id ON ports(device_id);
CREATE INDEX idx_ports_vlan_id ON ports(vlan_id);`;

export const PrismaSchemaViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'ddl' | 'erd'>('schema');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = activeTab === 'schema' ? PRISMA_SCHEMA_CODE : POSTGRESQL_DDL_CODE;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeTab === 'schema' ? PRISMA_SCHEMA_CODE : POSTGRESQL_DDL_CODE;
    const filename = activeTab === 'schema' ? 'schema.prisma' : 'infratrack_schema.sql';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                PostgreSQL & Prisma Database Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Relational schema mapping Sites, Racks, Devices, Ports, and VLANs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-600 transition"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-5 flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'schema'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="h-4 w-4" />
            <span>schema.prisma</span>
          </button>
          <button
            onClick={() => setActiveTab('ddl')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'ddl'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TableProperties className="h-4 w-4" />
            <span>PostgreSQL DDL</span>
          </button>
          <button
            onClick={() => setActiveTab('erd')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'erd'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Entity Relationship Diagram</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'schema' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 overflow-x-auto shadow-2xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-500 font-mono">
            <span>prisma/schema.prisma</span>
            <span>Prisma v5+ · Provider: postgresql</span>
          </div>
          <pre className="font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            {PRISMA_SCHEMA_CODE}
          </pre>
        </div>
      )}

      {activeTab === 'ddl' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 overflow-x-auto shadow-2xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-500 font-mono">
            <span>migrations/001_init_infratrack.sql</span>
            <span>PostgreSQL 14+ / 15+ / 16+</span>
          </div>
          <pre className="font-mono text-xs text-emerald-300/90 leading-relaxed overflow-x-auto">
            {POSTGRESQL_DDL_CODE}
          </pre>
        </div>
      )}

      {activeTab === 'erd' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-6">
          <h3 className="font-bold text-sm text-white">Relational Data Flow & Cardinality</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Site Card */}
            <div className="rounded-xl border border-cyan-500/40 bg-slate-900/90 p-4 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  model Site
                </div>
                <ul className="font-mono text-[11px] text-slate-300 space-y-1">
                  <li className="text-yellow-400">id: UUID [PK]</li>
                  <li>name: String</li>
                  <li>location: String</li>
                  <li>facility: String?</li>
                </ul>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-cyan-300 font-mono flex items-center justify-between">
                <span>1 : N to Racks</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Rack Card */}
            <div className="rounded-xl border border-blue-500/40 bg-slate-900/90 p-4 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                  model Rack
                </div>
                <ul className="font-mono text-[11px] text-slate-300 space-y-1">
                  <li className="text-yellow-400">id: UUID [PK]</li>
                  <li>name: String</li>
                  <li>height: Int (42U)</li>
                  <li className="text-cyan-400">siteId: UUID [FK]</li>
                </ul>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-blue-300 font-mono flex items-center justify-between">
                <span>1 : N to Devices</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Device Card */}
            <div className="rounded-xl border border-emerald-500/40 bg-slate-900/90 p-4 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  model Device
                </div>
                <ul className="font-mono text-[11px] text-slate-300 space-y-1">
                  <li className="text-yellow-400">id: UUID [PK]</li>
                  <li>name: String</li>
                  <li>model: String</li>
                  <li>serialNumber: String</li>
                  <li className="text-blue-400">rackId: UUID [FK]</li>
                  <li>startU: Int (1..42)</li>
                  <li>unitHeight: Int</li>
                  <li>status: Status</li>
                </ul>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-300 font-mono flex items-center justify-between">
                <span>1 : N to Ports</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Port Card */}
            <div className="rounded-xl border border-purple-500/40 bg-slate-900/90 p-4 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                  model Port
                </div>
                <ul className="font-mono text-[11px] text-slate-300 space-y-1">
                  <li className="text-yellow-400">id: UUID [PK]</li>
                  <li>portNumber: Int</li>
                  <li className="text-emerald-400">deviceId: UUID [FK]</li>
                  <li className="text-rose-400">connectedPortId [FK]</li>
                  <li className="text-amber-400">vlanId: UUID [FK]</li>
                </ul>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-purple-300 font-mono flex items-center justify-between">
                <span>Peer 1 : 1 Cable</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* VLAN Card */}
            <div className="rounded-xl border border-amber-500/40 bg-slate-900/90 p-4 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  model VLAN
                </div>
                <ul className="font-mono text-[11px] text-slate-300 space-y-1">
                  <li className="text-yellow-400">id: UUID [PK]</li>
                  <li>vlanNumber: Int</li>
                  <li>name: String</li>
                  <li>subnet: CIDR</li>
                </ul>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-amber-300 font-mono">
                <span>1 : N to Ports</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
