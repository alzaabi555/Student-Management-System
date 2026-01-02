import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AttendanceSheet from './components/AttendanceSheet';
import StudentsManager from './components/StudentsManager';
import SchoolManager from './components/SchoolManager';
import Reports from './components/Reports';
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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        currentPage={page} 
        setPage={setPage} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        schoolInfo={schoolInfo}
      />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto w-full transition-all duration-300">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;