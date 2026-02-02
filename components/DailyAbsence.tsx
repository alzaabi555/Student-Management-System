
import React, { useMemo, useState, useEffect } from 'react';
import { UserMinus, Send, CheckCircle2, Phone, Calendar, AlertTriangle, DoorOpen, Printer } from 'lucide-react';
import { students, grades, classes, getAttendanceRecord, getSchoolSettings } from '../services/dataService';
import { AttendanceStatus } from '../types';
import { TableVirtuoso } from 'react-virtuoso';
import { printDailyAbsenceReport } from '../services/printService';

const DailyAbsence: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];
    const displayDate = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const [schoolName, setSchoolName] = useState('مدرستي');
    const [sentList, setSentList] = useState<string[]>([]); // To track sent messages in current session

    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getSchoolSettings();
            if (settings?.name) setSchoolName(settings.name);
        };
        fetchSettings();
    }, []);

    // تجميع بيانات الغائبين فقط لهذا اليوم
    const absentStudents = useMemo(() => {
        const list: any[] = [];
        students.forEach(student => {
            const record = getAttendanceRecord(today, student.id);
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
    }, [today, students, grades, classes]);

    const handlePrint = () => {
        if (absentStudents.length === 0) {
            alert("لا يوجد غياب للطباعة");
            return;
        }
        printDailyAbsenceReport(schoolName, today, absentStudents);
    };

    const sendWhatsApp = async (student: any) => {
        if (!student.parentPhone) {
            alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
            return;
        }

        const statusText = student.status === AttendanceStatus.ABSENT ? 'الغياب' : 
                           student.status === AttendanceStatus.TRUANT ? 'التسرب من الحصة' : 'التسرب من المدرسة';

        const message = `عاجل: نفيدكم بـ ${statusText} للطالب/ة (${student.name}) المقيد بالصف (${student.gradeName} / ${student.className}) عن المدرسة اليوم ${today}. برجاء ارسال نسخة من الاجازة المرضية او موعد الطبي. إدارة ${schoolName}.`;

        const url = `whatsapp://send?phone=968${student.parentPhone}&text=${encodeURIComponent(message)}`;
        
        if (window.electron && window.electron.openExternal) {
            await window.electron.openExternal(url);
        } else {
            window.open(url, '_blank');
        }

        // إضافة الطالب لقائمة "تم الإرسال" محلياً
        if (!sentList.includes(student.id)) {
            setSentList(prev => [...prev, student.id]);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <UserMinus className="text-rose-600" size={28} />
                        سجل غياب اليوم
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                        <Calendar size={14} />
                        {displayDate}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handlePrint}
                        disabled={absentStudents.length === 0}
                        className="btn bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm"
                    >
                        <Printer size={18} />
                        <span className="hidden md:inline">طباعة / مشاركة PDF</span>
                    </button>
                    <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100 shadow-sm flex items-center">
                        عدد الغائبين: {absentStudents.length}
                    </div>
                </div>
            </div>

            <div className="card flex-1 overflow-hidden flex flex-col">
                {absentStudents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <CheckCircle2 size={48} className="text-emerald-500 mb-2 opacity-50" />
                        <p className="text-lg font-bold">رائع! لا يوجد غياب مسجل اليوم</p>
                        <p className="text-sm opacity-70">أو لم يتم رصد الغياب بعد</p>
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
            
            {absentStudents.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-sm text-yellow-800 flex items-start gap-3">
                    <InfoIcon />
                    <div>
                        <p className="font-bold">ملاحظة بخصوص الإرسال الجماعي:</p>
                        <p className="text-xs mt-1 opacity-90">
                            قم بالنقر على زر "إرسال واتساب" لكل طالب بالتتابع. سيتم فتح التطبيق مباشرة.
                            عند العودة، سيتحول الزر إلى "تم الإرسال" لمساعدتك في متابعة من تم تبليغهم.
                            <br/>
                            تم تحديث الرسالة لتشمل: اسم الطالب، الصف والشعبة، وطلب العذر الطبي.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);

export default DailyAbsence;
