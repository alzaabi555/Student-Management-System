
import React, { useState } from 'react';
import { LayoutDashboard, Users, UserPlus, Layers, BookOpen, Info, FileText, FileWarning, UserMinus, X, Grid } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  setPage: (page: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, setPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // تعريف كل الصفحات
  const allItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard size={24} /> },
    { id: 'daily-absence', label: 'غياب اليوم', icon: <UserMinus size={24} /> },
    { id: 'attendance', label: 'التسجيل', icon: <Users size={24} /> },
    { id: 'students', label: 'الطلاب', icon: <UserPlus size={24} /> },
    { id: 'reports', label: 'التقارير', icon: <FileText size={24} /> },
    { id: 'summons', label: 'الاستدعاء', icon: <FileWarning size={24} /> },
    { id: 'structure', label: 'الهيكل', icon: <Layers size={24} /> },
    { id: 'guide', label: 'الدليل', icon: <BookOpen size={24} /> },
    { id: 'about', label: 'حول', icon: <Info size={24} /> },
  ];

  // تقسيم العناصر: أول 4 رئيسية، والباقي في قائمة "المزيد"
  const mainItems = allItems.slice(0, 4);
  const menuItems = allItems.slice(4);

  // معرفة هل الصفحة الحالية موجودة داخل قائمة المزيد؟ (لتنشيط زر المزيد)
  const isMoreActive = menuItems.some(item => item.id === currentPage);

  return (
    <>
      {/* 
          OVERLAY MENU (قائمة المزيد)
          تظهر فوق الشريط السفلي بتأثير زجاجي
      */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm xl:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
           <div 
             className="absolute bottom-28 left-4 right-4 md:left-20 md:right-20 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 animate-fadeIn"
             onClick={e => e.stopPropagation()} 
           >
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100/50">
                  <span className="text-sm font-bold text-slate-500">القائمة الكاملة</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-red-500 transition-colors">
                      <X size={20}/>
                  </button>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {menuItems.map(item => {
                      const isActive = currentPage === item.id;
                      return (
                        <button
                            key={item.id}
                            onClick={() => { setPage(item.id); setIsMenuOpen(false); }}
                            className={`
                                flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-200 border
                                ${isActive 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-transparent scale-105' 
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100 hover:border-slate-200'}
                            `}
                        >
                            {React.cloneElement(item.icon as React.ReactElement, { size: isActive ? 28 : 26 })}
                            <span className="text-[11px] font-bold whitespace-nowrap">{item.label}</span>
                        </button>
                      )
                  })}
              </div>
           </div>
        </div>
      )}

      {/* 
          THE DOCK (الشريط العائم الفخم)
      */}
      <div className="fixed bottom-6 left-4 right-4 md:left-12 md:right-12 z-50 h-20 bg-white/85 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-2xl shadow-slate-300/40 xl:hidden flex items-center justify-evenly px-2">
        {mainItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); setIsMenuOpen(false); }}
              className={`
                relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ease-out
                ${isActive 
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/40 -translate-y-8 scale-110 ring-4 ring-slate-50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'}
              `}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-100' : 'scale-100'}`}>
                {item.icon}
              </div>
              {/* النص يظهر فقط للعنصر النشط أسفل الدائرة */}
              <span className={`absolute -bottom-7 text-[10px] font-bold text-blue-700 whitespace-nowrap transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  {item.label}
              </span>
            </button>
          );
        })}

        {/* فاصل صغير جمالي */}
        <div className="w-px h-8 bg-slate-200/50 mx-1"></div>

        {/* زر المزيد */}
        <button
           onClick={() => setIsMenuOpen(!isMenuOpen)}
           className={`
             relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ease-out
             ${isMoreActive || isMenuOpen
               ? 'bg-slate-800 text-white shadow-xl shadow-slate-800/40 -translate-y-8 scale-110 ring-4 ring-slate-50' 
               : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'}
           `}
        >
            {isMenuOpen ? <X size={26} /> : <Grid size={26} />}
            
            <span className={`absolute -bottom-7 text-[10px] font-bold text-slate-800 whitespace-nowrap transition-all duration-300 ${(isMoreActive || isMenuOpen) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                المزيد
            </span>
        </button>
      </div>
    </>
  );
};

export default BottomNav;
