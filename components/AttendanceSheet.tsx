
import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Save, Check, X, AlertTriangle, DoorOpen, Search, Share2 } from 'lucide-react';
import { students, grades, classes, getAttendance, saveAttendance, getAttendanceRecord, getSchoolSettings } from '../services/dataService';
import { AttendanceStatus, Student } from '../types';
import { TableVirtuoso } from 'react-virtuoso';

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

  if (grades.length === 0) {
      return <div className="p-8 text-center text-gray-500">الرجاء إضافة صفوف وفصول أولاً من القائمة الجانبية.</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-4">
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
                        <th className="p-3 text-right text-xs font-semibold text-gray-600 w-1/4">الطالب</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-600 w-1/2">حالة الحضور</th>
                        <th className="p-3 text-center text-xs font-semibold text-gray-600 w-1/4">إجراءات</th>
                    </tr>
                )}
                itemContent={(index, student) => {
                    const status = localAttendance[student.id] || AttendanceStatus.PRESENT;
                    return (
                    <>
                        <td className="p-3 border-b border-gray-100">
                            <div className="font-semibold text-slate-800 text-sm">{student.name}</div>
                            <div className="text-[10px] text-gray-400">{student.parentPhone}</div>
                        </td>
                        <td className="p-3 border-b border-gray-100 text-center">
                            <div className="flex justify-center gap-1 md:gap-2">
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.PRESENT ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="حاضر"
                                >
                                    <Check size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.ABSENT ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="غائب"
                                >
                                    <X size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.TRUANT)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.TRUANT ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="تسرب حصة"
                                >
                                    <AlertTriangle size={16} />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange(student.id, AttendanceStatus.ESCAPE)}
                                    className={`p-2 rounded-[4px] transition-all border ${status === AttendanceStatus.ESCAPE ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                    title="تسرب"
                                >
                                    <DoorOpen size={16} />
                                </button>
                            </div>
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
    </div>
  );
};

export default AttendanceSheet;
