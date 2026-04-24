import React from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
