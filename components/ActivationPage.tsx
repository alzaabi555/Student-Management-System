
import React, { useState, useEffect } from 'react';
import { Lock, Copy, Check, Unlock, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';
import { getDeviceFingerprint, validateLicense, saveLicense } from '../services/licenseService';

interface ActivationPageProps {
    onSuccess: () => void;
}

const ActivationPage: React.FC<ActivationPageProps> = ({ onSuccess }) => {
    const [deviceId, setDeviceId] = useState('');
    const [activationKey, setActivationKey] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setDeviceId(getDeviceFingerprint());
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(deviceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleActivate = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (validateLicense(activationKey)) {
            saveLicense(activationKey);
            onSuccess();
        } else {
            setError('كود التفعيل غير صحيح. يرجى التأكد من الكود والمحاولة مرة أخرى.');
        }
    };

    const whatsappMessage = `السلام عليكم، أرغب في تفعيل برنامج مدرستي.\nرقم جهازي هو: ${deviceId}`;
    const whatsappLink = `https://wa.me/96898344555?text=${encodeURIComponent(whatsappMessage)}`;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 font-sans" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                
                {/* Header */}
                <div className="bg-slate-800 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                        <Lock size={40} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">تفعيل النظام</h1>
                    <p className="text-slate-300 text-sm">برنامج مدرستي للإدارة المدرسية</p>
                </div>

                <div className="p-8 space-y-6">
                    
                    {/* Device ID Section */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center space-y-2">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">رقم معرف الجهاز (Device ID)</p>
                        <div className="flex items-center justify-center gap-2" onClick={handleCopy}>
                            <code className="font-mono text-lg font-bold text-slate-800 bg-white px-3 py-1 rounded border border-blue-200 select-all cursor-pointer">
                                {deviceId}
                            </code>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                className="p-2 hover:bg-white rounded-full transition-colors text-blue-600"
                                title="نسخ الكود"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            قم بنسخ هذا الرقم وإرساله للمطور للحصول على كود التفعيل
                        </p>
                    </div>

                    {/* Activation Form */}
                    <form onSubmit={handleActivate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">كود التفعيل (Activation Key)</label>
                            <input 
                                type="text" 
                                value={activationKey}
                                onChange={(e) => setActivationKey(e.target.value)}
                                className="form-input text-center text-lg tracking-widest uppercase font-mono"
                                placeholder="XXXX-XXXX-XXXX"
                                maxLength={14}
                            />
                        </div>

                        {error && (
                            <div className="text-red-600 text-xs bg-red-50 p-3 rounded-lg flex items-start gap-2">
                                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={!activationKey}
                            className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white w-full justify-center py-3 shadow-lg shadow-blue-500/30"
                        >
                            <Unlock size={20} />
                            تفعيل البرنامج
                        </button>
                    </form>

                    {/* Support Link */}
                    <div className="text-center pt-4 border-t border-gray-100">
                        <a 
                            href={whatsappLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-green-600 font-bold hover:text-green-700 hover:underline"
                        >
                            <MessageCircle size={18} />
                            تواصل مع المطور للحصول على الكود
                        </a>
                    </div>
                </div>
                
                <div className="bg-gray-50 p-3 text-center text-[10px] text-gray-400 font-mono border-t border-gray-100">
                    Madrasati Systems Security Layer © 2024
                </div>
            </div>
        </div>
    );
};

export default ActivationPage;
