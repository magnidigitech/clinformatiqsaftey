import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SharedHeader from './SharedHeader';
import IcdBrowserModal from '../IcdBrowserModal';

export default function AppShell() {
  const [globalIcdOpen, setGlobalIcdOpen] = useState(false);

  useEffect(() => {
    const openBrowser = () => setGlobalIcdOpen(true);
    window.addEventListener('open_icd_browser', openBrowser);
    return () => window.removeEventListener('open_icd_browser', openBrowser);
  }, []);
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <SharedHeader />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <IcdBrowserModal 
        isOpen={globalIcdOpen} 
        onClose={() => setGlobalIcdOpen(false)} 
      />
    </div>
  );
}