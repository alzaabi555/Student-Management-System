import React from 'react';
import { LayoutDashboard, Users, School, UserPlus, Layers, BookOpen, Info, FileText, FileWarning, MapPin } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  schoolInfo?: { name: string; district: string } | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, schoolInfo }) => {
  // Logic order preserved: Structure -> Students -> Attendance
  const menuItems = [
    { id: 'dashboard', label: 'لوحة المعلومات', icon: <LayoutDashboard size={22} /> },
    { id: 'structure', label: 'الصفوف والفصول', icon: <Layers size={22} /> },
    { id: 'students', label: 'إدارة الطلاب', icon: <UserPlus size={22} /> },
    { id: 'attendance', label: 'تسجيل الحضور', icon: <Users size={22} /> },
    { id: 'reports', label: 'التقارير', icon: <FileText size={22} /> },
    { id: 'summons', label: 'الاستدعاءات', icon: <FileWarning size={22} /> },
    { id: 'guide', label: 'دليل الاستخدام', icon: <BookOpen size={22} /> },
    { id: 'about', label: 'حول التطبيق', icon: <Info size={22} /> },
  ];

  return (
    <aside className="w-[300px] bg-winBg/50 flex-shrink-0 flex flex-col h-full select-none pt-6 pb-4 px-3 print:hidden backdrop-blur-xl border-l border-gray-200/60 shadow-[1px_0_0_0_rgba(255,255,255,0.5)] z-20 transition-all duration-300">
        
        {/* Logo & School Identity Area - Enhanced */}
        <div className="px-3 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/10 shrink-0">
            <School size={24} />
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <h1 className="font-bold text-lg text-slate-900 leading-tight truncate tracking-tight">
              {schoolInfo ? schoolInfo.name : 'مدرستي'}
            </h1>
            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mt-1">
              {schoolInfo?.district && <MapPin size={10} className="text-primary/70" />}
              <span className="truncate">{schoolInfo ? schoolInfo.district : 'النظام الذكي'}</span>
            </div>
          </div>
        </div>

        {/* Navigation - Windows 11 Style (Spacious) */}
        <nav className="space-y-1.5 flex-1 overflow-y-auto px-1 custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-[6px] transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-white shadow-sm text-primary font-bold' 
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}
                `}
              >
                {/* Win11 Active Indicator (Left Bar) - Slightly thicker */}
                {isActive && (
                    <div className="absolute left-0 top-2.5 bottom-2.5 w-[4px] bg-primary rounded-r-full shadow-[2px_0_8px_rgba(0,95,184,0.3)]"></div>
                )}
                
                <span className={`transition-colors duration-200 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-700'}`}>
                  {item.icon}
                </span>
                <span className="text-[15px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Footer Area */}
        <div className="mt-auto px-6 py-4">
            <div className="pt-4 border-t border-gray-200/50 flex flex-col items-center text-center">
                <span className="text-[10px] text-gray-400 font-medium">نظام مدرستي للإدارة الذكية</span>
                <span className="text-[10px] text-gray-300 mt-0.5"> الإصدار 2.0.0</span>
            </div>
        </div>
    </aside>
  );
};

export default Sidebar;