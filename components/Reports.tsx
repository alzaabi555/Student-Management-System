import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Share2, Printer } from 'lucide-react';
import { getDailyStats, getSchoolSettings } from '../services/dataService';
import { generateDailyReport } from '../services/geminiService';
import { printDailyReport } from '../services/printService';

const Reports: React.FC = () => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [schoolName, setSchoolName] = useState('مدرستي');

  useEffect(() => {
    const settings = getSchoolSettings();
    if (settings?.name) {
        setSchoolName(settings.name);
    }
  }, []);

  const handleGenerateReport = async () => {
    setLoading(true);
    const stats = getDailyStats(date);
    const result = await generateDailyReport(stats, date);
    setReport(result);
    setLoading(false);
  };

  const handleShareReport = async () => {
    if (!report) return;
    const url = `whatsapp://send?text=${encodeURIComponent(report)}`;
    
    if (window.electron && window.electron.openExternal) {
       try {
         await window.electron.openExternal(url);
       } catch (err) {
         console.error('Failed to open WhatsApp:', err);
         alert('تعذر فتح واتساب. تأكد من تثبيت التطبيق.');
       }
    } else {
       window.open(url, '_blank');
    }
  };

  const handlePrint = () => {
    if (!report) return;
    printDailyReport(schoolName, date, report);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto relative">
      <header className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">التقارير الذكية</h2>
        <p className="text-gray-500">تحليل بيانات الحضور باستخدام الذكاء الاصطناعي</p>
      </header>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
                <Sparkles className="text-yellow-300" />
            </div>
            <h3 className="font-bold text-lg">مساعد المدير الذكي</h3>
          </div>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
          />
        </div>

        <div className="p-8 min-h-[300px] flex flex-col items-center justify-center">
          {!report && !loading && (
            <div className="text-center text-gray-400">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>اضغط على زر الإنشاء للحصول على تحليل يومي للحضور والغياب</p>
            </div>
          )}

          {loading && (
            <div className="text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-gray-500 animate-pulse">جاري تحليل البيانات وصياغة التقرير...</p>
            </div>
          )}

          {report && !loading && (
            <div className="w-full animate-fadeIn">
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                {report}
              </div>
              
              <div className="mt-6 flex gap-3 justify-end">
                <button 
                  onClick={handleShareReport}
                  className="flex items-center gap-2 text-green-600 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors text-sm font-bold"
                >
                  <Share2 size={18} />
                  مشاركة عبر واتساب
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Printer size={18} />
                  طباعة / حفظ PDF
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
           <button 
             onClick={handleGenerateReport}
             disabled={loading}
             className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
           >
             <Sparkles size={20} />
             {loading ? 'جاري المعالجة...' : 'إنشاء تقرير يومي'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;