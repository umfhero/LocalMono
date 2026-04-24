import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LayoutDashboard, FileText, Calendar, PlusSquare } from "lucide-react";

type Page = "dashboard" | "notes" | "events" | "quick-note";

function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '64px',
        backgroundColor: 'var(--bg-main)',
        borderRight: 'var(--border-std)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: '16px'
      }}>
        <NavButton 
          icon={<LayoutDashboard size={24} />} 
          isActive={activePage === "dashboard"} 
          onClick={() => setActivePage("dashboard")} 
          title="Dashboard"
        />
        <NavButton 
          icon={<FileText size={24} />} 
          isActive={activePage === "notes"} 
          onClick={() => setActivePage("notes")} 
          title="God Files (Notes)"
        />
        <NavButton 
          icon={<Calendar size={24} />} 
          isActive={activePage === "events"} 
          onClick={() => setActivePage("events")} 
          title="Events & Timetable"
        />
        <div style={{ flex: 1 }} />
        <NavButton 
          icon={<PlusSquare size={24} />} 
          isActive={activePage === "quick-note"} 
          onClick={() => setActivePage("quick-note")} 
          title="Quick Note"
        />
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        backgroundColor: 'var(--bg-main)',
        padding: '32px',
        overflowY: 'auto'
      }}>
        {activePage === "dashboard" && <DashboardPlaceholder />}
        {activePage === "notes" && <NotesPlaceholder />}
        {activePage === "events" && <EventsPlaceholder />}
        {activePage === "quick-note" && <QuickNotePlaceholder />}
      </main>
    </div>
  );
}

// Reusable Components
function NavButton({ icon, isActive, onClick, title }: { icon: React.ReactNode, isActive: boolean, onClick: () => void, title: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        color: isActive ? 'var(--accent)' : 'var(--text-dim)',
        cursor: 'pointer',
        padding: '8px',
        position: 'relative',
        transition: 'var(--transition-fast)'
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute',
          left: '-8px', // Adjust to edge of sidebar
          top: '4px',
          bottom: '4px',
          width: '2px',
          backgroundColor: 'var(--accent)'
        }} />
      )}
      {icon}
    </button>
  );
}

// Placeholders for Pages
function DashboardPlaceholder() {
  return (
    <div>
      <h1 style={{ fontWeight: 500, marginBottom: '24px' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card title="Upcoming Events" content="No upcoming events today." />
        <Card title="Active Projects" content="No active time spans." />
        <Card title="Quick Inbox" content="Empty." />
      </div>
    </div>
  );
}

function NotesPlaceholder() {
  return (
    <div>
      <h1 style={{ fontWeight: 500, marginBottom: '24px' }}>God Files</h1>
      <Card title="hackathon.god" content="A structured document testing grounds." />
    </div>
  );
}

function EventsPlaceholder() {
  return (
    <div>
      <h1 style={{ fontWeight: 500, marginBottom: '24px' }}>Events & Timetable</h1>
      <Card title="Calendar Layer" content="Secondary view for booking around schedules." />
    </div>
  );
}

function QuickNotePlaceholder() {
  return (
    <div>
      <h1 style={{ fontWeight: 500, marginBottom: '24px' }}>Quick Capture</h1>
      <textarea 
        autoFocus
        style={{
          width: '100%',
          minHeight: '200px',
          backgroundColor: 'var(--bg-card)',
          border: 'var(--border-std)',
          color: 'var(--text-main)',
          padding: '16px',
          outline: 'none',
          resize: 'none'
        }} 
        placeholder="Jot down an idea..."
      />
    </div>
  );
}

function Card({ title, content }: { title: string, content: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: 'var(--border-std)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 500, margin: 0, color: 'var(--text-dim)' }}>{title}</h3>
      <p style={{ fontSize: '14px', margin: 0 }}>{content}</p>
    </div>
  );
}

export default App;
