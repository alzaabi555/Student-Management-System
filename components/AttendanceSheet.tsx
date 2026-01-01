import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Save, Send, MessageSquare, Check, X, AlertTriangle, MessageCircle, Layers, ArrowRight, DoorOpen, Clock, ListChecks, SkipForward, Ban, FileDown, CheckCircle2, Share2, Loader2, Search } from 'lucide-react';
import { students, grades, classes, getAttendance, saveAttendance, getAttendanceRecord } from '../services/dataService';
import { AttendanceStatus, Student } from '../types';
import { TableVirtuoso } from 'react-virtuoso';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface AttendanceSheetProps {
  onNavigate: (page: string) => void;
}

interface QueueItem {
  student: Student;
  status: AttendanceStatus;
  message: string;
  period?: number;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ onNavigate }) => {
  const [selectedGrade, setSelectedGrade] = useState<string>(grades.length > 0 ? grades[0].id : '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [messageModal, setMessageModal] = useState<{isOpen: boolean, student: Student | null, type: string | null, period?: number}>({
    isOpen: false, student: null, type: null
  });
  const [messageText, setMessageText] = useState('');
  const [periodModal, setPeriodModal] = useState<{isOpen: boolean, studentId: string | null}>({
    isOpen: false, studentId: null
  });
  const [batchQueue, setBatchQueue] = useState<QueueItem[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [isBatchActive, setIsBatchActive] = useState(false);

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

  useEffect(() => {
    if (!selectedGrade && grades.length > 0) {
        setSelectedGrade(grades[0].id);
    }
  }, [grades.length, selectedGrade]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.classId === selectedClass && 
      s.name.includes(searchTerm)
    );
  }, [selectedClass, searchTerm, students]);

  useEffect(() => {
    const initialStatus: Record<string, AttendanceStatus> = {};
    filteredStudents.forEach(s => {
      initialStatus[s.id] = getAttendance(currentDate, s.id);
    });
    setLocalAttendance(initialStatus);
  }, [filteredStudents, currentDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (status === AttendanceStatus.TRUANT) {
        setPeriodModal({ isOpen: true, studentId: studentId });
    } else {
        setLocalAttendance(prev => ({ ...prev, [studentId]: status }));
        saveAttendance(currentDate, studentId, status);
    }
  };

  const confirmTruancyPeriod = (period: number) => {
      if (periodModal.studentId) {
          const sId = periodModal.studentId;
          setLocalAttendance(prev => ({ ...prev, [sId]: AttendanceStatus.TRUANT }));
          saveAttendance(currentDate, sId, AttendanceStatus.TRUANT, period);
          setPeriodModal({ isOpen: false, studentId: null });
          const student = students.find(s => s.id === sId);
          if (student) {
              openMessageModal(student, AttendanceStatus.TRUANT, period);
          }
      }
  };

  const handleManualSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
    }, 600);
  };

  const generateMessageText = (student: Student, status: AttendanceStatus, period?: number) => {
    if (!period && status === AttendanceStatus.TRUANT) {
        const record = getAttendanceRecord(currentDate, student.id);
        period = record?.period;
    }
    if (status === AttendanceStatus.ABSENT) {
      return `السلام عليكم ولي أمر الطالب ${student.name}،\nنفيدكم بغياب ابنكم عن المدرسة اليوم الموافق ${currentDate}.\nنأمل تزويدنا بمبرر الغياب.\nإدارة المدرسة`;
    } else if (status === AttendanceStatus.TRUANT) {
      return `عاجل: السلام عليكم ولي أمر الطالب ${student.name}،\nنفيدكم بأن الطالب تسرب من الحصة رقم (${period || 'غير محدد'}) اليوم الموافق ${currentDate}.\nنرجو متابعة الأمر مع الطالب.\nإدارة المدرسة`;
    } else if (status === AttendanceStatus.ESCAPE) {
      return `عاجل وخطير: السلام عليكم ولي أمر الطالب ${student.name}،\nنأسف لإبلاغكم بأنه تم رصد "تسرب" للطالب من المدرسة أثناء اليوم الدراسي ${currentDate}.\nنرجو الحضور للمدرسة فوراً للأهمية.\nإدارة المدرسة`;
    }
    return "";
  };

  const openMessageModal = (student: Student, status: AttendanceStatus, period?: number) => {
    const msg = generateMessageText(student, status, period);
    setMessageText(msg);
    setMessageModal({ isOpen: true, student, type: status, period });
  };

  const sendMessage = async (method: 'WHATSAPP' | 'SMS', overridePhone?: string, overrideText?: string) => {
    let phone = overridePhone || messageModal.student?.parentPhone || '';
    const text = encodeURIComponent(overrideText || messageText);
    
    if (!phone) {
        alert('لا يوجد رقم هاتف مسجل');
        return;
    }
    
    // 2. تنظيف وتنسيق رقم الهاتف (حسب كود الدولة - عمان 968)
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    
    if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
    else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);

    if (method === 'WHATSAPP') {
        // ============================================================
        // 🔥 هنا يكمن السحر: منطق الجسر المزدوج (Dual Bridge Logic) 🔥
        // ============================================================

        if (window.electron) {
            // الحالة أ: نحن في الويندوز (تطبيق سطح المكتب)
            // نستخدم الجسر لفتح تطبيق واتساب المثبت على الكمبيوتر مباشرة
            // استخدام whatsapp:// يفتح التطبيق فوراً
            await window.electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${text}`);
        } else {
            // الحالة ب: نحن في الهاتف (أندرويد/آيفون) أو متصفح ويب
            // نستخدم الرابط العالمي الذي يفهمه الهاتف ويحولنا للتطبيق
            const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`;
            
            try {
                // محاولة استخدام Capacitor لفتح الرابط بطريقة نايتيف
                if (Capacitor.isNativePlatform()) {
                    await Browser.open({ url: universalUrl });
                } else {
                    // فتح في نافذة جديدة للمتصفحات العادية
                    window.open(universalUrl, '_blank');
                }
            } catch (e) {
                // خط دفاع أخير
                window.open(universalUrl, '_blank');
            }
        }
    } else {
        // إرسال SMS عادي
        window.location.href = `sms:${cleanPhone}?body=${text}`;
    }
    
    if (!isBatchActive) setMessageModal({ isOpen: false, student: null, type: null });
  };

  const startBatchProcessing = () => {
    const targets: QueueItem[] = [];
    filteredStudents.forEach(student => {
        const status = localAttendance[student.id];
        if (status && status !== AttendanceStatus.PRESENT) {
            targets.push({ student, status, message: generateMessageText(student, status) });
        }
    });
    if (targets.length === 0) {
        alert("لا يوجد طلاب غائبين أو متسربين لإرسال رسائل لهم.");
        return;
    }
    setBatchQueue(targets);
    setCurrentBatchIndex(0);
    setIsBatchActive(true);
  };

  const processNextInBatch = (skipped: boolean = false) => {
    if (currentBatchIndex < batchQueue.length - 1) setCurrentBatchIndex(prev => prev + 1);
    else {
        setIsBatchActive(false);
        setBatchQueue([]);
        alert("تم الانتهاء من طابور الرسائل بنجاح!");
    }
  };

  const sendCurrentBatchMessage = () => {
    const item = batchQueue[currentBatchIndex];
    sendMessage('WHATSAPP', item.student.parentPhone, item.message);
    processNextInBatch();
  };

  // PDF Generation Logic
  const STUDENTS_PER_PAGE = 20;
  const reportPages = useMemo(() => {
    if (!filteredStudents.length) return [];
    const pages = [];
    for (let i = 0; i < filteredStudents.length; i += STUDENTS_PER_PAGE) {
        pages.push(filteredStudents.slice(i, i + STUDENTS_PER_PAGE));
    }
    return pages;
  }, [filteredStudents]);

  const handlePrintPdf = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
        const element = document.getElementById('print-report');
        if (element) {
            // @ts-ignore
            if (window.html2pdf) {
                 const opt = {
                    margin: [0.5, 0.5],
                    filename: `attendance_report_${currentDate}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                // @ts-ignore
                window.html2pdf().set(opt).from(element).save().then(() => setIsGeneratingPdf(false));
            } else {
                window.print();
                setIsGeneratingPdf(false);
            }
        }
    }, 100);
  };

  return (
    <div className="p-3 md:p-6 h-[calc(100vh-80px)] flex flex-col relative">
      {/* Toast Notification */}
      {showSaveToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-fadeIn flex items-center gap-2">
          <CheckCircle2 size={20} />
          <span className="font-bold">تم حفظ البيانات بنجاح</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ListChecks className="text-primary" />
            سجل الحضور اليومي
          </h2>
          <p className="text-xs md:text-sm text-gray-500">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
           {isBatchActive ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl w-full md:w-auto">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-blue-600 font-bold uppercase">إرسال جماعي</span>
                    <span className="text-sm font-bold text-gray-800">
                        {currentBatchIndex + 1} / {batchQueue.length}
                    </span>
                 </div>
                 <div className="flex gap-1 mr-auto">
                    <button 
                        onClick={sendCurrentBatchMessage}
                        className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg flex items-center gap-1 text-xs font-bold"
                    >
                        إرسال <MessageCircle size={14} />
                    </button>
                    <button 
                        onClick={() => processNextInBatch(true)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg flex items-center gap-1 text-xs font-bold"
                    >
                        تخطي <SkipForward size={14} />
                    </button>
                    <button 
                        onClick={() => { setIsBatchActive(false); setBatchQueue([]); }}
                        className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg"
                    >
                        <Ban size={14} />
                    </button>
                 </div>
              </div>
           ) : (
            <>
                <button 
                    onClick={startBatchProcessing}
                    disabled={filteredStudents.length === 0}
                    className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 text-sm transition-all"
                >
                    <Share2 size={18} />
                    <span className="hidden md:inline">إرسال للكل</span>
                </button>
                <button 
                    onClick={handleManualSave}
                    disabled={isSaving}
                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 text-sm transition-all"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>حفظ</span>
                </button>
                 <button 
                    onClick={handlePrintPdf}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                    title="تحميل PDF"
                >
                    <FileDown size={18} />
                </button>
            </>
           )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col md:flex-row gap-3 items-center">
         <div className="flex gap-2 w-full md:w-auto flex-1">
            <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="flex-1 md:w-48 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            >
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            
            <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={availableClasses.length === 0}
                className="flex-1 md:w-32 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100"
            >
                {availableClasses.length === 0 && <option value="">لا توجد فصول</option>}
                {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
         </div>
         
         <div className="relative w-full md:w-64">
            <input
                type="text"
                placeholder="بحث عن طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
         </div>
      </div>

      {/* Main List */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {grades.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <Layers size={48} className="mb-4 opacity-20" />
                <p>يجب عليك أولاً إضافة الهيكل المدرسي (الصفوف والفصول)</p>
                <button onClick={() => onNavigate('structure')} className="mt-4 text-primary font-bold hover:underline">الذهاب للإعدادات</button>
             </div>
        ) : !selectedClass ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <ArrowRight size={48} className="mb-4 opacity-20" />
                <p>اختر الصف والفصل لعرض قائمة الطلاب</p>
            </div>
        ) : filteredStudents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <p>لا يوجد طلاب في هذا الفصل.</p>
                <button onClick={() => onNavigate('students')} className="mt-2 text-primary font-bold hover:underline">إضافة طلاب</button>
            </div>
        ) : (
            <TableVirtuoso
                style={{ height: '100%', direction: 'rtl' }}
                data={filteredStudents}
                fixedHeaderContent={() => (
                    <tr className="bg-gray-50 border-b border-gray-100 text-right">
                        <th className="p-3 md:p-4 text-xs font-bold text-gray-500 w-[40%]">الطالب</th>
                        <th className="p-3 md:p-4 text-xs font-bold text-gray-500 w-[40%] text-center">الحالة</th>
                        <th className="p-3 md:p-4 text-xs font-bold text-gray-500 w-[20%] text-center">إجراء</th>
                    </tr>
                )}
                itemContent={(index, student) => {
                    const status = localAttendance[student.id];
                    return (
                        <>
                            <td className="p-3 md:p-4 border-b border-gray-50">
                                <div className="font-medium text-gray-800 text-sm md:text-base">{student.name}</div>
                                <div className="text-[10px] text-gray-400">{student.parentPhone}</div>
                            </td>
                            <td className="p-2 md:p-4 border-b border-gray-50">
                                <div className="flex justify-center gap-1 md:gap-2 bg-gray-100/50 p-1 rounded-lg max-w-[280px] mx-auto">
                                    <button 
                                        onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)}
                                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${status === AttendanceStatus.PRESENT ? 'bg-white shadow-sm text-green-600 ring-1 ring-green-100' : 'text-gray-400 hover:text-green-600'}`}
                                        title="حاضر"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)}
                                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${status === AttendanceStatus.ABSENT ? 'bg-white shadow-sm text-red-600 ring-1 ring-red-100' : 'text-gray-400 hover:text-red-600'}`}
                                        title="غائب"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleStatusChange(student.id, AttendanceStatus.TRUANT)}
                                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${status === AttendanceStatus.TRUANT ? 'bg-white shadow-sm text-orange-500 ring-1 ring-orange-100' : 'text-gray-400 hover:text-orange-500'}`}
                                        title="تسرب حصة"
                                    >
                                        <Clock size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleStatusChange(student.id, AttendanceStatus.ESCAPE)}
                                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${status === AttendanceStatus.ESCAPE ? 'bg-white shadow-sm text-purple-600 ring-1 ring-purple-100' : 'text-gray-400 hover:text-purple-600'}`}
                                        title="هروب"
                                    >
                                        <DoorOpen size={18} />
                                    </button>
                                </div>
                            </td>
                            <td className="p-3 md:p-4 border-b border-gray-50 text-center">
                                <button 
                                    onClick={() => openMessageModal(student, status || AttendanceStatus.PRESENT)}
                                    className={`p-2 rounded-lg transition-colors ${status && status !== AttendanceStatus.PRESENT ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'text-gray-300 hover:bg-gray-50'}`}
                                    disabled={!status || status === AttendanceStatus.PRESENT}
                                >
                                    <MessageSquare size={18} />
                                </button>
                            </td>
                        </>
                    );
                }}
            />
        )}
      </div>

      {/* Message Modal */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
                    <MessageCircle size={40} className="mx-auto mb-2 opacity-90" />
                    <h3 className="font-bold text-lg">إشعار ولي الأمر</h3>
                    <p className="text-sm opacity-90">الطالب: {messageModal.student?.name}</p>
                </div>
                
                <div className="p-6 space-y-4">
                    <textarea 
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-green-500 focus:outline-none resize-none text-sm leading-relaxed"
                    ></textarea>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => sendMessage('WHATSAPP')}
                            className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            <Send size={18} />
                            واتساب
                        </button>
                        <button 
                            onClick={() => sendMessage('SMS')}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            <MessageSquare size={18} />
                            SMS
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => setMessageModal({ isOpen: false, student: null, type: null })}
                        className="w-full py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Period Selection Modal (For Truancy) */}
      {periodModal.isOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs animate-scaleIn">
                  <h3 className="font-bold text-center text-gray-800 mb-4">حدد الحصة المتسرب منها</h3>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                          <button 
                            key={p}
                            onClick={() => confirmTruancyPeriod(p)}
                            className="aspect-square rounded-lg bg-orange-50 text-orange-700 font-bold hover:bg-orange-500 hover:text-white transition-colors border border-orange-100"
                          >
                              {p}
                          </button>
                      ))}
                  </div>
                  <button 
                    onClick={() => setPeriodModal({isOpen: false, studentId: null})}
                    className="w-full py-2 text-gray-400 font-bold hover:text-gray-600"
                  >
                      إلغاء
                  </button>
              </div>
          </div>
      )}

      {/* Hidden Print Template */}
      <div className="hidden">
        <div id="print-report" className="p-8 bg-white text-right" dir="rtl">
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
                <div>
                   <h1 className="text-2xl font-bold mb-1">كشف متابعة الغياب اليومي</h1>
                   <p className="text-gray-600">التاريخ: {currentDate}</p>
                </div>
                <div className="text-left">
                    <p className="font-bold">المدرسة: {grades.length > 0 ? 'مدرستي' : ''}</p>
                </div>
            </div>

            {reportPages.map((pageStudents, pageIdx) => (
                <div key={pageIdx} className={pageIdx > 0 ? "break-before-page mt-8" : ""}>
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2 w-10">#</th>
                                <th className="border border-gray-300 p-2">اسم الطالب</th>
                                <th className="border border-gray-300 p-2 w-32">الحالة</th>
                                <th className="border border-gray-300 p-2 w-48">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageStudents.map((s, idx) => {
                                const status = localAttendance[s.id] || AttendanceStatus.PRESENT;
                                let statusText = 'حاضر';
                                let rowClass = '';
                                if (status === AttendanceStatus.ABSENT) { statusText = 'غائب'; rowClass = 'bg-red-50'; }
                                if (status === AttendanceStatus.TRUANT) { statusText = 'تسرب حصة'; rowClass = 'bg-orange-50'; }
                                if (status === AttendanceStatus.ESCAPE) { statusText = 'هروب'; rowClass = 'bg-purple-50'; }
                                
                                return (
                                    <tr key={s.id} className={rowClass}>
                                        <td className="border border-gray-300 p-2 text-center">{idx + 1 + (pageIdx * STUDENTS_PER_PAGE)}</td>
                                        <td className="border border-gray-300 p-2">{s.name}</td>
                                        <td className="border border-gray-300 p-2 text-center font-bold">{statusText}</td>
                                        <td className="border border-gray-300 p-2"></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="mt-4 text-xs text-gray-500 flex justify-between">
                        <span>الصفحة {pageIdx + 1} من {reportPages.length}</span>
                        <span>تم الاستخراج بواسطة نظام مدرستي</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Loading Overlay for PDF */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center text-white">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-xl font-bold">جاري إعداد ملف الطباعة...</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceSheet;