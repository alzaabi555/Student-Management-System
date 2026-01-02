
import React from 'react';
import { Info, User, Smartphone } from 'lucide-react';

const AboutApp: React.FC = () => {
  return (
    <div className="p-4 md:p-8 h-full flex flex-col items-center justify-center overflow-y-auto">
      
      <div className="card w-full max-w-3xl shadow-xl relative my-auto">
         {/* الشريط العلوي الملون */}
         <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
         
         <div className="p-8">
            
            {/* رأس الصفحة: اللوجو والعنوان */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm border-2 border-white ring-1 ring-gray-100">
                    <Info size={32} strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">نظام مدرستي</h2>
                <p className="text-sm text-slate-500 font-medium dir-ltr">Version 2.0.0</p>
            </div>

            {/* نبذة عن التطبيق */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6 text-center">
                <p className="text-gray-600 leading-relaxed text-sm">
                    نظام إداري متكامل مصمم خصيصاً للمدارس العمانية، يهدف إلى أتمتة عمليات رصد الغياب والتسرب، 
                    وتوفير قنوات تواصل مباشرة وذكية مع أولياء الأمور عبر واتساب.
                </p>
            </div>

            {/* المنطقة البارزة: المصمم والتواصل - تصميم أفقي صغير */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                
                {/* بطاقة المصمم */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3 hover:bg-indigo-50 transition-all duration-300 group">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                         <User size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-indigo-900 truncate">
                        أ. محمد درويش الزعابي
                    </h3>
                </div>
                
                {/* بطاقة التواصل */}
                <a href="https://wa.me/96898344555" target="_blank" rel="noreferrer" className="bg-green-50/50 border border-green-100 rounded-xl p-3 flex items-center gap-3 hover:bg-green-50 transition-all duration-300 cursor-pointer group">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-green-600 shrink-0 group-hover:scale-110 transition-transform">
                         <Smartphone size={18} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">الدعم الفني</span>
                        <h3 className="text-sm font-bold text-green-800 dir-ltr font-mono">
                            98344555
                        </h3>
                    </div>
                </a>

            </div>

         </div>
      </div>
    </div>
  );
};

export default AboutApp;
