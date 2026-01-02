import React, { useState } from 'react';
import { School, ArrowRight, BookOpen, MapPin, Power } from 'lucide-react';
import { saveSchoolSettings } from '../services/dataService';

interface WelcomeSetupProps {
  onComplete: () => void;
}

const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete }) => {
  const [schoolName, setSchoolName] = useState('');
  const [district, setDistrict] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // حفظ البيانات مباشرة دون أي شروط معقدة
    if (schoolName && district) {
      saveSchoolSettings(schoolName, district);
      onComplete();
    }
  };

  const handleExit = () => {
    if (window.confirm("هل تريد إغلاق البرنامج؟")) {
      window.close();
      window.location.href = "about:blank";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 border border-white/50 backdrop-blur-sm">
        <div className="text-center mb-6">
          <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary transform rotate-3">
            <School size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إعداد النظام</h1>
          <p className="text-gray-500 text-sm">أهلاً بك في نظام مدرستي. الرجاء إدخال بيانات المدرسة للبدء.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدرسة</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  placeholder="مثال: مدرسة التفوق للتعليم الأساسي"
                />
                <BookOpen className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1">المحافظة / المنطقة التعليمية</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  placeholder="مثال: محافظة مسقط"
                />
                <MapPin className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
              </div>
            </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            <span>حفظ والدخول</span>
            <ArrowRight size={20} />
          </button>
          
          <button
            type="button"
            onClick={handleExit}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Power size={18} />
            <span>إغلاق البرنامج</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default WelcomeSetup;