import React from 'react';
import { Info, Shield, Phone, Code, Heart, Sparkles } from 'lucide-react';

const AboutApp: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 rounded-full mix-blend-multiply filter blur-2xl opacity-60 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-100 rounded-full mix-blend-multiply filter blur-2xl opacity-60 -ml-20 -mb-20"></div>
        
        <div className="bg-primary/10 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary transform rotate-6 shadow-lg shadow-blue-900/5 relative z-10">
          <Info size={48} />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2 relative z-10">حول التطبيق</h2>
        <p className="text-primary font-medium relative z-10 bg-primary/5 inline-block px-4 py-1 rounded-full text-sm">الإصدار v1.0.2 Beta</p>
      </div>

      {/* Description Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="text-primary" size={22} />
          نبذة عن النظام
        </h3>
        <p className="text-gray-600 leading-loose text-justify">
          نظام "مدرستي" هو منصة رقمية متكاملة تهدف إلى تطوير منظومة العمل الإداري في المدارس العمانية. 
          تم تصميم النظام لتسهيل عملية رصد ومتابعة غياب الطلاب والتسرب الدراسي بدقة عالية، مع توفير أدوات 
          ذكية للتواصل الفوري مع أولياء الأمور عبر تطبيق واتساب، وإصدار تقارير دورية تدعم اتخاذ القرار 
          التربوي، مما يسهم في رفع مستوى الانضباط المدرسي والتحصيل الدراسي.
        </p>
      </div>

      {/* Developer & Support Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Developer Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Code size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">تصميم وبرمجة</h3>
          <p className="text-indigo-600 font-bold text-lg mb-1">أ. محمد درويش الزعابي</p>
          <p className="text-xs text-gray-400">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
        </div>

        {/* Technical Support */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
            <Phone size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">الدعم الفني</h3>
          <p className="text-sm text-gray-500 mb-4 px-4">للاستفسارات والمقترحات، يرجى التواصل عبر واتساب</p>
          <a 
            href="https://wa.me/96898344555" 
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"
          >
            <Phone size={18} />
            98344555
          </a>
        </div>
      </div>

      {/* Footer Charm */}
      <div className="text-center pt-6 opacity-70">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-xs text-gray-500 font-medium">
          <Sparkles size={14} className="text-amber-500" />
          صنع بكل <Heart size={14} className="text-red-500 fill-red-500" /> في سلطنة عمان
        </div>
      </div>
    </div>
  );
};

export default AboutApp;