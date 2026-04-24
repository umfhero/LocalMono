import React, { useState } from 'react';
import { LayoutDashboard, FileText, Calendar, Plus, Settings } from 'lucide-react';

const Sidebar = () => {
  const [active, setActive] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'notes', icon: FileText, label: 'God Files' },
    { id: 'calendar', icon: Calendar, label: 'Timetable' },
  ];

  return (
    <div style={{
      width: '240px',
      borderRight: 'var(--border-std)',
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0'
    }}>
      <div style={{ padding: '0 16px 24px', fontWeight: 600, color: 'var(--text-main)' }}>
        LOCALMONO
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map(item => (
          <div
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              color: active === item.id ? 'var(--text-main)' : 'var(--text-dim)',
              position: 'relative',
              transition: 'var(--transition-fast)'
            }}
          >
            {active === item.id && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: 'var(--accent)'
              }} />
            )}
            <item.icon size={16} />
            <span style={{ fontSize: '13px' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'flex', gap: '8px' }}>
        <button style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'var(--bg-card)',
          border: 'var(--border-std)',
          color: 'var(--text-main)',
          padding: '8px',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: '13px',
          transition: 'var(--transition-fast)'
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--text-dim)'}
        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <Plus size={14} /> Quick Add
        </button>
        <button style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          padding: '8px',
          transition: 'var(--transition-fast)'
        }}
        onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
