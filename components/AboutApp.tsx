
import React, { useState } from 'react';
import { Info, User, Smartphone, Lock, X, Copy, Check, Terminal } from 'lucide-react';
import { generateExpectedKey } from '../services/licenseService';

const AboutApp: React.FC = () => {
  // --- Secret Admin States ---
  const [clickCount, setClickCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const handleSupportClick = async () => {
    const phone = '96898344555';
    // استخدام بروتوكول whatsapp://send للتطبيق المكتبي
    const url = `whatsapp://send?phone=${phone}`;
    
    if (window.electron && window.electron.openExternal) {
       try {
         await window.electron.openExternal(url);
       } catch (err) {
         console.error('Failed to open external link:', err);
         alert('تعذر فتح واتساب. تأكد من تثبيت التطبيق.');
       }
    } else {
       // Fallback للمتصفح العادي
       window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  // --- Secret Logic ---
  const handleDeveloperClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 5) {
        setShowAdminModal(true);
        setClickCount(0); // Reset for next time
    }
  };

  const handleGenerateKey = (e: React.FormEvent) => {
      e.preventDefault();
      if (!targetDeviceId.trim()) return;
      const key = generateExpectedKey(targetDeviceId.trim());
      setGeneratedKey(key);
  };

  const handleCopyKey = () => {
      if (!generatedKey) return;
      navigator.clipboard.writeText(generatedKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const closeAdminModal = () => {
      setShowAdminModal(false);
      setTargetDeviceId('');
      setGeneratedKey('');
      setClickCount(0);
  };

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
                <p className="text-sm text-slate-500 font-medium dir-ltr">Version 2.1.0</p>
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
                
                {/* بطاقة المصمم - Trigger for Secret Modal */}
                <div 
                    onClick={handleDeveloperClick}
                    className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3 hover:bg-indigo-50 transition-all duration-300 group cursor-pointer select-none relative overflow-hidden"
                >
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                         <User size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-indigo-900 truncate">
                        أ. محمد درويش الزعابي
                    </h3>
                    {/* Ripple effect hint on click (optional/subtle) */}
                    {clickCount > 0 && clickCount < 5 && (
                        <span className="absolute top-1 left-2 text-[10px] text-indigo-300 opacity-50">{clickCount}</span>
                    )}
                </div>
                
                {/* بطاقة التواصل */}
                <button onClick={handleSupportClick} className="w-full bg-green-50/50 border border-green-100 rounded-xl p-3 flex items-center gap-3 hover:bg-green-50 transition-all duration-300 cursor-pointer group text-right">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-green-600 shrink-0 group-hover:scale-110 transition-transform">
                         <Smartphone size={18} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">الدعم الفني</span>
                        <h3 className="text-sm font-bold text-green-800 dir-ltr font-mono">
                            98344555
                        </h3>
                    </div>
                </button>

            </div>

         </div>
      </div>

      {/* --- SECRET ADMIN KEYGEN MODAL --- */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden relative">
                
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Terminal size={20} className="text-green-500" />
                                لوحة المطور
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">نظام توليد مفاتيح التفعيل</p>
                        </div>
                        <button onClick={closeAdminModal} className="text-slate-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleGenerateKey} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">رقم جهاز العميل (Device ID)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none pr-3">
                                    <Lock size={16} className="text-slate-500" />
                                </div>
                                <input 
                                    type="text" 
                                    value={targetDeviceId}
                                    onChange={(e) => setTargetDeviceId(e.target.value)}
                                    placeholder="DEV-XXXX-XXXX"
                                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full pr-10 p-3 font-mono text-center tracking-wider placeholder-slate-600"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Lock size={18} />
                            توليد الكود
                        </button>
                    </form>

                    {/* Result Area */}
                    <div className={`mt-6 transition-all duration-500 ${generatedKey ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <div 
                            onClick={handleCopyKey}
                            className="bg-slate-800/50 p-4 rounded-xl border border-green-500/30 text-center cursor-pointer group relative overflow-hidden hover:bg-slate-800 transition-colors"
                        >
                            <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">كود التفعيل الناتج</p>
                            <div className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 tracking-widest select-all">
                                {generatedKey}
                            </div>
                            
                            <div className="absolute right-2 top-2 text-slate-600 group-hover:text-white transition-colors">
                                {isCopied ? <Check size={16} className="text-green-500"/> : <Copy size={16}/>}
                            </div>
                        </div>
                        {isCopied && <p className="text-green-500 text-xs text-center mt-2 font-bold animate-pulse">تم نسخ الكود بنجاح!</p>}
                    </div>
                </div>
                
                <div className="bg-slate-950 p-3 text-center border-t border-slate-800">
                    <p className="text-[10px] text-slate-600 font-mono">Restricted Access Area</p>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AboutApp;
