import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Save, Send, MessageSquare, Check, X, AlertTriangle, MessageCircle, Layers, ArrowRight, DoorOpen, Clock, ListChecks, SkipForward, Ban, FileDown, CheckCircle2, Share2, Loader2, Search } from 'lucide-react';
import { students, grades, classes, getAttendance, saveAttendance, getAttendanceRecord } from '../services/dataService';
import { AttendanceStatus, Student } from '../types';
import { TableVirtuoso } from 'react-virtuoso';

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

  const sendMessage = (method: 'WHATSAPP' | 'SMS', overridePhone?: string, overrideText?: string) => {
    let phone = overridePhone || messageModal.student?.parentPhone || '';
    const text = encodeURIComponent(overrideText || messageText);
    
    if (!phone) return;
    
    // تنظيف الرقم من الرموز فقط (بدون إضافة كود الدولة حسب الطلب)
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (method === 'WHATSAPP') {
        // ============================================================
        // 🔥 منطق الجسر المزدوج (Dual Bridge Logic) 🔥
        // ============================================================
        if (window.electron) {
            // الحالة أ: ويندوز (استخدام البروتوكول المباشر لفتح التطبيق)
            window.electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${text}`);
        } else {
            // الحالة ب: ويب/موبايل
            const url = `https://wa.me/${cleanPhone}?text=${text}`;
            window.open(url, '_blank');
        }
    } else {
        // SMS
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

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const element = document.getElementById('report-content-body');
    if (!element) { setIsGeneratingPdf(false); return; }
    const fileName = `تقرير-الغياب-${currentDate}.pdf`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const opt = {
      margin: 0, filename: fileName, image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
        try {
            const worker = html2pdf().set(opt).from(element);
            if (isMobile && navigator.canShare && navigator.share) {
                const pdfBlob = await worker.output('blob');
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'تقرير الغياب' });
                else await worker.save();
            } else await worker.save();
        } catch (err) { console.error("PDF Error:", err); alert("حدث خطأ أثناء المعالجة."); } 
        finally { setIsGeneratingPdf(false); }
    } else { alert("مكتبة PDF غير جاهزة."); setIsGeneratingPdf(false); }
  };

  const infractions = useMemo(() => {
    return filteredStudents.filter(s => {
      const status = localAttendance[s.id];
      return status && status !== AttendanceStatus.PRESENT;
    });
  }, [filteredStudents, localAttendance]);

  if (grades.length === 0) {
    return (
        <div className="p-4 md:p-6 h-[calc(100dvh-80px)] flex flex-col items-center justify-center text-center">
            <div className="bg-indigo-50 p-6 rounded-3xl mb-4 shadow-glow">
                <Layers size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">النظام فارغ</h2>
             <button onClick={() => onNavigate('structure')} className="bg-primary hover:bg-primaryLight text-white px-8 py-3 rounded-2xl font-bold mt-6 shadow-lg shadow-primary/30 transition-all transform hover:scale-105">
              تهيئة النظام الآن
            </button>
        </div>
    );
  }

  return (
    <>
    <div className="p-3 md:p-8 h-[calc(100dvh-80px)] flex flex-col relative z-10 space-y-4">
      
      {showSaveToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 animate-fadeIn flex items-center gap-3 glass-card border-emerald-500">
            <CheckCircle2 size={28} className="text-white" />
            <span className="font-bold text-lg">تم حفظ البيانات بنجاح!</span>
        </div>
      )}

      {/* Modern Header Control */}
      <div className="bg-white rounded-3xl p-4 md:p-6 shadow-soft border border-white/50 relative overflow-visible z-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
                <input 
                    type="date" 
                    value={currentDate} 
                    onChange={(e) => setCurrentDate(e.target.value)} 
                    className="bg-white border-0 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none text-gray-700" 
                />
                <div className="h-6 w-px bg-gray-200 mx-1"></div>
                <select 
                    value={selectedGrade} 
                    onChange={(e) => setSelectedGrade(e.target.value)} 
                    className="bg-transparent font-bold text-gray-700 text-sm focus:outline-none cursor-pointer hover:text-primary transition-colors"
                >
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <div className="text-gray-300">/</div>
                <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)} 
                    disabled={availableClasses.length === 0} 
                    className="bg-transparent font-bold text-gray-700 text-sm focus:outline-none cursor-pointer hover:text-primary transition-colors min-w-[80px]"
                >
                    {availableClasses.length === 0 && <option value="">لا يوجد</option>}
                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72 group">
                <input 
                    type="text" 
                    placeholder="ابحث عن طالب..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner group-hover:bg-white" 
                />
                <Search className="absolute left-3.5 top-3 text-gray-400 group-hover:text-primary transition-colors" size={18} />
            </div>
        </div>
      </div>

      {/* Main List Area with Performance Optimization */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-white/60 overflow-hidden flex flex-col relative">
        {!selectedClass || filteredStudents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <Filter size={32} className="opacity-20" />
             </div>
             <p>لا يوجد بيانات لعرضها حالياً</p>
          </div>
        ) : (
          <TableVirtuoso
            style={{ height: '100%', direction: 'rtl' }}
            data={filteredStudents}
            overscan={20} // Pre-render more rows for smooth scrolling on mobile with large lists
            className="no-scrollbar"
            fixedHeaderContent={() => (
              <tr className="bg-gray-50/90 backdrop-blur-sm h-12 border-b border-gray-100">
                <th className="px-6 text-xs font-extrabold text-gray-400 text-right uppercase tracking-wider w-[40%]">الطالب</th>
                <th className="px-2 text-xs font-extrabold text-gray-400 text-center uppercase tracking-wider w-[40%]">الحالة</th>
                <th className="px-4 text-xs font-extrabold text-gray-400 text-center uppercase tracking-wider w-[20%]">إجراء</th>
              </tr>
            )}
            itemContent={(index, student) => {
              const status = localAttendance[student.id] || AttendanceStatus.PRESENT;
              const record = getAttendanceRecord(currentDate, student.id);
              
              // Dynamic row styling
              const isInfraction = status !== AttendanceStatus.PRESENT;
              
              return (
                <>
                  <td className="px-6 py-3 border-b border-gray-50/50">
                    <div className="flex items-center gap-3">
                        <span className="text-gray-300 text-xs font-mono w-6">{(index + 1).toString().padStart(2, '0')}</span>
                        <div>
                            <div className={`font-bold text-sm ${isInfraction ? 'text-red-700' : 'text-gray-700'}`}>{student.name}</div>
                            {isInfraction && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-md mt-0.5">
                                    {status === AttendanceStatus.ABSENT && 'غياب كامل'}
                                    {status === AttendanceStatus.TRUANT && `تسرب (حصة ${record?.period || '?'})`}
                                    {status === AttendanceStatus.ESCAPE && 'هروب من المدرسة'}
                                </span>
                            )}
                        </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 border-b border-gray-50/50">
                    <div className="flex justify-center gap-1 bg-white border border-gray-100 p-1 rounded-xl shadow-sm w-fit mx-auto">
                      {[
                        { s: AttendanceStatus.PRESENT, icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'حاضر' },
                        { s: AttendanceStatus.ABSENT, icon: X, color: 'text-rose-500', bg: 'bg-rose-500', label: 'غائب' },
                        { s: AttendanceStatus.TRUANT, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500', label: 'تسرب' },
                        { s: AttendanceStatus.ESCAPE, icon: DoorOpen, color: 'text-violet-500', bg: 'bg-violet-500', label: 'هروب' }
                      ].map((opt) => (
                        <button 
                            key={opt.s}
                            onClick={() => handleStatusChange(student.id, opt.s)}
                            className={`
                                relative p-2 rounded-lg transition-all duration-300 group
                                ${status === opt.s 
                                    ? `${opt.bg} text-white shadow-lg shadow-${opt.color}/30 scale-105` 
                                    : 'text-gray-300 hover:bg-gray-50'}
                            `}
                            title={opt.label}
                        >
                            <opt.icon size={18} strokeWidth={status === opt.s ? 3 : 2} />
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center border-b border-gray-50/50">
                    {isInfraction ? (
                      <button onClick={() => openMessageModal(student, status)} className="text-primary hover:bg-primary/10 p-2 rounded-xl transition-colors">
                        <MessageSquare size={20} />
                      </button>
                    ) : (
                        <span className="text-gray-200">-</span>
                    )}
                  </td>
                </>
              );
            }}
          />
        )}
        
        {/* Footer Actions */}
        <div className="p-4 bg-white/80 backdrop-blur border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 z-20">
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 bg-gray-50 px-4 py-2 rounded-xl">
                <span>الطلاب: {filteredStudents.length}</span>
                <span className="h-4 w-px bg-gray-300"></span>
                <span className="text-rose-500">المخالفات: {infractions.length}</span>
            </div>

            <div className="flex gap-3 w-full md:w-auto justify-center md:justify-end">
                {filteredStudents.length > 0 && (
                    <>
                    <button onClick={startBatchProcessing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                        <ListChecks size={18} /> <span className="hidden md:inline">مراسلة الجميع</span>
                    </button>
                    <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-slate-700/20 transition-all hover:-translate-y-0.5">
                        {isGeneratingPdf ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18} />}
                        <span>PDF</span>
                    </button>
                    </>
                )}
                <button onClick={handleManualSave} disabled={isSaving} className="bg-primary hover:bg-primaryLight text-white px-8 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-glow transition-all hover:-translate-y-0.5 active:scale-95">
                    <Save size={18} /> <span>حفظ</span>
                </button>
            </div>
        </div>
      </div>

      {/* Modern Modals - Keeping Logic, Updating Styles */}
      {periodModal.isOpen && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-white/20 animate-scaleIn">
                <h3 className="text-lg font-bold mb-6 text-center text-slate-800">اختر حصة التسرب</h3>
                <div className="grid grid-cols-4 gap-3 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                        <button key={p} onClick={() => confirmTruancyPeriod(p)} className="bg-gray-50 hover:bg-amber-500 hover:text-white text-gray-600 font-bold py-3 rounded-2xl transition-all shadow-sm hover:shadow-lg hover:scale-105 border border-gray-100 hover:border-amber-500">
                            {p}
                        </button>
                    ))}
                </div>
                <button onClick={() => setPeriodModal({isOpen: false, studentId: null})} className="w-full py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-bold transition-colors">إلغاء الأمر</button>
            </div>
         </div>
      )}

      {messageModal.isOpen && !isBatchActive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn">
             <div className="bg-gradient-to-r from-primary to-primaryLight p-5 text-white flex justify-between items-center">
               <h3 className="font-bold flex items-center gap-2"><MessageSquare size={20} /> إرسال تبليغ</h3>
               <button onClick={() => setMessageModal({ ...messageModal, isOpen: false })} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
             </div>
             <div className="p-6">
               <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl mb-6 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
               <div className="flex gap-4">
                 <button onClick={() => sendMessage('WHATSAPP')} className="flex-1 bg-[#25D366] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"><MessageCircle size={20} /> واتساب</button>
                 <button onClick={() => sendMessage('SMS')} className="flex-1 bg-slate-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"><MessageSquare size={20} /> SMS</button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Batch Processing Overlay */}
      {isBatchActive && batchQueue.length > 0 && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/10">
                <div className="bg-slate-950 text-white p-5 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">جاري الإرسال الآلي</h3>
                        <p className="text-xs text-slate-400">({currentBatchIndex + 1} من {batchQueue.length})</p>
                    </div>
                    <button onClick={() => setIsBatchActive(false)} className="text-rose-400 hover:text-rose-300"><Ban size={24} /></button>
                </div>
                <div className="p-8">
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-8 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${((currentBatchIndex + 1) / batchQueue.length) * 100}%` }} />
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8 text-center relative">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                            <Send size={24} />
                        </div>
                        <span className="font-bold block text-lg mb-2 text-slate-800">{batchQueue[currentBatchIndex].student.name}</span>
                        <p className="text-sm text-slate-500 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">{batchQueue[currentBatchIndex].message}</p>
                    </div>
                    <div className="flex gap-4">
                         <button onClick={sendCurrentBatchMessage} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02]"><Send size={20} /> إرسال الآن</button>
                         <button onClick={() => processNextInBatch(true)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"><SkipForward size={24} /></button>
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>

    {/* PDF Generation View (Unchanged structural logic, just hidden) */}
    {isGeneratingPdf && (
         <div className="fixed inset-0 z-[9999] bg-gray-900 flex justify-center overflow-auto pt-10">
         <div data-html2canvas-ignore="true" className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg z-[10000] flex items-center gap-3">
             <Loader2 className="animate-spin text-primary" />
             <span className="font-bold text-sm">جاري إنشاء التقرير...</span>
         </div>

         <div id="report-content-body" className="bg-gray-900" dir="ltr" style={{ width: '210mm' }}>
             {reportPages.map((pageStudents, pageIndex) => (
                 <div key={pageIndex} className="bg-white text-black font-sans relative" style={{ width: '210mm', height: '295mm', padding: '10mm', boxSizing: 'border-box', pageBreakAfter: pageIndex < reportPages.length - 1 ? 'always' : 'auto', overflow: 'hidden' }}>
                     <div className="flex flex-col items-center mb-6 border-b-2 border-black pb-2">
                         <h1 className="text-2xl font-bold mb-2">كشف المتابعة اليومي</h1>
                         <div className="w-full flex flex-row-reverse justify-between text-sm font-bold px-2">
                            <span>التاريخ: {currentDate}</span>
                            <span>{grades.find(g => g.id === selectedGrade)?.name} - {classes.find(c => c.id === selectedClass)?.name}</span>
                         </div>
                     </div>
                     <table className="w-full border-collapse border border-black text-right text-xs" style={{ tableLayout: 'fixed' }}>
                         <thead>
                             <tr className="bg-gray-100 h-10">
                                 <th className="border border-black p-1 w-[20%] text-right">ملاحظات</th>
                                 <th className="border border-black p-1 w-[20%] text-center">التفاصيل</th>
                                 <th className="border border-black p-1 w-[15%] text-center">الحالة</th>
                                 <th className="border border-black p-1 w-[35%] text-right">اسم الطالب</th>
                                 <th className="border border-black p-1 w-[10%] text-center">#</th>
                             </tr>
                         </thead>
                         <tbody>
                             {pageStudents.map((student, idx) => {
                                 const status = localAttendance[student.id] || AttendanceStatus.PRESENT;
                                 const record = getAttendanceRecord(currentDate, student.id);
                                 const actualIndex = (pageIndex * STUDENTS_PER_PAGE) + idx + 1;
                                 return (
                                     <tr key={student.id} className="h-10">
                                         <td className="border border-black p-1"></td>
                                         <td className="border border-black p-1 text-center text-[10px]">{status === AttendanceStatus.TRUANT && record?.period ? `حصة ${record.period}` : '-'}</td>
                                         <td className="border border-black p-1 text-center font-medium">
                                             {status === AttendanceStatus.PRESENT && 'حاضر'}
                                             {status === AttendanceStatus.ABSENT && <span className="font-bold">غياب</span>}
                                             {status === AttendanceStatus.TRUANT && <span className="font-bold">تسرب</span>}
                                             {status === AttendanceStatus.ESCAPE && <span className="font-bold">التسرب من المدرسة</span>}
                                         </td>
                                         <td className="border border-black p-1 font-bold truncate text-right px-2">{student.name}</td>
                                         <td className="border border-black p-1 text-center">{actualIndex}</td>
                                     </tr>
                                 );
                             })}
                         </tbody>
                     </table>
                     {pageIndex === reportPages.length - 1 && (
                         <div className="absolute bottom-10 left-10 right-10">
                             <div className="flex flex-row-reverse justify-between text-sm font-bold pt-4 border-t border-black">
                                 <div className="text-center"><p className="mb-2">عدد الحضور</p><p className="text-xl">{filteredStudents.filter(s => (localAttendance[s.id] || AttendanceStatus.PRESENT) === AttendanceStatus.PRESENT).length}</p></div>
                                 <div className="text-center"><p className="mb-2">عدد الغياب</p><p className="text-xl">{filteredStudents.filter(s => localAttendance[s.id] === AttendanceStatus.ABSENT).length}</p></div>
                                 <div className="text-center"><p className="mb-8">الاعتماد</p><p className="w-32 border-b border-black"></p></div>
                             </div>
                         </div>
                     )}
                     <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-500">صفحة {pageIndex + 1} من {reportPages.length} | نظام مدرستي</div>
                 </div>
             ))}
         </div>
     </div>
    )}
    </>
  );
};

export default AttendanceSheet;