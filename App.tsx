
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import AttendanceSheet from './components/AttendanceSheet';
import StudentsManager from './components/StudentsManager';
import SchoolManager from './components/SchoolManager';
import Reports from './components/Reports';
import SummonPage from './components/SummonPage';
import WelcomeSetup from './components/WelcomeSetup';
import UserGuide from './components/UserGuide';
import AboutApp from './components/AboutApp';
import IntroScreen from './components/IntroScreen';
import DailyAbsence from './components/DailyAbsence'; 
import SupervisorWelcome from './components/SupervisorWelcome'; // Import New Component
import { getSchoolSettings, initializeData } from './services/dataService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [page, setPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // App States
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showSupervisorWelcome, setShowSupervisorWelcome] = useState(true); // New State for Supervisor Welcome
  const [schoolInfo, setSchoolInfo] = useState<{name: string, district: string} | null>(null);
  
  // State to pass selected student to Reports page
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);

  const initApp = async () => {
    setIsLoading(true);
    
    // 1. Initialize Data
    await initializeData(); 
    
    // 2. Check for Intro
    const introSeen = localStorage.getItem('madrasati_intro_seen');
    if (!introSeen) {
        setShowIntro(true);
    }

    // 3. Check for Setup
    const settings = await getSchoolSettings();
    if (settings && settings.isSetup) {
      setIsSetupComplete(true);
      setSchoolInfo(settings);
    } else {
      setIsSetupComplete(false);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleIntroComplete = () => {
      localStorage.setItem('madrasati_intro_seen', 'true');
      setShowIntro(false);
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

  // New Intro Logic
  if (showIntro) {
      return <IntroScreen onComplete={handleIntroComplete} />;
  }

  if (!isSetupComplete) {
    return <WelcomeSetup onComplete={handleSetupComplete} />;
  }

  // Supervisor Welcome Screen - Shows after setup is complete
  if (showSupervisorWelcome) {
      return <SupervisorWelcome onStart={() => setShowSupervisorWelcome(false)} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'attendance': return <AttendanceSheet onNavigate={setPage} />;
      case 'daily-absence': return <DailyAbsence />; 
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
      {/* 
         Sidebar - Responsive Logic Updated:
         - Hidden by default on Mobile/Tablet (lg and below)
         - Visible only on Extra Large Screens (xl and above) which are Desktop monitors.
         - This ensures Tablets (even in landscape) use the BottomNav.
      */}
      <div className={`flex-shrink-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) hidden xl:block ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
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
        
        {/* Desktop Sidebar Toggle (Hidden on Tablet/Mobile) */}
        {!isSidebarOpen && (
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-6 right-6 z-50 p-2.5 bg-white rounded-xl shadow-lg shadow-slate-200 border border-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-500 transition-all hidden xl:block"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
        )}

        {/* Content Scrollable Area - Added extra padding at bottom for BottomNav */}
        <main className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth pb-24 xl:pb-8">
           {renderPage()}
        </main>

        {/* Bottom Navigation - Visible on Mobile/Tablet, Hidden on Desktop (xl) */}
        <BottomNav currentPage={page} setPage={setPage} />
      </div>
    </div>
  );
};

export default App;
