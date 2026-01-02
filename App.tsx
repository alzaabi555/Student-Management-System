import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AttendanceSheet from './components/AttendanceSheet';
import StudentsManager from './components/StudentsManager';
import SchoolManager from './components/SchoolManager';
import Reports from './components/Reports';
import SummonPage from './components/SummonPage';
import WelcomeSetup from './components/WelcomeSetup';
import UserGuide from './components/UserGuide';
import AboutApp from './components/AboutApp';
import { getSchoolSettings } from './services/dataService';

const App: React.FC = () => {
  const [page, setPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open for Desktop
  const [isSetup, setIsSetup] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{name: string, district: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const settings = getSchoolSettings();
    
    if (settings && settings.isSetup) {
        setSchoolInfo(settings);
        setIsSetup(true);
    } else {
        setIsSetup(false);
    }
    
    setIsLoading(false);
  }, []);

  const handleSetupComplete = () => {
    const settings = getSchoolSettings();
    setSchoolInfo(settings);
    setIsSetup(true);
  };

  const renderPage = () => {
    switch(page) {
      case 'dashboard': return <Dashboard />;
      case 'attendance': return <AttendanceSheet onNavigate={setPage} />;
      case 'students': return <StudentsManager onNavigate={setPage} />;
      case 'reports': return <Reports />;
      case 'summons': return <SummonPage />;
      case 'structure': return <SchoolManager />;
      case 'guide': return <UserGuide />;
      case 'about': return <AboutApp />;
      default: return <Dashboard />;
    }
  };

  if (isLoading) return null;

  if (!isSetup) {
    return <WelcomeSetup onComplete={handleSetupComplete} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-winBg selection:bg-primary selection:text-white direction-rtl">
      <Sidebar 
        currentPage={page} 
        setPage={setPage} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        schoolInfo={schoolInfo}
      />
      
      {/* 
        Windows 11 Layout Style:
        The main content is a 'Surface' separate from the Navigation Pane.
        We add padding around the main area so the background shows through, creating a 'cut' effect.
      */}
      <main className="flex-1 overflow-hidden w-full transition-all duration-300 p-3 bg-winBg relative">
        <div className="h-full w-full rounded-2xl bg-white/50 border border-white/60 shadow-[0_0_15px_rgba(0,0,0,0.03)] backdrop-blur-sm overflow-x-hidden overflow-y-auto relative">
             {/* This inner div acts as the 'Page' surface */}
             <div className="min-h-full">
                {renderPage()}
             </div>
        </div>
      </main>
    </div>
  );
};

export default App;