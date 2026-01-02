
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
import { getSchoolSettings, initializeData } from './services/dataService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [page, setPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<{name: string, district: string} | null>(null);
  
  // State to pass selected student to Reports page
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);

  const initApp = async () => {
    setIsLoading(true);
    await initializeData(); // Initialize DB and Load Data to RAM
    
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

  const handleSetupComplete = async () => {
     // Re-fetch settings after setup
     const settings = await getSchoolSettings();
     if (settings) {
        setSchoolInfo(settings);
        setIsSetupComplete(true);
     }
  };

  // Handler to open report for a specific student
  const handleOpenStudentReport = (studentId: string) => {
    setReportStudentId(studentId);
    setPage('reports');
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-slate-600 gap-4">
            <Loader2 size={48} className="animate-spin text-blue-600" />
            <p className="font-bold text-lg">جاري تحميل البيانات...</p>
            <p className="text-sm text-gray-400">يتم تهيئة قاعدة البيانات المحلية لضمان الأداء</p>
        </div>
    );
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
    <div className="flex h-screen overflow-hidden bg-gray-100 text-slate-900 font-sans">
      {/* Sidebar - Fixed width */}
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <Sidebar 
          currentPage={page} 
          setPage={setPage} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen}
          schoolInfo={schoolInfo}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Toggle Button (Visible only when sidebar closed or mobile) */}
        {!isSidebarOpen && (
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-4 right-4 z-50 p-2 bg-white rounded-md shadow border border-gray-200 hover:bg-gray-50 text-slate-600"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
        )}

        {/* Content Scrollable Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
           {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
