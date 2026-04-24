import React from 'react';

interface WidgetProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  progress?: number;
}

const Widget: React.FC<WidgetProps> = ({ title, icon, children, progress }) => {
  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: 'var(--border-std)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {icon}
        {title}
      </div>
      <div style={{ padding: '12px', flex: 1 }}>
        {children}
      </div>
      {progress !== undefined && (
        <div style={{
          height: '2px',
          width: '100%',
          backgroundColor: 'var(--bg-main)',
          position: 'absolute',
          bottom: 0,
          left: 0
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: 'var(--accent)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
    </div>
  );
};

export default Widget;
