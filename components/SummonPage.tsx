
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MailWarning, Printer, CalendarClock, User, Share2, Settings, Upload, Image as ImageIcon, Trash2, Eye, X, FileWarning, ChevronDown, PenTool, Stamp } from 'lucide-react';
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
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]); // تاريخ الإصدار
  const [summonTime, setSummonTime] = useState('09:00');
  const [reasonType, setReasonType] = useState('absence'); // absence, truant, behavior, other
  const [customReason, setCustomReason] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // State for Modal Preview
  
  // Assets State (Signatures & Stamp)
  const [showAssetsSettings, setShowAssetsSettings] = useState(false);
  const [assets, setAssets] = useState<SchoolAssets>({});

  // Reference for PDF generation
  const letterRef = useRef<HTMLDivElement>(null);

  // Get School Name, District & Assets
  useEffect(() => {
    const fetchData = async () => {
        const settings = await getSchoolSettings();
        if (settings) {
            if (settings.name) setSchoolName(settings.name);
            if (settings.district) setDistrictName(settings.district);
        }
        const savedAssets = await getSchoolAssets();
        setAssets(savedAssets || {});
    };
    fetchData();
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
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const newAssets = { ...assets, [key]: base64 };
        setAssets(newAssets);
        await saveSchoolAssets(newAssets);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAsset = async (key: keyof SchoolAssets) => {
    const newAssets = { ...assets, [key]: undefined };
    setAssets(newAssets);
    await saveSchoolAssets(newAssets);
  };

  const handlePrint = () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;
    
    const gradeName = grades.find(g => g.id === selectedGrade)?.name || '';
    const className = classes.find(c => c.id === selectedClass)?.name || '';

    // Format Issue Date
    const formattedIssueDate = new Date(issueDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });

    printSummonLetter(
        schoolName,
        districtName,
        student.name,
        gradeName,
        className,
        summonDate,
        summonTime,
        getReasonText(),
        formattedIssueDate,
        assets
    );
  };

  const handleSendWhatsApp = async () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student || !student.parentPhone) {
        alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
        return;
    }

    // Ensure the letter is rendered (even if hidden)
    if (!letterRef.current) {
        alert('حدث خطأ في تجهيز النموذج. يرجى المحاولة مرة أخرى.');
        return;
    }

    try {
        setIsGeneratingPdf(true);

        // Force a small delay to ensure rendering if hidden
        await new Promise(resolve => setTimeout(resolve, 300));

        // 1. Generate PDF from the preview element
        const canvas = await html2canvas(letterRef.current, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 794, 
            windowHeight: 1123,
            onclone: (clonedDoc) => {
                // Ensure images are visible in clone
                const images = clonedDoc.getElementsByTagName('img');
                for (let i = 0; i < images.length; i++) {
                    images[i].style.visibility = 'visible';
                }
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        
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
  const formattedIssueDate = new Date(issueDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });

  const isFormValid = selectedStudentId && (reasonType !== 'other' || customReason);

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-4 pt-4 px-2">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
            <FileWarning size={28} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-slate-800">استدعاء ولي أمر</h2>
            <p className="text-gray-500 text-sm mt-1">إنشاء خطابات استدعاء رسمية ومشاركتها</p>
        </div>
      </div>

      <div className="card p-6 md:p-8 animate-fadeIn space-y-8">
        
        {/* Section 1: Student Data */}
        <div className="space-y-4">
             <h3 className="font-bold text-slate-800 text-sm border-b pb-2 border-gray-100 flex items-center gap-2">
                <User size={18} className="text-blue-600" />
                بيانات الطالب
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">الصف الدراسي</label>
                    <select 
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="form-input text-sm"
                    >
                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">الفصل</label>
                    <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        disabled={availableClasses.length === 0}
                        className="form-input text-sm"
                    >
                        {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">اسم الطالب</label>
                    <select 
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        disabled={availableStudents.length === 0}
                        className="form-input text-sm font-bold"
                    >
                        {availableStudents.length === 0 && <option value="">لا يوجد طلاب</option>}
                        {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
             </div>
        </div>

        {/* Section 2: Meeting Details */}
        <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2 border-gray-100 flex items-center gap-2">
                <CalendarClock size={18} className="text-blue-600" />
                تفاصيل الاستدعاء
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">تاريخ إصدار الخطاب</label>
                    <input 
                        type="date" 
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="form-input text-sm text-center bg-blue-50 border-blue-200"
                    />
                </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">تاريخ الحضور المطلوب</label>
                    <input 
                        type="date" 
                        value={summonDate}
                        onChange={(e) => setSummonDate(e.target.value)}
                        className="form-input text-sm text-center"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">وقت الحضور</label>
                    <input 
                        type="time" 
                        value={summonTime}
                        onChange={(e) => setSummonTime(e.target.value)}
                        className="form-input text-sm text-center"
                    />
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-600">سبب الاستدعاء</label>
                <div className="flex flex-wrap gap-3">
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
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border 
                                ${reasonType === reason.id 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
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
                        className="form-input h-20 resize-none text-sm mt-3"
                    />
                )}
            </div>
        </div>

        {/* Section 3: Assets Toggle */}
        <div className="pt-2">
           <button 
              onClick={() => setShowAssetsSettings(!showAssetsSettings)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
           >
              <Settings size={16} />
              <span>التحقق من التواقيع والختم</span>
              <ChevronDown size={14} className={`transition-transform ${showAssetsSettings ? 'rotate-180' : ''}`} />
           </button>

           {showAssetsSettings && (
             <div className="p-4 border border-gray-100 rounded-xl mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50">
                {[
                    { key: 'headerLogo', label: 'شعار الوزارة', icon: <ImageIcon size={14}/> },
                    { key: 'schoolStamp', label: 'الختم المدرسي', icon: <Stamp size={14}/> },
                    { key: 'principalSig', label: 'توقيع المدير', icon: <PenTool size={14}/> },
                    { key: 'committeeSig', label: 'رئيس اللجنة', icon: <PenTool size={14}/> },
                ].map((item) => (
                    <div key={item.key}>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-600">{item.label}</label>
                            {(assets as any)[item.key] && (
                                <button onClick={() => clearAsset(item.key as keyof SchoolAssets)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={10}/></button>
                            )}
                        </div>
                        <div className="relative border border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-white transition-colors cursor-pointer bg-white h-16 flex items-center justify-center">
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(item.key as keyof SchoolAssets, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            {(assets as any)[item.key] ? (
                                <img src={(assets as any)[item.key]} className="max-h-full max-w-full object-contain" alt="Asset" />
                            ) : (
                                <div className="text-gray-400 text-[10px] flex flex-col items-center gap-1">{item.icon}</div>
                            )}
                        </div>
                    </div>
                ))}
             </div>
           )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-100">
            <button 
                onClick={() => setShowPreview(true)}
                disabled={!isFormValid}
                className="btn btn-secondary flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
                <Eye size={18} />
                معاينة الخطاب
            </button>
            
            <button 
                onClick={handlePrint}
                disabled={!isFormValid}
                className="btn btn-secondary flex-1"
            >
                <Printer size={18} />
                طباعة
            </button>
            
            <button 
                onClick={handleSendWhatsApp}
                disabled={!isFormValid || isGeneratingPdf}
                className="btn flex-1 bg-green-600 text-white hover:bg-green-700 border-transparent shadow-sm"
            >
                {isGeneratingPdf ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Share2 size={18} />}
                {isGeneratingPdf ? 'جاري التجهيز...' : 'واتساب PDF'}
            </button>
        </div>
      </div>

      {/* 
          PREVIEW & RENDER COMPONENT 
      */}
      <div 
        className={`
            fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-200
            ${showPreview ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}
        `}
      >
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
             
             {/* Modal Header */}
             <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Eye size={18} className="text-blue-600" />
                    معاينة الخطاب
                </h3>
                <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors">
                    <X size={24} />
                </button>
             </div>

             {/* Scrollable Preview Area */}
             <div className="flex-1 overflow-auto p-8 bg-gray-200 flex justify-center">
                 <div className="bg-white shadow-lg w-[210mm] min-h-[297mm] p-[15mm] text-black font-serif origin-top transform scale-90 md:scale-100">
                     <LetterContent 
                        schoolName={schoolName}
                        districtName={districtName}
                        assets={assets}
                        studentName={selectedStudentName}
                        gradeName={selectedGradeName}
                        className={selectedClassName}
                        reason={getReasonText()}
                        date={summonDate}
                        time={summonTime}
                        issueDate={formattedIssueDate}
                     />
                 </div>
             </div>
             
             {/* Modal Footer Actions */}
             <div className="p-4 border-t bg-white flex justify-end gap-3">
                 <button onClick={() => setShowPreview(false)} className="btn btn-secondary">إغلاق</button>
                 <button onClick={() => { setShowPreview(false); handleSendWhatsApp(); }} className="btn bg-green-600 text-white">إرسال</button>
             </div>
        </div>
      </div>

      {/* 
         HIDDEN RENDER FOR PDF GENERATION 
         نضع العنصر خارج الشاشة ولكن بوضعية تسمح بالرسم لضمان ظهور الصور
      */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={letterRef} className="w-[210mm] min-h-[297mm] bg-white p-[15mm] text-black font-serif">
             <LetterContent 
                schoolName={schoolName}
                districtName={districtName}
                assets={assets}
                studentName={selectedStudentName}
                gradeName={selectedGradeName}
                className={selectedClassName}
                reason={getReasonText()}
                date={summonDate}
                time={summonTime}
                issueDate={formattedIssueDate}
             />
        </div>
      </div>

    </div>
  );
};

// Reusable Letter Content Component
const LetterContent: React.FC<{
    schoolName: string;
    districtName: string;
    assets: SchoolAssets;
    studentName: string;
    gradeName: string;
    className: string;
    reason: string;
    date: string;
    time: string;
    issueDate: string;
}> = ({ schoolName, districtName, assets, studentName, gradeName, className, reason, date, time, issueDate }) => {
    return (
        <div className="border-[3px] border-double border-black p-10 h-full flex flex-col relative justify-between">
            {/* Header Section */}
            {/* التعديل: النصوص يمين، الشعار وسط */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-6">
                 {/* يمين الصفحة (حسب RTL): النص */}
                 <div className="text-right space-y-1 w-1/3">
                    <h2 className="font-bold text-lg leading-tight">سلطنة عُمان</h2>
                    <h2 className="font-bold text-lg leading-tight">وزارة التربية والتعليم</h2>
                    <h3 className="font-bold text-base leading-tight">المديرية العامة للتربية والتعليم لمحافظة {districtName}</h3>
                    <h3 className="font-bold text-base leading-tight">مدرسة {schoolName}</h3>
                 </div>

                 {/* وسط الصفحة: الشعار (Logo) */}
                 <div className="flex-1 flex justify-center items-center">
                    {assets.headerLogo ? (
                        <img src={assets.headerLogo} alt="Logo" className="h-28 object-contain" />
                    ) : (
                        <div className="h-24 w-24 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 rounded-full">شعار الوزارة</div>
                    )}
                 </div>

                 {/* يسار الصفحة: فارغ أو تاريخ */}
                 <div className="w-1/3 flex justify-end items-center">
                    {/* مساحة فارغة للتوازن */}
                 </div>
            </div>

            {/* Letter Body */}
            <div className="flex-1 text-right space-y-6 text-[18px] leading-relaxed">
                
                <div className="border-b border-black pb-4 mb-4">
                    <div className="font-bold mb-3 flex justify-between">
                        <span>الفاضل ولي أمر الطالب : ( {studentName} )</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                        <span>المقيد بالصف : ( {gradeName} / {className} )</span>
                        <span className="text-base font-normal">تحريراً في: {issueDate}</span>
                    </div>
                </div>

                <div className="text-center font-bold text-2xl my-8 underline offset-8">
                    السلام علیکم ورحمة الله وبرکاته
                </div>
                
                <div style={{ textAlign: 'justify', textAlignLast: 'right' }}>
                    <p className="mb-4">
                        نظراً لأهمية التعاون بين المدرسة وولي الأمر فيما يخدم مصلحة الطالب، ويحقق له النجاح، نأمل منكم الحضور إلى المدرسة لبحث بعض الأمور المتعلقة بابنكم:
                    </p>
                    
                    <div className="my-6 text-center">
                        <span className="font-bold text-xl px-4 py-2 border-y-2 border-gray-100 inline-block bg-gray-50 rounded">
                           ( {reason || '...........................................'} )
                        </span>
                    </div>

                    <p>
                        ولنا في حضوركم أمل بهدف التعاون بين البيت والمدرسة لتحقيق الرسالة التربوية الهادفة التي نسعى إليها، وتأمل المدرسة حضوركم في أقرب فرصة ممكنة لديكم.
                    </p>
                </div>

                <div className="mt-8 border p-4 text-center bg-gray-50 border-gray-300 rounded">
                    <p className="font-bold text-lg">
                        * الموعد المقترح: يوم <span className="underline mx-2">{date}</span> الساعة <span className="underline mx-2">{time}</span>.
                    </p>
                </div>

                <div className="mt-8 font-bold text-center text-lg">
                    شاكرين لكم حسن تعاونكم وتجاوبكم معنا لتحقيق مصلحة الطالب،،
                </div>
            </div>

            {/* Signatures Footer */}
            <div className="mt-16 relative">
                 <div className="flex justify-between items-end">
                    {/* يمين الصفحة: رئيس اللجنة */}
                    <div className="text-center w-1/3 flex flex-col items-center justify-end">
                        <p className="font-bold mb-4 text-sm">رئيس لجنة شؤون الطلبة</p>
                        {assets.committeeSig ? (
                            <img src={assets.committeeSig} className="h-20 object-contain" />
                        ) : (
                            <div className="h-20 w-full flex items-end justify-center pb-2">...................</div>
                        )}
                    </div>

                    {/* وسط الصفحة: الختم */}
                    <div className="flex-1 flex justify-center items-center pb-2">
                        {assets.schoolStamp ? (
                            <img src={assets.schoolStamp} alt="Stamp" className="h-32 w-32 object-contain opacity-90 transform rotate-[-5deg]" />
                        ) : (
                            <div className="h-24 w-24 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 rounded-full">الختم المدرسي</div>
                        )}
                    </div>

                    {/* يسار الصفحة: مدير المدرسة */}
                    <div className="text-center w-1/3 flex flex-col items-center justify-end">
                        <p className="font-bold mb-4 text-sm">مدير المدرسة</p>
                        {assets.principalSig ? (
                            <img src={assets.principalSig} className="h-20 object-contain" />
                        ) : (
                            <div className="h-20 w-full flex items-end justify-center pb-2">...................</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummonPage;
