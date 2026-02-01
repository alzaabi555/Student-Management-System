
import React from 'react';
import { Layers, UserPlus, CheckCircle2, FileText, ArrowLeft, School } from 'lucide-react';

interface IntroScreenProps {
  onComplete: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const steps = [
    {
      icon: <Layers size={32} className="text-blue-600" />,
      title: "1. إعداد الهيكل",
      desc: "ابدأ بإضافة الصفوف (مثل الخامس) والفصول الدراسية من قسم الهيكل المدرسي."
    },
    {
      icon: <UserPlus size={32} className="text-indigo-600" />,
      title: "2. إضافة الطلاب",
      desc: "أضف بيانات الطلاب يدوياً أو استورد القوائم مباشرة من ملفات Excel."
    },
    {
      icon: <CheckCircle2 size={32} className="text-emerald-600" />,
      title: "3. رصد يومي",
      desc: "سجل الغياب والتسرب بضغطة زر واحدة بكل سهولة ومرونة."
    },
    {
      icon: <FileText size={32} className="text-purple-600" />,
      title: "4. تقارير ذكية",
      desc: "اطبع التقارير أو أرسل إشعارات فورية لأولياء الأمور عبر واتساب."
    }
  ];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 animate-fadeIn">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Hero */}
        <div className="space-y-6 text-center md:text-right">
            <div className="inline-flex p-4 rounded-2xl bg-blue-50 text-blue-700 mb-4">
                <School size={48} />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 leading-tight">
                أهلاً بك في <span className="text-blue-600">نظام مدرستي</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed">
                الحل التقني الأمثل للإدارة المدرسية الحديثة. نظام متكامل يجمع بين سهولة الاستخدام وقوة الأداء لمتابعة شؤون الطلاب.
            </p>
            
            <button 
                onClick={onComplete}
                className="btn btn-primary text-lg px-8 py-4 rounded-xl shadow-xl shadow-blue-500/20 w-full md:w-auto mt-8 group"
            >
                <span>ابدأ العمل الآن</span>
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            </button>
        </div>

        {/* Right Side: Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((step, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                    <div className="mb-4 bg-white w-14 h-14 rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                        {step.icon}
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        {step.desc}
                    </p>
                </div>
            ))}
        </div>

      </div>
      
      <div className="absolute bottom-6 text-center text-slate-300 text-xs font-mono">
        Madrasati System v2.0
      </div>
    </div>
  );
};

export default IntroScreen;
