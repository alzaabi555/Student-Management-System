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
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const settings = getSchoolSettings();
    if (settings && settings.isSetup) {
      setSchoolInfo(settings);
      setIsSetup(true);
    }
    setIsLoading(false);

    // PWA Install Event Listener
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleSetupComplete = () => {
    const settings = getSchoolSettings();
    setSchoolInfo(settings);
    setIsSetup(true);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
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
        installPrompt={deferredPrompt}
        onInstall={handleInstallClick}
      />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto w-full transition-all duration-300">
        {/* Mobile Header - Adjusted for Safe Area */}
        <div className="md:hidden bg-white/90 backdrop-blur-sm px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between shadow-sm sticky top-0 z-20">
           <div className="flex flex-col">
             <div className="font-bold text-primary text-lg">نظام مدرستي</div>
             {schoolInfo && <div className="text-[10px] text-gray-500">{schoolInfo.name}</div>}
           </div>
           <div className="flex items-center gap-2">
             {/* Mobile Install Icon (Optional shorthand) */}
             {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="p-2 text-primary bg-blue-50 rounded-lg animate-pulse"
                  title="تثبيت التطبيق"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </button>
             )}
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
               <Menu size={24} />
             </button>
           </div>
        </div>

        {renderPage()}
      </main>
    </div>
  );
};

export default App;