import React from 'react';
import { LayoutDashboard, Users, School, UserPlus, Layers, BookOpen, Info, ChevronRight, FileText } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  schoolInfo?: { name: string; district: string } | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, schoolInfo }) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة المعلومات', icon: <LayoutDashboard size={22} /> },
    { id: 'attendance', label: 'تسجيل الحضور', icon: <Users size={22} /> },
    { id: 'students', label: 'إدارة الطلاب', icon: <UserPlus size={22} /> },
    { id: 'reports', label: 'التقارير الذكية', icon: <FileText size={22} /> },
    { id: 'structure', label: 'الصفوف والفصول', icon: <Layers size={22} /> },
    { id: 'guide', label: 'دليل الاستخدام', icon: <BookOpen size={22} /> },
    { id: 'about', label: 'حول التطبيق', icon: <Info size={22} /> },
  ];

  return (
    <aside className="w-72 bg-white flex-shrink-0 flex flex-col border-l border-gray-200 h-screen sticky top-0 z-50 print:hidden">
        {/* Logo Area */}
        <div className="p-8 flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primaryLight rounded-2xl flex items-center justify-center text-white shadow-glow transform rotate-3 hover:rotate-6 transition-transform duration-300">
            <School size={28} />
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <h1 className="font-extrabold text-xl text-slate-800 tracking-tight whitespace-nowrap">مدرستي</h1>
            {schoolInfo ? (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary truncate max-w-[140px]" title={schoolInfo.name}>{schoolInfo.name}</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[140px]">{schoolInfo.district}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">النظام الذكي</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-2 flex-1 overflow-y-auto py-2">
          <div className="text-xs font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">القائمة الرئيسية</div>
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-gradient-to-r from-primary to-primaryLight text-white shadow-glow translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}
                `}
              >
                {/* Active Indicator Line */}
                {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>}
                
                <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="font-bold text-sm relative z-10 flex-1 text-right">{item.label}</span>
                
                {!isActive && <ChevronRight size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />}
              </button>
            );
          })}
        </nav>
    </aside>
  );
};

export default Sidebar;