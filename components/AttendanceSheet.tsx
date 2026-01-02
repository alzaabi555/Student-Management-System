
import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Save, Check, X, AlertTriangle, DoorOpen, Search, Share2, Clock, FileEdit } from 'lucide-react';
import { students, grades, classes, getAttendance, saveAttendance, getAttendanceRecord, getSchoolSettings } from '../services/dataService';
import { AttendanceStatus, Student } from '../types';
import { TableVirtuoso } from 'react-virtuoso';

interface AttendanceSheetProps {
  onNavigate: (page: string) => void;
}

interface AttendanceDetail {
    period?: number;
    note?: string;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ onNavigate }) => {
  const [selectedGrade, setSelectedGrade] = useState<string>(grades.length > 0 ? grades[0].id : '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // States to hold local changes before saving
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [localDetails, setLocalDetails] = useState<Record<string, AttendanceDetail>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [schoolName, setSchoolName] = useState('مدرستي');

  // Modal State for details (Period or Note)
  const [activeModal, setActiveModal] = useState<{
    studentId: string;
    studentName: string;
    type: 'TRUANT' | 'ESCAPE';
    currentValue?: string | number;
  } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
        const settings = await getSchoolSettings();
        if (settings && settings.name) {
            setSchoolName(settings.name);
        }
    };
    fetchSettings();
  }, []);

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

  useEffect(() => {
    if (selectedClass) {
        const classStudents = students.filter(s => s.classId === selectedClass);
        const newLocalAttendance: Record<string, AttendanceStatus> = {};
        const newLocalDetails: Record<string, AttendanceDetail> = {};
        
        classStudents.forEach(s => {
            const record = getAttendanceRecord(currentDate, s.id);
            if (record) {
                newLocalAttendance[s.id] = record.status;
                newLocalDetails[s.id] = { period: record.period, note: record.note };
            } else {
                newLocalAttendance[s.id] = AttendanceStatus.PRESENT;
            }
        });
        setLocalAttendance(newLocalAttendance);
        setLocalDetails(newLocalDetails);
    }
  }, [selectedClass, currentDate]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      (selectedClass ? s.classId === selectedClass : false) &&
      (s.name.includes(searchTerm) || s.parentPhone.includes(searchTerm))
    );
  }, [selectedClass, searchTerm, students]);

  const handleStatusChange = (student: Student, status: AttendanceStatus) => {
    // Immediate update for status
    setLocalAttendance(prev => ({
        ...prev,
        [student.id]: status
    }));

    // Logic for opening modals
    if (status === AttendanceStatus.TRUANT) {
        setActiveModal({
            studentId: student.id,
            studentName: student.name,
            type: 'TRUANT',
            currentValue: localDetails[student.id]?.period || 1
        });
    } else if (status === AttendanceStatus.ESCAPE) {
        setActiveModal({
            studentId: student.id,
            studentName: student.name,
            type: 'ESCAPE',
            currentValue: localDetails[student.id]?.note || ''
        });
    } else {
        // Clear details if status is changed to Present or Absent
        setLocalDetails(prev => {
            const copy = { ...prev };
            delete copy[student.id];
            return copy;
        });
    }
  };

  const saveModalDetails = (val: string | number) => {
    if (!activeModal) return;
    
    setLocalDetails(prev => ({
        ...prev,
        [activeModal.studentId]: {
            ...prev[activeModal.studentId],
            period: activeModal.type === 'TRUANT' ? Number(val) : undefined,
            note: activeModal.type === 'ESCAPE' ? String(val) : undefined
        }
    }));
    setActiveModal(null);
  };

  const saveAll = () => {
    setIsSaving(true);
    Object.entries(localAttendance).forEach(([studentId, status]) => {
        const details = localDetails[studentId];
        saveAttendance(
            currentDate, 
            studentId, 
            status as AttendanceStatus, 
            details?.period,
            details?.note
        );
    });
    
    setTimeout(() => {
        setIsSaving(false);
    }, 300);
  };

  const sendWhatsApp = async (student: Student) => {
    const status = localAttendance[student.id] || getAttendance(currentDate, student.id);
    const details = localDetails[student.id];
    
    if (status === AttendanceStatus.PRESENT) {
        alert('الطالب حاضر، لا داعي لإرسال رسالة.');
        return;
    }

    let message = '';
    const dateStr = new Date(currentDate).toLocaleDateString('ar-EG');
    
    switch (status) {
      case AttendanceStatus.ABSENT:
        message = `عاجل: نفيدكم بغياب الطالب/ة ${student.name} عن المدرسة اليوم ${dateStr}. يرجى التوضيح. إدارة ${schoolName}.`;
        break;
      case AttendanceStatus.TRUANT:
        const periodText = details?.period ? ` (الحصة ${details.period})` : '';
        message = `تنبيه: قام الطالب/ة ${student.name} بـ "تسرب من الحصة"${periodText} اليوم ${dateStr}. إدارة ${schoolName}.`;
        break;
      case AttendanceStatus.ESCAPE:
        message = `هام جداً: قام الطالب/ة ${student.name} بـ "تسرب من المدرسة" اليوم ${dateStr} دون إذن. إدارة ${schoolName}.`;
        break;
    }

    if (!student.parentPhone) {
        alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
        return;
    }

    const url = `whatsapp://send?phone=968${student.parentPhone}&text=${encodeURIComponent(message)}`;
    
    if (window.electron && window.electron.openExternal) {
       try {
         await window.electron.openExternal(url);
       } catch (err) {
         console.error('Failed to open external link:', err);
         alert('تعذر فتح واتساب. تأكد من تثبيت التطبيق.');
       }
    } else {
       window.open(url, '_blank');
    }
  };

  if (grades.length === 0) {
      return <div className="p-8 text-center text-gray-500">الرجاء إضافة صفوف وفصول أولاً من القائمة الجانبية.</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="flex flex-row justify-between items-center">
        <div>
           <h2 className="text-xl md:text-2xl font-bold text-slate-900">تسجيل الحضور اليومي</h2>
           <p className="text-sm text-gray-500">إدارة {schoolName}</p>
        </div>
        <div>
             <button 
               onClick={saveAll}
               disabled={isSaving}
               className="btn btn-primary"
             >
               <Save size={18} />
               {isSaving ? 'جاري الحفظ...' : 'حفظ السجل'}
             </button>
        </div>
      </div>

      <div className="card p-3 md:p-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-700 font-medium text-sm hidden md:flex">
            <Filter size={16} className="text-blue-600" />
            <span>خيارات العرض:</span>
        </div>
        
        <div className="flex gap-2 md:gap-4 flex-1 w-full md:w-auto">
            <input 
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="form-input w-auto text-sm"
            />
            <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="form-input w-auto text-sm"
            >
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={availableClasses.length === 0}
                className="form-input w-auto text-sm"
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
            className="form-input pl-8 text-sm"
          />
          <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
        </div>
      </div>

      <div className="card flex-1 overflow-hidden flex flex-col">
         {!selectedClass ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">الرجاء اختيار فصل</div>
         ) : filteredStudents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">لا يوجد طلاب</div>
         ) : (
            <TableVirtuoso
                style={{ height: '100%', direction: 'rtl' }}
                data={filteredStudents}
                fixedHeaderContent={() => (
                    <tr className="bg-gray-50 border-b border-gray-200">
                        {/* تم زيادة عرض عمود الطالب إلى 30% */}
                        <th className="p-3 text-right text-xs font-semibold text-gray-600 w-[30%]">الطالب</th>
                        {/* تم تقليل عرض عمود تحديد الحالة إلى 25% */}
                        <th className="p-3 text-center text-xs font-semibold text-gray-600 w-[25%]">تحديد الحالة</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-600 w-[30%]">وصف الحالة</th>
                        {/* تم تقليل عرض عمود الإجراءات إلى 15% */}
                        <th className="p-3 text-center text-xs font-semibold text-gray-600 w-[15%]">إجراءات</th>
                    </tr>
                )}
                itemContent={(index, student) => {
                    const status = localAttendance[student.id] || AttendanceStatus.PRESENT;
                    const details = localDetails[student.id];

                    // Determine content for the Description Column
                    let descriptionContent = <span className="text-gray-400 text-xs font-medium">-</span>;
                    if (status === AttendanceStatus.PRESENT) {
                        descriptionContent = <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">حاضر</span>;
                    } else if (status === AttendanceStatus.ABSENT) {
                        descriptionContent = <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">غائب</span>;
                    } else if (status === AttendanceStatus.TRUANT) {
                        descriptionContent = (
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-amber-700 font-bold text-xs">تسرب من حصة</span>
                                {details?.period && (
                                    <span className="text-[10px] bg-amber-50 px-2 py-0.5 rounded text-amber-800 border border-amber-100 font-bold flex items-center gap-1">
                                        <Clock size={10} />
                                        الحصة: {details.period}
                                    </span>
                                )}
                            </div>
                        );
                    } else if (status === AttendanceStatus.ESCAPE) {
                        descriptionContent = (
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-purple-700 font-bold text-xs">تسرب من المدرسة</span>
                                {details?.note && (
                                    <span className="text-[10px] bg-purple-50 px-2 py-0.5 rounded text-purple-800 border border-purple-100 max-w-[150px] truncate flex items-center gap-1" title={details.note}>
                                        <FileEdit size={10} />
                                        {details.note}
                                    </span>
                                )}
                            </div>
                        );
                    }

                    return (
                    <>
                        <td className="p-3 border-b border-gray-100">
                            {/* إضافة whitespace-nowrap لمنع انقسام الاسم */}
                            <div className="font-semibold text-slate-800 text-sm whitespace-nowrap truncate">{student.name}</div>
                            <div className="text-[10px] text-gray-400">{student.parentPhone}</div>
                        </td>
                        <td className="p-3 border-b border-gray-100 text-center">
                            <div className="flex justify-center gap-1 md:gap-2">
                                <button 
                                    onClick={() => handleStatusChange(student, AttendanceStatus.PRESENT)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.PRESENT ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="حاضر"
                                >
                                    <Check size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student, AttendanceStatus.ABSENT)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.ABSENT ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="غائب"
                                >
                                    <X size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student, AttendanceStatus.TRUANT)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.TRUANT ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="تسرب من حصة"
                                >
                                    <AlertTriangle size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student, AttendanceStatus.ESCAPE)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.ESCAPE ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="تسرب من المدرسة"
                                >
                                    <DoorOpen size={16} />
                                </button>
                            </div>
                        </td>
                        
                        {/* New Description Column */}
                        <td className="p-3 border-b border-gray-100 text-center bg-gray-50/30">
                            {descriptionContent}
                        </td>

                        <td className="p-3 border-b border-gray-100 text-center">
                             <button 
                                onClick={() => sendWhatsApp(student)}
                                disabled={status === AttendanceStatus.PRESENT}
                                className={`
                                    py-1.5 px-3 rounded-[4px] transition-all flex items-center justify-center gap-2 text-xs font-semibold w-full border
                                    ${status === AttendanceStatus.PRESENT 
                                        ? 'bg-gray-100 border-transparent text-gray-300 cursor-not-allowed' 
                                        : 'bg-white border-green-200 text-green-600 hover:bg-green-50'}
                                `}
                             >
                                <Share2 size={14} />
                                <span>واتساب</span>
                             </button>
                        </td>
                    </>
                )}}
            />
         )}
      </div>
      
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-around text-sm font-medium">
         <span className="text-gray-600">الطلاب: {filteredStudents.length}</span>
         <span className="text-green-600">حضور: {Object.values(localAttendance).filter(s => s === AttendanceStatus.PRESENT).length}</span>
         <span className="text-red-600">غياب: {Object.values(localAttendance).filter(s => s === AttendanceStatus.ABSENT).length}</span>
      </div>

      {/* --- DETAILS MODAL --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">
                        {activeModal.type === 'TRUANT' ? 'تحديد الحصة' : 'ملاحظات التسرب'}
                    </h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500 mb-4 font-bold">
                        الطالب: <span className="text-blue-600">{activeModal.studentName}</span>
                    </p>
                    
                    {activeModal.type === 'TRUANT' ? (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">اختر الحصة التي تسرب منها:</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => saveModalDetails(num)}
                                        className={`p-3 rounded-lg border font-bold ${Number(activeModal.currentValue) === num ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">وصف الحالة (اختياري):</label>
                            <textarea
                                autoFocus
                                className="form-input h-24 resize-none"
                                placeholder="اكتب وصفاً لحالة التسرب من المدرسة..."
                                defaultValue={activeModal.currentValue as string}
                                id="modal-note-input"
                            ></textarea>
                            <button 
                                onClick={() => {
                                    const val = (document.getElementById('modal-note-input') as HTMLTextAreaElement).value;
                                    saveModalDetails(val);
                                }}
                                className="btn btn-primary w-full mt-4"
                            >
                                حفظ الملاحظة
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AttendanceSheet;
