import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MailWarning, Printer, CalendarClock, User, Share2, Settings, Upload, Image as ImageIcon, Trash2, ChevronDown } from 'lucide-react';
import { getSchoolSettings, grades, classes, students, saveSchoolAssets, getSchoolAssets, SchoolAssets } from '../services/dataService';
import { printSummonLetter } from '../services/printService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SummonPage: React.FC = () => {
  const [schoolName, setSchoolName] = useState('مدرستي');
  const [districtName, setDistrictName] = useState('.....');
  
  // Selection State
  const [selectedGrade, setSelectedGrade] = useState<string>(grades.length > 0 ? grades[0].id : '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Form State
  const [summonDate, setSummonDate] = useState(new Date().toISOString().split('T')[0]);
  const [summonTime, setSummonTime] = useState('09:00');
  const [reasonType, setReasonType] = useState('absence'); // absence, truant, behavior, other
  const [customReason, setCustomReason] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Assets State (Signatures & Stamp)
  const [showAssetsSettings, setShowAssetsSettings] = useState(false);
  const [assets, setAssets] = useState<SchoolAssets>({});

  // Reference for PDF Capture
  const letterRef = useRef<HTMLDivElement>(null);

  // Get School Name, District & Assets
  useEffect(() => {
    const settings = getSchoolSettings();
    if (settings) {
        if (settings.name) setSchoolName(settings.name);
        if (settings.district) setDistrictName(settings.district);
    }
    setAssets(getSchoolAssets());
  }, []);

  // Sync Classes
  const availableClasses = useMemo(() => 
    classes.filter(c => c.gradeId === selectedGrade), 
  [selectedGrade]);

  useEffect(() => {
    if (availableClasses.length > 0) {
        if (!availableClasses.find(c => c.id === selectedClass)) {
            setSelectedClass(availableClasses[0].id);
        }
    } else {
        setSelectedClass('');
    }
  }, [selectedGrade, availableClasses, selectedClass]);

  // Sync Students
  const availableStudents = useMemo(() => 
    students.filter(s => s.classId === selectedClass), 
  [selectedClass, students]);

  useEffect(() => {
    if (availableStudents.length > 0) {
        setSelectedStudentId(availableStudents[0].id);
    } else {
        setSelectedStudentId('');
    }
  }, [availableStudents]);

  const getReasonText = () => {
    switch (reasonType) {
        case 'absence': return 'تكرار الغياب عن المدرسة وتأثيره على المستوى الدراسي';
        case 'truant': return 'التسرب المتكرر من الحصص الدراسية';
        case 'behavior': return 'مناقشة بعض السلوكيات الصادرة من الطالب';
        case 'level': return 'مناقشة تدني المستوى التحصيلي للطالب';
        case 'other': return customReason;
        default: return '';
    }
  };

  const handleImageUpload = (key: keyof SchoolAssets, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newAssets = { ...assets, [key]: base64 };
        setAssets(newAssets);
        saveSchoolAssets(newAssets);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAsset = (key: keyof SchoolAssets) => {
    const newAssets = { ...assets, [key]: undefined };
    setAssets(newAssets);
    saveSchoolAssets(newAssets);
  };

  const handlePrint = () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;
    
    const gradeName = grades.find(g => g.id === selectedGrade)?.name || '';
    const className = classes.find(c => c.id === selectedClass)?.name || '';

    printSummonLetter(
        schoolName,
        districtName, // تمرير المحافظة للترويسة
        student.name,
        gradeName,
        className,
        summonDate,
        summonTime,
        getReasonText(),
        assets
    );
  };

  // --- LOGIC PRESERVED: WhatsApp + PDF Generation ---
  const handleSendWhatsApp = async () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student || !student.parentPhone) {
        alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
        return;
    }

    if (!letterRef.current) return;

    try {
        setIsGeneratingPdf(true);

        // 1. Generate PDF from the preview element
        const canvas = await html2canvas(letterRef.current, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // 2. Save PDF to user's device
        const fileName = `استدعاء_${student.name.replace(/\s+/g, '_')}.pdf`;
        pdf.save(fileName);

        // 3. Prepare WhatsApp Message
        const message = `السلام عليكم ولي أمر الطالب/ة ${student.name}.\n\n📎 مرفق طيه خطاب استدعاء رسمي بصيغة PDF يوضح سبب وتفاصيل الموعد المطلوب للحضور للمدرسة.\n\nشاكرين تعاونكم.\nإدارة مدرسة ${schoolName}`;

        const url = `whatsapp://send?phone=968${student.parentPhone}&text=${encodeURIComponent(message)}`;

        // 4. Instruct User & Open WhatsApp
        setTimeout(() => {
             alert(`تم تحميل ملف الاستدعاء باسم (${fileName}).\n\nسيتم فتح الواتساب الآن، يرجى سحب الملف وإفلاته في المحادثة ليكون الاستدعاء رسمياً.`);
             
             if (window.electron && window.electron.openExternal) {
                window.electron.openExternal(url);
             } else {
                window.open(url, '_blank');
             }
             setIsGeneratingPdf(false);
        }, 1000);

    } catch (err) {
        console.error('Error generating PDF:', err);
        alert('حدث خطأ أثناء إنشاء ملف PDF');
        setIsGeneratingPdf(false);
    }
  };

  const selectedStudentName = availableStudents.find(s=>s.id === selectedStudentId)?.name || '....................';
  const selectedGradeName = grades.find(g => g.id === selectedGrade)?.name || '.....';
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || '.....';

  const isFormValid = selectedStudentId && (reasonType !== 'other' || customReason);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <MailWarning className="text-amber-500" size={28} />
            استدعاء ولي أمر
        </h2>
        <p className="text-gray-500 text-sm">إصدار خطابات استدعاء رسمية ومشاركتها عبر واتساب</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Form Inputs */}
        <div className="xl:col-span-1 space-y-6">
            
            {/* Student Selection Card */}
            <div className="win-card p-5 animate-fadeIn">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm border-b pb-2 border-gray-100">
                    <User size={18} className="text-primary" />
                    بيانات الطالب
                </h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">الصف الدراسي</label>
                            <div className="relative">
                                <select 
                                    value={selectedGrade}
                                    onChange={(e) => setSelectedGrade(e.target.value)}
                                    className="win-input w-full p-2.5 appearance-none outline-none text-sm"
                                >
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                                <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">الفصل</label>
                            <div className="relative">
                                <select 
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    disabled={availableClasses.length === 0}
                                    className="win-input w-full p-2.5 appearance-none outline-none disabled:bg-gray-50 text-sm"
                                >
                                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">اسم الطالب</label>
                        <div className="relative">
                            <select 
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                disabled={availableStudents.length === 0}
                                className="win-input w-full p-2.5 appearance-none outline-none disabled:bg-gray-50 text-sm"
                            >
                                {availableStudents.length === 0 && <option value="">لا يوجد طلاب</option>}
                                {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Assets Configuration (Toggle) */}
            <div className="win-card p-1">
               <button 
                  onClick={() => setShowAssetsSettings(!showAssetsSettings)}
                  className="w-full flex items-center justify-between p-3 text-sm font-bold text-slate-700 hover:bg-gray-50 rounded-lg transition-colors"
               >
                  <div className="flex items-center gap-2">
                     <Settings size={18} className="text-gray-400" />
                     <span>الشعار والتواقيع</span>
                  </div>
                  <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">{showAssetsSettings ? 'إخفاء' : 'تعديل'}</span>
               </button>

               {showAssetsSettings && (
                 <div className="p-4 border-t border-gray-100 mt-1 space-y-4 animate-scaleIn bg-gray-50/30">
                    {[
                        { key: 'headerLogo', label: 'شعار الوزارة/المدرسة', icon: <ImageIcon size={14}/> },
                        { key: 'committeeSig', label: 'توقيع رئيس اللجنة', icon: <Upload size={14}/> },
                        { key: 'schoolStamp', label: 'الختم المدرسي', icon: <ImageIcon size={14}/> },
                        { key: 'principalSig', label: 'توقيع المدير', icon: <Upload size={14}/> }
                    ].map((item) => (
                        <div key={item.key}>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-bold text-slate-600">{item.label}</label>
                                {(assets as any)[item.key] && (
                                    <button onClick={() => clearAsset(item.key as keyof SchoolAssets)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={12}/></button>
                                )}
                            </div>
                            <div className="relative border border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-white transition-colors cursor-pointer bg-white">
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(item.key as keyof SchoolAssets, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                {(assets as any)[item.key] ? (
                                    <img src={(assets as any)[item.key]} className="h-8 mx-auto object-contain" alt="Asset" />
                                ) : (
                                    <div className="text-gray-400 text-[10px] flex flex-col items-center gap-1">{item.icon}<span>رفع صورة</span></div>
                                )}
                            </div>
                        </div>
                    ))}
                 </div>
               )}
            </div>

            {/* Meeting Details Card */}
            <div className="win-card p-5 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm border-b pb-2 border-gray-100">
                    <CalendarClock size={18} className="text-primary" />
                    تفاصيل الموعد والسبب
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">تاريخ الحضور</label>
                        <input 
                            type="date" 
                            value={summonDate}
                            onChange={(e) => setSummonDate(e.target.value)}
                            className="win-input w-full p-2 outline-none text-right text-sm"
                            style={{ direction: 'ltr' }}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">الوقت</label>
                        <input 
                            type="time" 
                            value={summonTime}
                            onChange={(e) => setSummonTime(e.target.value)}
                            className="win-input w-full p-2 outline-none text-right text-sm"
                            style={{ direction: 'ltr' }}
                        />
                    </div>
                </div>

                <div className="mb-6 space-y-2">
                    <label className="text-xs font-bold text-slate-600">سبب الاستدعاء</label>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'absence', label: 'تكرار الغياب' },
                            { id: 'truant', label: 'تسرب حصص' },
                            { id: 'behavior', label: 'سلوكيات' },
                            { id: 'level', label: 'تدني مستوى' },
                            { id: 'other', label: 'آخر ..' },
                        ].map((reason) => (
                            <button
                                key={reason.id}
                                onClick={() => setReasonType(reason.id)}
                                className={`px-3 py-1.5 rounded-[4px] text-[11px] font-bold transition-all border ${reasonType === reason.id ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {reason.label}
                            </button>
                        ))}
                    </div>
                    {reasonType === 'other' && (
                        <textarea 
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="اكتب سبب الاستدعاء هنا..."
                            className="win-input w-full p-2 outline-none h-20 resize-none text-sm mt-2"
                        />
                    )}
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handlePrint}
                        disabled={!isFormValid}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-black text-white rounded-[4px] font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        <Printer size={16} />
                        طباعة
                    </button>
                    <button 
                        onClick={handleSendWhatsApp}
                        disabled={!isFormValid || isGeneratingPdf}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-[4px] font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {isGeneratingPdf ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Share2 size={16} />}
                        {isGeneratingPdf ? 'جاري التجهيز...' : 'واتساب PDF'}
                    </button>
                </div>
            </div>
        </div>

        {/* Right Column: High Fidelity Preview */}
        <div className="xl:col-span-2">
            <div className="bg-gray-100 p-8 rounded-xl border border-gray-200 shadow-inner flex justify-center items-start h-full overflow-auto">
                {/* Simulated Paper A4 - Fixed Size & Padding */}
                <div className="bg-white shadow-lg w-[210mm] min-h-[297mm] relative mx-auto origin-top">
                     {/* 
                        This div is captured by html2canvas. 
                        It MUST look exactly like a printed paper.
                        Margins reduced from 20mm to 10mm (approx p-10) to fix "small form" issue.
                     */}
                    <div ref={letterRef} className="w-full h-full p-10 flex flex-col text-black font-serif">
                        
                        {/* Frame Border - Adjusted Padding */}
                        <div className="border-[3px] border-double border-black p-6 h-full flex flex-col relative justify-between">

                            {/* Header */}
                            <div className="text-center space-y-2 mb-8">
                                <div className="flex justify-center mb-2 h-24 relative">
                                     {assets.headerLogo ? (
                                         <img src={assets.headerLogo} alt="Logo" className="h-full w-auto object-contain" />
                                     ) : (
                                         <img 
                                            src="/assets/logo.png" 
                                            alt="Logo" 
                                            className="h-full w-auto object-contain grayscale opacity-80" 
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                document.getElementById('fallback-logo-box')?.classList.remove('hidden');
                                            }} 
                                        />
                                     )}
                                     
                                     {/* Placeholder Box that appears if no logo exists */}
                                     <div id="fallback-logo-box" className={`w-24 h-24 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs font-bold rounded-lg absolute top-0 left-1/2 transform -translate-x-1/2 ${assets.headerLogo ? 'hidden' : 'hidden'}`}>
                                        شعار الوزارة
                                     </div>
                                </div>
                                <h2 className="font-bold text-lg leading-tight">سلطنة عُمان</h2>
                                <h2 className="font-bold text-lg leading-tight">وزارة التربية والتعليم</h2>
                                <h3 className="font-bold text-base leading-tight">المديرية العامة للتربية والتعليم لمحافظة {districtName}</h3>
                                <h3 className="font-bold text-base leading-tight">مدرسة {schoolName}</h3>
                            </div>

                            {/* Body */}
                            <div className="flex-1 text-right space-y-8 leading-loose text-justify text-[16px]">
                                
                                <div className="flex flex-wrap justify-between gap-4 font-bold border-b border-black pb-4">
                                    <span>الفاضل ولي أمر الطالب : ( {selectedStudentName} )</span>
                                    <span>المقيد بالصف : ( {selectedGradeName} / {selectedClassName} )</span>
                                </div>

                                <div className="text-center font-bold text-2xl my-8 underline offset-4">
                                    السلام علیکم ورحمة الله وبرکاته
                                </div>
                                
                                <p className="indent-16 leading-[2.5]">
                                    نظراً لأهمية التعاون بين المدرسة وولي الأمر فيما يخدم مصلحة الطالب، ويحقق له النجاح، ونأمل منكم الحضور إلى المدرسة لبحث بعض الأمور المتعلقة بابنكم:
                                    <br/>
                                    ( <span className="font-bold underline text-lg mx-2">{getReasonText() || '...........................................'}</span> ) 
                                    <br/>
                                    ولنا في حضوركم أمل بهدف التعاون بين البيت والمدرسة لتحقيق الرسالة التربوية الهادفة التي نسعى إليها، وتأمل المدرسة حضوركم في أقرب فرصة ممكنة لديكم.
                                </p>

                                <div className="mt-8 border p-4 text-center bg-gray-50">
                                     <p className="font-bold text-lg">
                                        * الموعد المقترح: يوم <span className="underline mx-2">{summonDate}</span> الساعة <span className="underline mx-2">{summonTime}</span>.
                                    </p>
                                </div>

                                <div className="mt-8 font-bold text-center text-lg">
                                    شاكرين لكم حسن تعاونكم وتجاوبكم معنا لتحقيق مصلحة الطالب،،
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="mt-16 px-4 flex justify-between items-end relative h-32">
                                {/* Committee Head */}
                                <div className="text-center w-1/3 z-10">
                                    <p className="font-bold mb-4 text-sm">رئيس لجنة شؤون الطلبة</p>
                                    {assets.committeeSig ? (
                                        <img src={assets.committeeSig} className="h-20 mx-auto object-contain" />
                                    ) : (
                                        <div className="mt-10 border-b border-black w-2/3 mx-auto"></div>
                                    )}
                                </div>

                                {/* Stamp */}
                                {assets.schoolStamp && (
                                    <div className="absolute left-1/2 bottom-4 transform -translate-x-1/2 z-0 opacity-90 pointer-events-none mix-blend-multiply">
                                         <img src={assets.schoolStamp} className="w-32 object-contain" />
                                    </div>
                                )}

                                {/* Principal */}
                                <div className="text-center w-1/3 z-10">
                                    <p className="font-bold mb-4 text-sm">مدير المدرسة</p>
                                    {assets.principalSig ? (
                                        <img src={assets.principalSig} className="h-20 mx-auto object-contain" />
                                    ) : (
                                        <div className="mt-10 border-b border-black w-2/3 mx-auto"></div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SummonPage;