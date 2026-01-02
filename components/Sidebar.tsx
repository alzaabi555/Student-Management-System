
import React from 'react';
import { LayoutDashboard, Users, School, UserPlus, Layers, BookOpen, Info, FileText, FileWarning, ChevronLeft } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  schoolInfo?: { name: string; district: string } | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, schoolInfo }) => {
  
  // Grouping menu items for better organization
  const menuGroups = [
    {
      title: 'عام',
      items: [
        { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard size={22} /> },
      ]
    },
    {
      title: 'الإدارة المدرسية',
      items: [
        { id: 'structure', label: 'الهيكل المدرسي', icon: <Layers size={22} /> },
        { id: 'students', label: 'شؤون الطلاب', icon: <UserPlus size={22} /> },
        { id: 'attendance', label: 'سجل الحضور', icon: <Users size={22} /> },
      ]
    },
    {
      title: 'المخرجات',
      items: [
        { id: 'reports', label: 'التقارير والإحصاء', icon: <FileText size={22} /> },
        { id: 'summons', label: 'الاستدعاءات', icon: <FileWarning size={22} /> },
      ]
    },
    {
      title: 'المساعدة',
      items: [
        { id: 'guide', label: 'دليل الاستخدام', icon: <BookOpen size={22} /> },
        { id: 'about', label: 'حول النظام', icon: <Info size={22} /> },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-300 text-gray-800 shadow-xl z-20">
        {/* Brand */}
        <div className="h-20 flex items-center px-5 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
              <School size={22} />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base text-gray-900 truncate leading-tight">
                {schoolInfo ? schoolInfo.name : 'مدرستي'}
              </h1>
              <span className="text-[11px] text-gray-500 block truncate font-medium mt-0.5">
                {schoolInfo ? schoolInfo.district : 'لوحة التحكم'}
              </span>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Group Title (Hidden for first group if desired, or styled subtly) */}
              {group.title !== 'عام' && (
                <h3 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">
                  {group.title}
                </h3>
              )}
              
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`btn-nav-${item.id}`}
                      onClick={() => setPage(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 group
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-sm ring-1 ring-blue-100' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                      `}
                    >
                      <span className={`transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                      
                      {/* Active Indicator Line */}
                      {isActive && (
                        <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Separator Line (Don't show after last group) */}
              {groupIndex < menuGroups.length - 1 && (
                 <div className="mt-4 border-b border-gray-100 mx-2"></div>
              )}
            </div>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/80 text-center backdrop-blur-sm">
            <p className="text-[10px] text-gray-400 font-medium font-mono">الإصدار 2.0.0</p>
        </div>
    </div>
  );
};

export default Sidebar;
