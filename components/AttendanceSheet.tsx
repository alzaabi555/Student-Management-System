import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Save, Check, X, AlertTriangle, DoorOpen, Search, Printer, Share2 } from 'lucide-react';
import { students, grades, classes, getAttendance, saveAttendance, getAttendanceRecord, getSchoolSettings } from '../services/dataService';
import { AttendanceStatus, Student } from '../types';
import { TableVirtuoso } from 'react-virtuoso';
import { printAttendanceSheet } from '../services/printService';

interface AttendanceSheetProps {
  onNavigate: (page: string) => void;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ onNavigate }) => {
  const [selectedGrade, setSelectedGrade] = useState<string>(grades.length > 0 ? grades[0].id : '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [schoolName, setSchoolName] = useState('مدرستي');

  useEffect(() => {
    const settings = getSchoolSettings();
    if (settings && settings.name) {
      setSchoolName(settings.name);
    }
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
        
        classStudents.forEach(s => {
            const record = getAttendanceRecord(currentDate, s.id);
            if (record) {
                newLocalAttendance[s.id] = record.status;
            } else {
                newLocalAttendance[s.id] = AttendanceStatus.PRESENT;
            }
        });
        setLocalAttendance(newLocalAttendance);
    }
  }, [selectedClass, currentDate]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      (selectedClass ? s.classId === selectedClass : false) &&
      (s.name.includes(searchTerm) || s.parentPhone.includes(searchTerm))
    );
  }, [selectedClass, searchTerm, students]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalAttendance(prev => ({
        ...prev,
        [studentId]: status
    }));
  };

  const saveAll = () => {
    setIsSaving(true);
    Object.entries(localAttendance).forEach(([studentId, status]) => {
        saveAttendance(currentDate, studentId, status as AttendanceStatus);
    });
    
    setTimeout(() => {
        setIsSaving(false);
    }, 300);
  };

  const sendWhatsApp = async (student: Student) => {
    const status = localAttendance[student.id] || getAttendance(currentDate, student.id);
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
        message = `تنبيه: تغيب الطالب/ة ${student.name} عن بعض الحصص الدراسية اليوم ${dateStr}. إدارة ${schoolName}.`;
        break;
      case AttendanceStatus.ESCAPE:
        message = `هام جداً: خروج الطالب/ة ${student.name} من المدرسة اليوم ${dateStr} دون إذن. إدارة ${schoolName}.`;
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

  const handlePrint = () => {
    if (filteredStudents.length === 0) {
        alert("لا يوجد بيانات للطباعة");
        return;
    }

    const gradeName = grades.find(g => g.id === selectedGrade)?.name || '';
    const className = classes.find(c => c.id === selectedClass)?.name || '';

    printAttendanceSheet(
      schoolName,
      gradeName,
      className,
      currentDate,
      filteredStudents,
      localAttendance
    );
  };

  if (grades.length === 0) {
      return <div className="p-8 text-center">الرجاء إضافة صفوف وفصول أولاً من القائمة الجانبية.</div>;
  }

  return (
    <div className="p-6 h-[calc(100vh-80px)] flex flex-col relative">
      <div className="flex flex-row justify-between items-center gap-4 mb-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">تسجيل الحضور اليومي</h2>
           <p className="text-sm text-gray-500">إدارة {schoolName}</p>
        </div>
        <div className="flex gap-2 w-auto">
             <button 
               onClick={saveAll}
               disabled={isSaving}
               className="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
             >
               <Save size={18} />
               {isSaving ? 'جاري الحفظ...' : 'حفظ السجل'}
             </button>
             <button 
               onClick={handlePrint}
               className="bg-gray-800 hover:bg-black text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
               title="طباعة الكشف أو حفظه كملف PDF"
             >
               <Printer size={18} />
               <span>طباعة / حفظ PDF</span>
             </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-row gap-3">
        <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
            <Filter size={16} className="text-primary" />
            <span>خيارات العرض:</span>
        </div>
        
        <div className="flex gap-4 flex-1">
            <input 
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="w-auto p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            >
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={availableClasses.length === 0}
                className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100"
            >
                {availableClasses.length === 0 && <option value="">لا توجد فصول</option>}
                {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>

        <div className="relative w-64">
          <input
            type="text"
            placeholder="بحث عن طالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
          <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
         {!selectedClass ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">الرجاء اختيار فصل</div>
         ) : filteredStudents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">لا يوجد طلاب</div>
         ) : (
            <TableVirtuoso
                style={{ height: '100%', direction: 'rtl' }}
                data={filteredStudents}
                fixedHeaderContent={() => (
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-3 text-right text-xs font-bold text-gray-500 w-1/4">الطالب</th>
                        <th className="p-3 text-center text-xs font-bold text-gray-500 w-1/2">حالة الحضور</th>
                        <th className="p-3 text-center text-xs font-bold text-gray-500 w-1/4">إجراءات</th>
                    </tr>
                )}
                itemContent={(index, student) => {
                    const status = localAttendance[student.id] || AttendanceStatus.PRESENT;
                    return (
                    <>
                        <td className="p-3 border-b border-gray-50">
                            <div className="font-bold text-gray-800 text-sm">{student.name}</div>
                            <div className="text-[10px] text-gray-400">{student.parentPhone}</div>
                        </td>
                        <td className="p-3 border-b border-gray-50 text-center">
                            <div className="flex justify-center gap-2">
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)}
                                    className={`p-2 rounded-lg transition-all ${status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    title="حاضر"
                                >
                                    <Check size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)}
                                    className={`p-2 rounded-lg transition-all ${status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    title="غائب"
                                >
                                    <X size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.TRUANT)}
                                    className={`p-2 rounded-lg transition-all ${status === AttendanceStatus.TRUANT ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    title="تسرب حصة"
                                >
                                    <AlertTriangle size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.ESCAPE)}
                                    className={`p-2 rounded-lg transition-all ${status === AttendanceStatus.ESCAPE ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    title="هروب"
                                >
                                    <DoorOpen size={16} />
                                </button>
                            </div>
                        </td>
                        <td className="p-3 border-b border-gray-50 text-center">
                             <button 
                                onClick={() => sendWhatsApp(student)}
                                disabled={status === AttendanceStatus.PRESENT}
                                className={`
                                    p-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold w-full
                                    ${status === AttendanceStatus.PRESENT 
                                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                                        : 'bg-green-50 text-green-600 hover:bg-green-100 hover:shadow-sm'}
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
      
      <div className="mt-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-around text-sm font-bold">
         <span className="text-gray-500">الطلاب: {filteredStudents.length}</span>
         <span className="text-green-600">حضور: {Object.values(localAttendance).filter(s => s === AttendanceStatus.PRESENT).length}</span>
         <span className="text-red-600">غياب: {Object.values(localAttendance).filter(s => s === AttendanceStatus.ABSENT).length}</span>
      </div>
    </div>
  );
};

export default AttendanceSheet;