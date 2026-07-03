'use client';

import { useState } from 'react';
import { MODULES, ModuleId } from '@/types';
import Sidebar from '@/components/Sidebar';
import ComingSoonModule from '@/components/ComingSoonModule';
import DriverModule from '@/modules/driver/DriverModule';
import SatisfactionModule from '@/modules/satisfaction/SatisfactionModule';

export default function Home() {
  const [activeModule, setActiveModule] = useState<ModuleId>('driver');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const mod = MODULES.find((m) => m.id === activeModule)!;
  const sidebarWidth = sidebarCollapsed ? 56 : 200;

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      <Sidebar
        modules={MODULES}
        activeId={activeModule}
        onChange={setActiveModule}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: '#0F2419', height: 48, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>{mod.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D1FAE5' }}>{mod.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#fff', fontWeight: 500 }}>
            College of Human Ecology · UPLB
          </span>
        </header>

        <div style={{ flex: 1, padding: '20px' }}>
          <main style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 'calc(100vh - 128px)' }}>
            {activeModule === 'driver'       && <DriverModule />}
            {activeModule === 'satisfaction' && <SatisfactionModule />}
            {activeModule === 'cleanliness'  && <ComingSoonModule module={MODULES.find((m) => m.id === 'cleanliness')!} />}
            {activeModule === 'restroom'     && <ComingSoonModule module={MODULES.find((m) => m.id === 'restroom')!} />}
          </main>
        </div>

        <footer style={{ textAlign: 'center', padding: '12px 0 20px', color: '#94A3B8', fontSize: 11 }}>
          CHE Feedback Hub  · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
