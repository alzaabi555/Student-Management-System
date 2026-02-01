
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
import ActivationPage from './components/ActivationPage';
import { getSchoolSettings, initializeData } from './services/dataService';
import { isAppActivated } from './services/licenseService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [page, setPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // App States
  const [isLoading, setIsLoading] = useState(true);
  const [isActivated, setIsActivated] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{name: string, district: string} | null>(null);
  
  // State to pass selected student to Reports page
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);

  const initApp = async () => {
    setIsLoading(true);
    
    // 1. Check License First
    const activated = isAppActivated();
    setIsActivated(activated);

    if (activated) {
        // 2. Initialize Data only if activated
        await initializeData(); 
        const settings = await getSchoolSettings();
        if (settings && settings.isSetup) {
          setIsSetupComplete(true);
          setSchoolInfo(settings);
        } else {
          setIsSetupComplete(false);
        }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleActivationSuccess = async () => {
      setIsLoading(true);
      setIsActivated(true);
      await initializeData();
      const settings = await getSchoolSettings();
      if (settings && settings.isSetup) {
        setIsSetupComplete(true);
        setSchoolInfo(settings);
      }
      setIsLoading(false);
  };

  const handleSetupComplete = async () => {
     const settings = await getSchoolSettings();
     if (settings) {
        setSchoolInfo(settings);
        setIsSetupComplete(true);
     }
  };

  const handleOpenStudentReport = (studentId: string) => {
    setReportStudentId(studentId);
    setPage('reports');
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-brand-50 text-brand-700 gap-4">
            <Loader2 size={48} className="animate-spin text-brand-600" />
            <p className="font-bold text-lg tracking-wide">جاري تحميل النظام...</p>
        </div>
    );
  }

  if (!isActivated) {
      return <ActivationPage onSuccess={handleActivationSuccess} />;
  }

  if (!isSetupComplete) {
    return <WelcomeSetup onComplete={handleSetupComplete} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'attendance': return <AttendanceSheet onNavigate={setPage} />;
      case 'students': return <StudentsManager onNavigate={setPage} onOpenReport={handleOpenStudentReport} />;
      case 'structure': return <SchoolManager />;
      case 'reports': return <Reports initialStudentId={reportStudentId} onClearInitial={() => setReportStudentId(null)} />;
      case 'summons': return <SummonPage />;
      case 'guide': return <UserGuide />;
      case 'about': return <AboutApp />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar - Responsive Width */}
      {/* w-64 on Mobile/Desktop, but shrinks to w-20 on Tablets (md) to save space */}
      <div className={`flex-shrink-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'w-64 md:w-20 lg:w-64' : 'w-0 overflow-hidden'}`}>
        <Sidebar 
          currentPage={page} 
          setPage={setPage} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen}
          schoolInfo={schoolInfo}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative bg-slate-50/50">
        
        {/* Toggle Button */}
        {!isSidebarOpen && (
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-6 right-6 z-50 p-2.5 bg-white rounded-xl shadow-lg shadow-slate-200 border border-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-500 transition-all"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
        )}

        {/* Content Scrollable Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
           {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
