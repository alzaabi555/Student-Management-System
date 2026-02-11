
import React, { useMemo, useState, useEffect } from 'react';
import { UserMinus, Send, CheckCircle2, Phone, Calendar, AlertTriangle, DoorOpen, Printer, ChevronRight, ChevronLeft, History, Filter } from 'lucide-react';
import { students, grades, classes, getAttendanceRecord, getSchoolSettings } from '../services/dataService';
import { AttendanceStatus } from '../types';
import { TableVirtuoso } from 'react-virtuoso';
import { printDailyAbsenceReport } from '../services/printService';

const DailyAbsence: React.FC = () => {
    // الحالة الافتراضية هي تاريخ اليوم
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    const [schoolName, setSchoolName] = useState('مدرستي');
    const [sentList, setSentList] = useState<string[]>([]); // تتبع الرسائل المرسلة في الجلسة الحالية

    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getSchoolSettings();
            if (settings?.name) setSchoolName(settings.name);
        };
        fetchSettings();
    }, []);

    // تغيير التاريخ لليوم السابق/التالي
    const changeDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
        setSentList([]); // تصفية قائمة الإرسال عند تغيير اليوم
    };

    const displayDate = new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // التحقق مما إذا كان التاريخ المختار هو اليوم
    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // تجميع بيانات الغائبين للتاريخ المختار
    const absentStudents = useMemo(() => {
        const list: any[] = [];
        students.forEach(student => {
            const record = getAttendanceRecord(selectedDate, student.id);
            // جلب أي طالب حالته ليست "حاضر" (غائب، تسرب، هروب)
            if (record && record.status !== AttendanceStatus.PRESENT) {
                const grade = grades.find(g => g.id === student.gradeId);
                const cls = classes.find(c => c.id === student.classId);
                list.push({
                    ...student,
                    status: record.status,
                    gradeName: grade?.name || '?',
                    className: cls?.name || '?',
                    recordDetails: record
                });
            }
        });
        return list;
    }, [selectedDate, students, grades, classes]);

    const handlePrint = () => {
        if (absentStudents.length === 0) {
            alert("لا يوجد غياب للطباعة في هذا التاريخ");
            return;
        }
        printDailyAbsenceReport(schoolName, selectedDate, absentStudents);
    };

    const sendWhatsApp = async (student: any) => {
        if (!student.parentPhone) {
            alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
            return;
        }

        const statusText = student.status === AttendanceStatus.ABSENT ? 'الغياب' : 
                           student.status === AttendanceStatus.TRUANT ? 'التسرب من الحصة' : 'التسرب من المدرسة';

        const message = `عاجل: نفيدكم بـ ${statusText} للطالب/ة (${student.name}) المقيد بالصف (${student.gradeName} / ${student.className}) عن المدرسة بتاريخ ${selectedDate}. برجاء ارسال نسخة من الاجازة المرضية او موعد الطبي. إدارة ${schoolName}.`;

        const url = `whatsapp://send?phone=968${student.parentPhone}&text=${encodeURIComponent(message)}`;
        
        if (window.electron && window.electron.openExternal) {
            await window.electron.openExternal(url);
        } else {
            window.open(url, '_blank');
        }

        // إضافة الطالب لقائمة "تم الإرسال" محلياً لتغيير لون الزر
        if (!sentList.includes(student.id)) {
            setSentList(prev => [...prev, student.id]);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* الشريط العلوي للتحكم */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {isToday ? <UserMinus className="text-rose-600" size={28} /> : <History className="text-slate-500" size={28} />}
                        {isToday ? 'سجل غياب اليوم' : 'أرشيف السجلات اليومية'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {isToday ? 'متابعة الحالات المسجلة لهذا اليوم' : 'مراجعة وطباعة سجلات الأيام السابقة'}
                    </p>
                </div>

                {/* Date Controls - أدوات التحكم بالتاريخ */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                        <button 
                            onClick={() => changeDate(-1)} 
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 active:scale-95" 
                            title="اليوم السابق"
                        >
                            <ChevronRight size={20} />
                        </button>
                        
                        <div className="relative group">
                            <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                                <Calendar size={16} />
                            </div>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="form-input py-1.5 pr-9 pl-3 text-sm w-40 text-center font-bold border-slate-200 shadow-none focus:ring-0 cursor-pointer"
                            />
                        </div>

                        <button 
                            onClick={() => changeDate(1)} 
                            disabled={isToday} 
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none active:scale-95" 
                            title="اليوم التالي"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>
                    
                    <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1"></div>

                    <div className="text-sm font-bold text-slate-700 w-full sm:w-auto text-center min-w-[180px]">
                        {displayDate}
                    </div>
                </div>

                {/* Print Button */}
                <div className="flex gap-3 w-full xl:w-auto">
                    <button 
                        onClick={handlePrint}
                        disabled={absentStudents.length === 0}
                        className="btn bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm flex-1 xl:flex-none justify-center"
                    >
                        <Printer size={18} />
                        <span className="hidden sm:inline">طباعة التقرير</span>
                        <span className="sm:hidden">طباعة</span>
                    </button>
                    <div className={`px-4 py-2 rounded-lg text-sm font-bold border shadow-sm flex items-center justify-center min-w-[120px] ${absentStudents.length > 0 ? 'bg-rose-50 text-rose-800 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                        {absentStudents.length > 0 ? `${absentStudents.length} حالة` : 'لا يوجد'}
                    </div>
                </div>
            </div>

            {/* الجدول */}
            <div className="card flex-1 overflow-hidden flex flex-col relative">
                {!isToday && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400 z-10 opacity-50"></div>
                )}
                
                {absentStudents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <CheckCircle2 size={48} className="text-emerald-500 mb-2 opacity-50" />
                        <p className="text-lg font-bold">سجل نظيف لهذا التاريخ</p>
                        <p className="text-sm opacity-70">لا توجد حالات غياب أو تسرب مسجلة في {selectedDate}</p>
                    </div>
                ) : (
                    <TableVirtuoso
                        style={{ height: '100%', direction: 'rtl' }}
                        data={absentStudents}
                        fixedHeaderContent={() => (
                            <tr className="bg-slate-100 border-b border-gray-200">
                                <th className="p-4 text-right text-xs font-bold text-gray-600">الطالب</th>
                                <th className="p-4 text-center text-xs font-bold text-gray-600">الصف / الشعبة</th>
                                <th className="p-4 text-center text-xs font-bold text-gray-600">الحالة</th>
                                <th className="p-4 text-center text-xs font-bold text-gray-600">إرسال تبليغ</th>
                            </tr>
                        )}
                        itemContent={(index, student) => {
                            const isSent = sentList.includes(student.id);
                            return (
                                <>
                                    <td className="p-4 border-b border-gray-100">
                                        <div className="font-bold text-slate-800 text-sm">{student.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Phone size={10} /> {student.parentPhone}
                                        </div>
                                    </td>
                                    <td className="p-4 border-b border-gray-100 text-center text-sm font-medium">
                                        <span className="bg-gray-50 px-2 py-1 rounded border">{student.gradeName} / {student.className}</span>
                                    </td>
                                    <td className="p-4 border-b border-gray-100 text-center">
                                        {student.status === AttendanceStatus.ABSENT && <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-bold">غائب</span>}
                                        {student.status === AttendanceStatus.TRUANT && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1"><AlertTriangle size={12}/> تسرب حصة</span>}
                                        {student.status === AttendanceStatus.ESCAPE && <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1"><DoorOpen size={12}/> تسرب مدرسة</span>}
                                    </td>
                                    <td className="p-4 border-b border-gray-100 text-center">
                                        <button 
                                            onClick={() => sendWhatsApp(student)}
                                            className={`
                                                flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all w-full md:w-auto mx-auto
                                                ${isSent 
                                                    ? 'bg-gray-100 text-gray-400 cursor-default border border-transparent' 
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg active:scale-95'
                                                }
                                            `}
                                        >
                                            {isSent ? (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    تم الإرسال
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={16} />
                                                    إرسال واتساب
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </>
                            );
                        }}
                    />
                )}
            </div>
            
            {/* رسالة تنبيه عند استعراض الأرشيف */}
            {!isToday && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm text-amber-800 flex items-center gap-3 animate-fadeIn">
                    <Filter className="text-amber-600" size={20} />
                    <div>
                        <span className="font-bold">وضع الأرشيف:</span> أنت تشاهد بيانات يوم سابق ({selectedDate}). البيانات المعروضة للقراءة والطباعة فقط.
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyAbsence;
