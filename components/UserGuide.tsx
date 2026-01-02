import React from 'react';
import { Layers, UserPlus, Users, LayoutDashboard, CheckCircle2, XCircle, AlertTriangle, DoorOpen, Save, Share2, Printer, FileDown, MessageCircle, HelpCircle, Settings } from 'lucide-react';

const UserGuide: React.FC = () => {
  const steps = [
    {
      title: "1. الهيكل المدرسي",
      desc: "البداية من هنا. قم بإضافة الصفوف (مثل: الخامس) ثم الفصول (مثل: 5/1).",
      icon: <Layers size={24} className="text-blue-600" />,
      bg: "bg-blue-50"
    },
    {
      title: "2. إضافة الطلاب",
      desc: "انتقل لصفحة الطلاب. يمكنك الإضافة يدوياً أو استيراد ملف Excel جاهز.",
      icon: <UserPlus size={24} className="text-indigo-600" />,
      bg: "bg-indigo-50"
    },
    {
      title: "3. تسجيل الحضور",
      desc: "اختر الصف والفصل، ثم انقر على حالة الطالب (حاضر، غائب، تسرب).",
      icon: <Users size={24} className="text-purple-600" />,
      bg: "bg-purple-50"
    },
    {
      title: "4. المتابعة والتقارير",
      desc: "احفظ السجل، اطبع التقارير اليومية، أو راسل أولياء الأمور عبر واتساب.",
      icon: <LayoutDashboard size={24} className="text-emerald-600" />,
      bg: "bg-emerald-50"
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20 overflow-y-auto custom-scrollbar h-[calc(100vh-80px)]">
      
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-3">دليل النظام</h2>
        <p className="text-gray-500">شرح سريع لأهم مميزات وخطوات العمل في نظام مدرستي</p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        {steps.map((step, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-md transition-all text-center group">
            <div className={`w-14 h-14 ${step.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
              {step.icon}
            </div>
            <h3 className="font-bold text-slate-800 mb-2">{step.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Legends */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                <HelpCircle size={18} className="text-primary"/>
                مفتاح الحالات
            </h3>
            <div className="space-y-4">
                {[
                    { l: "حاضر", i: <CheckCircle2 className="text-green-600" />, d: "الطالب موجود" },
                    { l: "غائب", i: <XCircle className="text-red-600" />, d: "غياب يوم كامل" },
                    { l: "تسرب (حصة)", i: <AlertTriangle className="text-amber-500" />, d: "هروب من حصة" },
                    { l: "هروب مدرسة", i: <DoorOpen className="text-purple-600" />, d: "خروج دون إذن" },
                ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="bg-gray-50 p-2 rounded-lg">{item.i}</div>
                        <div>
                            <span className="font-bold text-slate-700 text-sm block">{item.l}</span>
                            <span className="text-xs text-gray-400">{item.d}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                <Settings size={18} className="text-primary"/>
                الإجراءات السريعة
            </h3>
            <div className="grid grid-cols-2 gap-4">
                 {[
                    { l: "حفظ السجل", i: <Save size={18} />, c: "text-blue-600 bg-blue-50" },
                    { l: "واتساب مباشر", i: <MessageCircle size={18} />, c: "text-green-600 bg-green-50" },
                    { l: "طباعة تقرير", i: <Printer size={18} />, c: "text-slate-700 bg-gray-100" },
                    { l: "تصدير PDF", i: <FileDown size={18} />, c: "text-red-600 bg-red-50" },
                ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                        <div className={`p-2 rounded-lg ${item.c}`}>{item.i}</div>
                        <span className="font-bold text-slate-700 text-xs">{item.l}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;