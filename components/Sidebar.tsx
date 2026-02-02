
import React from 'react';
import { LayoutDashboard, Users, School, UserPlus, Layers, BookOpen, Info, FileText, FileWarning, UserMinus } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  schoolInfo?: { name: string; district: string } | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, schoolInfo }) => {
  
  const menuGroups = [
    {
      title: 'الرئيسية',
      items: [
        { id: 'dashboard', label: 'لوحة القيادة', icon: <LayoutDashboard size={20} /> },
        { id: 'daily-absence', label: 'غياب اليوم (إرسال)', icon: <UserMinus size={20} /> },
      ]
    },
    {
      title: 'الإدارة',
      items: [
        { id: 'structure', label: 'الهيكل المدرسي', icon: <Layers size={20} /> },
        { id: 'students', label: 'شؤون الطلاب', icon: <UserPlus size={20} /> },
        { id: 'attendance', label: 'تسجيل الحضور', icon: <Users size={20} /> },
      ]
    },
    {
      title: 'التقارير والإجراءات',
      items: [
        { id: 'reports', label: 'التقارير', icon: <FileText size={20} /> },
        { id: 'summons', label: 'الاستدعاءات', icon: <FileWarning size={20} /> },
      ]
    },
    {
      title: 'الدعم',
      items: [
        { id: 'guide', label: 'دليل الاستخدام', icon: <BookOpen size={20} /> },
        { id: 'about', label: 'حول النظام', icon: <Info size={20} /> },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100 text-slate-800 shadow-xl shadow-slate-200/50 z-20">
        {/* Brand Area */}
        <div className="h-24 flex items-center px-4 sm:px-2 2xl:px-6 border-b border-slate-50 bg-gradient-to-b from-white to-slate-50/50 justify-center 2xl:justify-start">
          <div className="flex items-center gap-3 w-full justify-center 2xl:justify-start">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20 ring-4 ring-white">
              <School size={20} strokeWidth={2} />
            </div>
            <div className="overflow-hidden flex-1 sm:hidden 2xl:block">
              <h1 className="font-bold text-base text-slate-900 truncate tracking-tight">
                {schoolInfo ? schoolInfo.name : 'مدرستي'}
              </h1>
              <span className="text-[10px] text-slate-400 block truncate font-medium uppercase tracking-wider mt-0.5">
                {schoolInfo ? schoolInfo.district : 'System Manager'}
              </span>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 2xl:px-4 space-y-8 scrollbar-hide">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex flex-col items-center 2xl:items-stretch">
              <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 sm:hidden 2xl:block self-start">
                {group.title}
              </h3>
              <div className="hidden sm:block 2xl:hidden w-8 h-[1px] bg-slate-100 mb-3 mx-auto"></div>
              
              <div className="space-y-1 w-full">
                {group.items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`btn-nav-${item.id}`}
                      onClick={() => setPage(item.id)}
                      title={item.label}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                        justify-center 2xl:justify-start
                        ${isActive 
                          ? 'bg-brand-50 text-brand-700 font-bold' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                      `}
                    >
                      {isActive && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-l-full bg-brand-600 sm:h-2 sm:w-2 sm:rounded-full sm:right-1 2xl:h-8 2xl:w-1 2xl:rounded-l-full 2xl:right-0"></div>
                      )}

                      <span className={`transition-colors shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {item.icon}
                      </span>
                      
                      <span className="text-sm sm:hidden 2xl:block whitespace-nowrap">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 2xl:p-6 border-t border-slate-50 flex justify-center 2xl:justify-stretch">
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100 sm:bg-transparent sm:border-none 2xl:bg-slate-50 2xl:border-slate-100">
               <p className="text-[10px] text-slate-400 font-medium font-mono sm:hidden 2xl:block">Build v2.0.0</p>
               <span className="hidden sm:block 2xl:hidden text-slate-300">v2</span>
            </div>
        </div>
    </div>
  );
};

export default Sidebar;
