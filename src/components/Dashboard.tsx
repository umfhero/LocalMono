import React from 'react';
import Widget from './Widget';
import { AlertCircle, Clock, Hash, CheckCircle2 } from 'lucide-react';

const Dashboard = () => {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '24px', fontWeight: 500, margin: 0 }}>Overview</h1>
        <div className="text-dim" style={{ fontSize: '13px', marginTop: '4px' }}>
          Real-time system status and priorities
        </div>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        alignItems: 'start'
      }}>
        <Widget title="Overdue & Urgent" icon={<AlertCircle size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-urgent"><AlertCircle size={14} /></span>
                <span>Finalise Project Proposal</span>
              </div>
              <span className="font-mono text-dim" style={{ fontSize: '11px' }}>-2hrs</span>
            </div>
          </div>
        </Widget>

        <Widget title="Active God Files" progress={65}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-accent"><Hash size={14} /></span>
                <span>hackathon.mono</span>
              </div>
              <span className="font-mono text-dim" style={{ fontSize: '11px' }}>2d left</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-dim"><Hash size={14} /></span>
                <span>weekly-sync.mono</span>
              </div>
              <span className="font-mono text-dim" style={{ fontSize: '11px' }}>Active</span>
            </div>
          </div>
        </Widget>

        <Widget title="Upcoming Schedule" icon={<Clock size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-dim"><CheckCircle2 size={14} /></span>
                <span>Team Standup</span>
              </div>
              <span className="font-mono text-accent" style={{ fontSize: '11px' }}>14:00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-dim"><CheckCircle2 size={14} /></span>
                <span>Design Review</span>
              </div>
              <span className="font-mono text-dim" style={{ fontSize: '11px' }}>16:30</span>
            </div>
          </div>
        </Widget>
      </div>
    </div>
  );
};

export default Dashboard;
