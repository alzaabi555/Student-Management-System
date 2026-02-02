
import React, { useEffect, useState } from 'react';
import { Star, Heart, Award, ArrowLeft } from 'lucide-react';

interface SupervisorWelcomeProps {
  onStart: () => void;
}

const SupervisorWelcome: React.FC<SupervisorWelcomeProps> = ({ onStart }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // تشغيل الأنيميشن عند التحميل
    setShow(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* خلفية متحركة خفيفة */}
      <div className="absolute inset-0 opacity-20">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className={`relative z-10 max-w-2xl w-full transition-all duration-1000 transform ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* بطاقة الترحيب */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 md:p-12 text-center shadow-2xl shadow-black/50">
            
            {/* الأيقونة العائمة */}
            <div className="w-24 h-24 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-amber-500/30 ring-4 ring-white/10 animate-bounce">
                <Award size={48} className="text-white" />
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                أهلاً بك يا صانع الأثر
            </h1>
            
            <div className="my-6">
                <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 tracking-wide">
                    أ. وليد المحرزي
                </h2>
            </div>

            <p className="text-lg md:text-xl text-slate-200 leading-relaxed mb-8 font-light">
                كل رسالة ترسلها، وكل اتصال تجريه، وكل دقيقة تقضيها في المتابعة،
                <br className="hidden md:block"/>
                تساهم في بناء مستقبل طالب وحماية مسيرته التعليمية.
                <br />
                <span className="font-bold text-white mt-2 block">شكراً لجهودك العظيمة اليومية ❤️</span>
            </p>

            <button 
                onClick={onStart}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-slate-900 transition-all duration-200 bg-white font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 hover:bg-amber-400 hover:scale-105"
            >
                <span className="mr-2 text-lg">بدء يوم عمل موفق</span>
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                <div className="absolute -inset-3 rounded-xl bg-white/30 blur opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>

            <div className="mt-8 flex justify-center gap-4 text-slate-400 text-sm opacity-60">
                <div className="flex items-center gap-1"><Star size={12} /> التزام</div>
                <div className="flex items-center gap-1"><Heart size={12} /> عطاء</div>
                <div className="flex items-center gap-1"><Star size={12} /> إنجاز</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorWelcome;
