import React from 'react';
import { 
  Layers, UserPlus, Users, LayoutDashboard, 
  CheckCircle2, XCircle, AlertTriangle, DoorOpen, 
  FileDown, MessageCircle, Share2, Save, Filter,
  BookOpen, HelpCircle, ArrowLeft
} from 'lucide-react';

const UserGuide: React.FC = () => {
  const steps = [
    {
      title: "1. الهيكل المدرسي",
      desc: "ابدأ من هنا! قم بإضافة الصفوف الدراسية (مثل الخامس، السادس) ثم أضف الفصول لكل صف (مثل 5/1، 5/2). لا يمكن إضافة طلاب بدون هيكل.",
      icon: <Layers className="text-white" size={24} />,
      color: "bg-blue-600"
    },
    {
      title: "2. إضافة الطلاب",
      desc: "انتقل لإدارة الطلاب. يمكنك إضافتهم يدوياً واحداً تلو الآخر، أو استخدام ميزة 'استيراد إكسل' لإضافة قوائم كاملة دفعة واحدة.",
      icon: <UserPlus className="text-white" size={24} />,
      color: "bg-indigo-600"
    },
    {
      title: "3. تسجيل الحضور",
      desc: "في صفحة الحضور، اختر الصف والفصل. ستظهر القائمة. اضغط على الأيقونات لتغيير حالة الطالب (حاضر، غائب، تسرب).",
      icon: <Users className="text-white" size={24} />,
      color: "bg-purple-600"
    },
    {
      title: "4. التقارير والمتابعة",
      desc: "بعد التسجيل، اضغط 'حفظ'. يمكنك إرسال رسائل واتساب للغائبين بضغطة زر، أو طباعة تقرير PDF يومي.",
      icon: <LayoutDashboard className="text-white" size={24} />,
      color: "bg-emerald-600"
    }
  ];

  const statusIcons = [
    { label: "حاضر", icon: <CheckCircle2 className="text-green-600" />, desc: "الطالب موجود في الفصل." },
    { label: "غائب", icon: <XCircle className="text-red-600" />, desc: "غياب ليوم كامل." },
    { label: "تسرب (حصة)", icon: <AlertTriangle className="text-orange-600" />, desc: "الطالب حضر ولكن تغيب عن حصة محددة." },
    { label: "تسرب من المدرسة", icon: <DoorOpen className="text-purple-600" />, desc: "خروج الطالب من المدرسة دون إذن (هروب)." },
  ];

  const actionIcons = [
    { label: "حفظ البيانات", icon: <Save size={20} />, desc: "حفظ التغييرات في قاعدة البيانات المحلية." },
    { label: "إرسال واتساب", icon: <MessageCircle size={20} />, desc: "فتح محادثة مباشرة مع ولي الأمر بنص رسالة جاهز." },
    { label: "تحميل PDF", icon: <FileDown size={20} />, desc: "تصدير كشف الغياب بتنسيق A4 جاهز للطباعة." },
    { label: "إرسال للكل", icon: <Share2 size={20} />, desc: "إرسال رسائل واتساب لجميع المتغيبين دفعة واحدة." },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
          <BookOpen className="text-primary w-8 h-8 md:w-10 md:h-10" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">دليل استخدام النظام</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">شرح مبسط لكيفية إدارة نظام 'مدرستي' وتسجيل الحضور والمتابعة بكفاءة.</p>
      </div>

      {/* Steps Section */}
      <section>
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <HelpCircle className="text-primary" size={24} />
          كيف تبدأ؟
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${step.color}`}></div>
              <div className={`${step.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-gray-200`}>
                {step.icon}
              </div>
              <h4 className="font-bold text-lg mb-2">{step.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Status Legend */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">مفتاح حالات الحضور</h3>
          <div className="space-y-4">
            {statusIcons.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-1 bg-gray-50 p-2 rounded-lg">{item.icon}</div>
                <div>
                  <span className="font-bold text-gray-700 block text-sm">{item.label}</span>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">أيقونات الإجراءات</h3>
          <div className="grid grid-cols-1 gap-4">
            {actionIcons.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="bg-blue-50 text-primary p-2 rounded-lg">{item.icon}</div>
                <div>
                  <span className="font-bold text-gray-700 block text-sm">{item.label}</span>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Import Tip */}
      <section className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 pattern-dots"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white/20 p-4 rounded-full">
            <UserPlus size={32} className="text-white" />
          </div>
          <div className="text-center md:text-right flex-1">
            <h3 className="text-xl font-bold mb-2">نصيحة للمدارس الكبيرة</h3>
            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
              لتوفير الوقت، استخدم ميزة "استيراد إكسل" في صفحة إدارة الطلاب. قم بتحميل ملف القالب المرفق، املأ أسماء الطلاب وأرقام الهواتف، ثم ارفع الملف ليتم تسجيل فصل كامل في ثوانٍ.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default UserGuide;