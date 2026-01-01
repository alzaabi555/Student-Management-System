import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AttendanceSheet from './components/AttendanceSheet';
import StudentsManager from './components/StudentsManager';
import SchoolManager from './components/SchoolManager';
import WelcomeSetup from './components/WelcomeSetup';
import UserGuide from './components/UserGuide';
import AboutApp from './components/AboutApp';
import { Menu } from 'lucide-react';
import { getSchoolSettings } from './services/dataService';

const App: React.FC = () => {
  const [page, setPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{name: string, district: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const settings = getSchoolSettings();
    if (settings && settings.isSetup) {
      setSchoolInfo(settings);
      setIsSetup(true);
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
        {/* Mobile Header */}
        <div className="md:hidden bg-white p-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
           <div className="flex flex-col">
             <div className="font-bold text-primary text-lg">نظام مدرستي</div>
             {schoolInfo && <div className="text-[10px] text-gray-500">{schoolInfo.name}</div>}
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
             <Menu size={24} />
           </button>
        </div>

        {renderPage()}
      </main>
    </div>
  );
};

export default App;