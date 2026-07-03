'use client';

import { ModuleConfig, ModuleId } from '@/types';
import { Gauge, Sparkles, Droplets, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

interface SidebarProps {
  modules: ModuleConfig[];
  activeId: ModuleId;
  onChange: (id: ModuleId) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const MODULE_ICONS: Record<ModuleId, React.ReactNode> = {
  satisfaction: <ClipboardList size={22} />,
  driver:      <Gauge size={22} />,
  cleanliness: <Sparkles size={22} />,
  restroom:    <Droplets size={22} />,
};

export default function Sidebar({ modules, activeId, onChange, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      style={{
        width: collapsed ? 56 : 200,
        flexShrink: 0,
        background: '#0F2419',
        display: 'flex',
        flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'stretch',
        gap: 4,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 200,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        paddingTop: 8,
        paddingBottom: 16,
      }}
    >
      {/* Collapse / expand arrow — top of sidebar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-end',
        padding: collapsed ? '0' : '0 8px',
        marginBottom: 4,
        flexShrink: 0,
        height: 40,
      }}>
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid #1B4332',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: collapsed ? 32 : 'calc(100% - 16px)', height: 1, background: '#1B4332', margin: collapsed ? '0 auto 6px' : '0 8px 6px', flexShrink: 0 }} />

      {/* Module buttons */}
      {modules.map((mod) => {
        const isActive = mod.id === activeId;
        return (
          <button
            key={mod.id}
            onClick={() => onChange(mod.id as ModuleId)}
            title={mod.label}
            style={{
              width: collapsed ? 40 : 'calc(100% - 16px)',
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: isActive ? mod.color : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              padding: collapsed ? '0' : '0 12px',
              margin: collapsed ? '2px auto' : '2px 8px',
              transition: 'all 0.18s',
              opacity: mod.available ? 1 : 0.45,
              position: 'relative',
              color: isActive ? '#fff' : '#9CA3AF',
              flexShrink: 0,
            }}
          >
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {MODULE_ICONS[mod.id as ModuleId]}
            </span>

            {!collapsed && (
              <span style={{
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#fff' : '#9CA3AF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {mod.label}
              </span>
            )}

            {/* Active pill */}
            {isActive && (
              <span style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 20,
                borderRadius: '2px 0 0 2px',
                background: mod.colorLight,
              }} />
            )}

            {/* Lock badge */}
            {!mod.available && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: collapsed ? 2 : 8,
                fontSize: 9,
                background: '#374151',
                color: '#9CA3AF',
                borderRadius: 4,
                padding: '1px 3px',
                lineHeight: 1.4,
              }}>
                🔒
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
