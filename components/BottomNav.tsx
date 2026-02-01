import React from 'react';
import { LayoutDashboard, Users, UserPlus, FileText, Menu } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  setPage: (page: string) => void;
  onMoreClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, setPage, onMoreClick }) => {
  // أهم الصفحات للوصول السريع
  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard size={28} /> },
    { id: 'attendance', label: 'الغياب', icon: <Users size={28} /> }, // لاحظ: استخدمت Users للغياب بناء على طلبك للأيقونات
    { id: 'students', label: 'الطلاب', icon: <UserPlus size={28} /> },
    { id: 'reports', label: 'التقارير', icon: <FileText size={28} /> },
  ];

  return (
    // lg:hidden تعني أنه سيختفي في شاشات الكمبيوتر واللابتوب
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 pb-safe h-16 no-print">
      <div className="flex justify-around items-center h-full px-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex items-center justify-center w-full h-full relative transition-all duration-300 ${
                isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={item.label}
            >
              {/* مؤشر التفعيل (خط علوي) */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-brand-600 rounded-b-full"></span>
              )}
              
              {/* الأيقونة فقط - تكبر قليلاً عند التفعيل */}
              <div className={`transform transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
                {item.icon}
              </div>
            </button>
          );
        })}

        {/* زر المزيد لفتح القائمة الجانبية كـ Modal */}
        <button
          onClick={onMoreClick}
          className="flex items-center justify-center w-full h-full text-slate-400 hover:text-slate-600"
        >
          <Menu size={28} />
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
