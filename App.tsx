import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav'; // <-- استيراد الشريط السفلي
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
import { Loader2, X } from 'lucide-react'; // <-- X للإغلاق

const App: React.FC = () => {
  const [page, setPage] = useState('dashboard');
  
  // حالة القائمة الجانبية (للويندوز)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // حالة القائمة المنبثقة (للتابلت عند الضغط على زر المزيد)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // App States
  const [isLoading, setIsLoading] = useState(true);
  const [isActivated, setIsActivated] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{name: string, district: string} | null>(null);
  
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);

  const initApp = async () => {
    setIsLoading(true);
    const activated = isAppActivated();
    setIsActivated(activated);

    if (activated) {
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

  // دالة لتغيير الصفحة وإغلاق القائمة في الموبايل
  const handlePageChange = (newPage: string) => {
    setPage(newPage);
    setIsMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-brand-50 text-brand-700 gap-4">
            <Loader2 size={48} className="animate-spin text-brand-600" />
            <p className="font-bold text-lg tracking-wide">جاري تحميل النظام...</p>
        </div>
    );
  }

  if (!isActivated) return <ActivationPage onSuccess={handleActivationSuccess} />;
  if (!isSetupComplete) return <WelcomeSetup onComplete={handleSetupComplete} />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'attendance': return <AttendanceSheet onNavigate={handlePageChange} />;
      case 'students': return <StudentsManager onNavigate={handlePageChange} onOpenReport={handleOpenStudentReport} />;
      case 'structure': return <SchoolManager />;
      case 'reports': return <Reports initialStudentId={reportStudentId} onClearInitial={() => setReportStudentId(null)} />;
      case 'summons': return <SummonPage />;
      case 'guide': return <UserGuide />;
      case 'about': return <AboutApp />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans relative">
      
      {/* ========================================================
          1. WINDOWS SIDEBAR (Desktop)
          يظهر فقط في الشاشات الكبيرة (lg وما فوق).
          يختفي تماماً في التابلت والموبايل (hidden lg:block).
          ======================================================== */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <Sidebar 
          currentPage={page} 
          setPage={setPage} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen}
          schoolInfo={schoolInfo}
        />
      </div>

      {/* ========================================================
          2. TABLET/MOBILE DRAWER (Overlay)
          يظهر فقط عند الضغط على زر "المزيد" في الشريط السفلي.
          ======================================================== */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
           <div 
             className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl animate-slide-in-right"
             onClick={(e) => e.stopPropagation()}
           >
             <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 left-4 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition z-50"
             >
               <X size={20} />
             </button>
             {/* إعادة استخدام السايدبار كقائمة منبثقة */}
             <Sidebar 
               currentPage={page} 
               setPage={handlePageChange} 
               isOpen={true} 
               setIsOpen={() => {}} 
               schoolInfo={schoolInfo}
             />
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative bg-slate-50/50">
        
        {/* زر تصغير السايدبار (فقط في الويندوز) */}
        <div className="hidden lg:block">
            {!isSidebarOpen && (
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-6 right-6 z-50 p-2.5 bg-white rounded-xl shadow-lg shadow-slate-200 border border-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-500 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
            )}
        </div>

        {/* مساحة المحتوى */}
        {/* pb-24: إضافة مسافة سفلية في التابلت للشريط السفلي */}
        {/* lg:pb-8: إزالة المسافة الزائدة في الويندوز */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 lg:pb-8 scroll-smooth">
           {renderPage()}
        </main>

        {/* ========================================================
            3. TABLET BOTTOM NAV
            يظهر فقط في التابلت والموبايل (lg:hidden).
            ======================================================== */}
        <BottomNav 
          currentPage={page} 
          setPage={handlePageChange} 
          onMoreClick={() => setIsMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
};

export default App;
