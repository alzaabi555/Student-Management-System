
import React, { useState } from 'react';
import { School, ArrowRight, BookOpen, MapPin, Power, ShieldCheck } from 'lucide-react';
import { saveSchoolSettings } from '../services/dataService';

interface WelcomeSetupProps {
  onComplete: () => void;
}

const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete }) => {
  const [schoolName, setSchoolName] = useState('');
  const [district, setDistrict] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schoolName && district) {
      setIsSaving(true);
      await saveSchoolSettings(schoolName, district);
      setIsSaving(false);
      onComplete();
    }
  };

  const handleExit = () => {
    window.close();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f3f4f6]" dir="rtl" style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' }}>
      
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden">
        
        {/* Decorative Header */}
        <div className="bg-blue-700 h-2 w-full"></div>
        
        {/* Content */}
        <div className="p-8">
            <div className="text-center mb-8">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-700 border-4 border-white shadow-lg ring-1 ring-gray-100">
                    <School size={48} strokeWidth={1.5} />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">إعداد النظام</h1>
                <p className="text-gray-500 font-medium">نظام مدرستي للإدارة المدرسية الذكية</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Input Group 1 */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">اسم المدرسة الرسمي</label>
                    <div className="relative group">
                        <div className="absolute right-3 top-3 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                            <BookOpen size={20} />
                        </div>
                        <input
                            type="text"
                            required
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            className="form-input pr-11 text-lg"
                            placeholder="مثال: مدرسة الإبداع للتعليم الأساسي"
                            disabled={isSaving}
                        />
                    </div>
                </div>

                {/* Input Group 2 */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">المديرية / المحافظة</label>
                    <div className="relative group">
                        <div className="absolute right-3 top-3 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                            <MapPin size={20} />
                        </div>
                        <input
                            type="text"
                            required
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            className="form-input pr-11 text-lg"
                            placeholder="مثال: المديرية العامة لمحافظة شمال الباطنة"
                            disabled={isSaving}
                        />
                    </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 border border-blue-100 mt-2">
                    <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        سيتم استخدام هذه البيانات في ترويسة التقارير الرسمية والمراسلات. يرجى التأكد من صحتها.
                    </p>
                </div>

                {/* Actions */}
                <div className="pt-4 grid grid-cols-1 gap-3">
                    <button type="submit" disabled={isSaving} className="btn-primary w-full justify-center text-base py-3">
                        {isSaving ? 'جاري الحفظ...' : <span>حفظ البيانات وبدء النظام</span>}
                        {!isSaving && <ArrowRight size={20} />}
                    </button>
                    
                    <button type="button" onClick={handleExit} className="btn-secondary w-full justify-center text-red-600 hover:bg-red-50 hover:border-red-200 border-gray-200 text-sm">
                        <Power size={18} />
                        <span>إغلاق البرنامج</span>
                    </button>
                </div>
            </form>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100 flex justify-between items-center px-8 text-xs text-gray-400 font-mono">
            <span>Ver 2.1.0</span>
            <span>Madrasati Systems © 2024</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSetup;
