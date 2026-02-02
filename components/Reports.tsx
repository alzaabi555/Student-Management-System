
import React, { useState, useEffect, useMemo } from 'react';
import { Printer, FileSpreadsheet, User, Users, CalendarRange, Calendar, ChevronDown, Filter, FileText, Share2, Bluetooth } from 'lucide-react';
import { getSchoolSettings, grades, classes, students, getAttendanceRecord, getStudentHistory, getClassPeriodStats } from '../services/dataService';
import { 
    printAttendanceSheet, 
    printStudentReport, 
    printClassPeriodReport, 
    shareHTMLAsPDF, 
    generateAttendanceSheetHTML, 
    generateClassPeriodReportHTML, 
    generateStudentReportHTML,
    generateGradeDailyReportHTML
} from '../services/printService';
import { AttendanceStatus, Student } from '../types';

interface ReportsProps {
    initialStudentId?: string | null;
    onClearInitial?: () => void;
}

const Reports: React.FC<ReportsProps> = ({ initialStudentId, onClearInitial }) => {
  const [activeTab, setActiveTab] = useState<'class' | 'student'>('class');
  const [schoolName, setSchoolName] = useState('مدرستي');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Class Report State ---
  const [reportType, setReportType] = useState<'daily' | 'period'>('daily');
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [classStartDate, setClassStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [classEndDate, setClassEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedGrade, setSelectedGrade] = useState<string>(grades.length > 0 ? grades[0].id : '');
  const [selectedClass, setSelectedClass] = useState<string>('');

  // --- Student Report State ---
  const [stGrade, setStGrade] = useState<string>(grades.length > 0 ? grades[0].id : '');
  const [stClass, setStClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  const [stStartDate, setStStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [stEndDate, setStEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Common Effects ---
  useEffect(() => {
    const fetchSettings = async () => {
        const settings = await getSchoolSettings();
        if (settings?.name) {
            setSchoolName(settings.name);
        }
    };
    fetchSettings();
  }, []);

  // --- Deep Link Effect ---
  useEffect(() => {
    if (initialStudentId) {
        const student = students.find(s => s.id === initialStudentId);
        if (student) {
            setActiveTab('student');
            setStGrade(student.gradeId);
            setStClass(student.classId);
            setTimeout(() => {
                setSelectedStudentId(student.id);
            }, 0);
        }
        if (onClearInitial) onClearInitial();
    }
  }, [initialStudentId]);

  // --- Dropdowns Sync ---
  const availableClasses = useMemo(() => 
    classes.filter(c => c.gradeId === selectedGrade), 
  [selectedGrade]);

  useEffect(() => {
    if (availableClasses.length > 0) {
        if (!selectedClass || (selectedClass !== 'ALL' && !availableClasses.find(c => c.id === selectedClass))) {
            setSelectedClass(availableClasses[0].id);
        }
    } else {
        setSelectedClass('');
    }
  }, [selectedGrade, availableClasses]);

  const stAvailableClasses = useMemo(() => 
    classes.filter(c => c.gradeId === stGrade), 
  [stGrade]);

  useEffect(() => {
    if (stAvailableClasses.length > 0) {
        if (!stAvailableClasses.find(c => c.id === stClass)) {
            setStClass(stAvailableClasses[0].id);
        }
    } else {
        setStClass('');
    }
  }, [stGrade, stAvailableClasses, stClass]);

  const availableStudents = useMemo(() => 
    students.filter(s => s.classId === stClass), 
  [stClass, students]);

  useEffect(() => {
    if (availableStudents.length > 0) {
        const isCurrentValid = availableStudents.find(s => s.id === selectedStudentId);
        if (!isCurrentValid && !initialStudentId) {
            setSelectedStudentId(availableStudents[0].id);
        }
    } else {
        setSelectedStudentId('');
    }
  }, [availableStudents, selectedStudentId, initialStudentId]);


  // --- Logic Helpers ---
  const getClassReportData = () => {
    if (!selectedClass) return null;
    const gradeName = grades.find(g => g.id === selectedGrade)?.name || '';
    
    if (selectedClass === 'ALL' && reportType === 'daily') {
         const gradeClasses = classes.filter(c => c.gradeId === selectedGrade);
         if (gradeClasses.length === 0) return null;

         const classesData: { className: string, students: Student[] }[] = [];
         const attendanceMap: Record<string, AttendanceStatus> = {};

         gradeClasses.forEach(c => {
             const cStudents = students.filter(s => s.classId === c.id);
             if (cStudents.length > 0) {
                 classesData.push({ className: c.name, students: cStudents });
                 cStudents.forEach(s => {
                     const record = getAttendanceRecord(classDate, s.id);
                     attendanceMap[s.id] = record ? record.status : AttendanceStatus.PRESENT;
                 });
             }
         });
         
         if (classesData.length === 0) return null;

         return { 
             type: 'daily', 
             isFullGrade: true,
             schoolName, 
             gradeName, 
             className: 'جميع الفصول', 
             classDate, 
             classesData, 
             attendanceMap 
         };
    }

    const className = classes.find(c => c.id === selectedClass)?.name || '';
    
    if (reportType === 'daily') {
        const classStudents = students.filter(s => s.classId === selectedClass);
        if (classStudents.length === 0) return null;
        const attendanceMap: Record<string, AttendanceStatus> = {};
        classStudents.forEach(s => {
            const record = getAttendanceRecord(classDate, s.id);
            attendanceMap[s.id] = record ? record.status : AttendanceStatus.PRESENT;
        });
        return { type: 'daily', isFullGrade: false, schoolName, gradeName, className, classDate, classStudents, attendanceMap };
    } else {
        if (!classStartDate || !classEndDate) return null;
        const stats = getClassPeriodStats(selectedClass, classStartDate, classEndDate);
        return { type: 'period', isFullGrade: false, schoolName, gradeName, className, classStartDate, classEndDate, stats };
    }
  };

  const getStudentReportData = () => {
      if (!selectedStudentId) return null;
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return null;
      const history = getStudentHistory(selectedStudentId, stStartDate, stEndDate);
      const gradeName = grades.find(g => g.id === stGrade)?.name || '';
      const className = classes.find(c => c.id === stClass)?.name || '';
      let periodText = 'سجل كامل';
      if (stStartDate && stEndDate) periodText = `الفترة من ${stStartDate} إلى ${stEndDate}`;
      else if (stStartDate) periodText = `من تاريخ ${stStartDate}`;
      
      return { schoolName, studentName: student.name, gradeName, className, history, periodText };
  };

  // --- Handlers ---
  const handlePrintClassReport = async () => {
    setIsProcessing(true);
    const data = getClassReportData();
    if (!data) { alert("البيانات غير مكتملة"); setIsProcessing(false); return; }
    
    try {
        if (data.type === 'daily') {
            await printAttendanceSheet(
                data.schoolName, 
                data.gradeName, 
                data.className, 
                data.classDate, 
                data.classStudents || [], 
                data.attendanceMap,
                data.isFullGrade,
                data.classesData
            );
        } else {
            await printClassPeriodReport(data.schoolName, data.gradeName, data.className, data.classStartDate, data.classEndDate, data.stats);
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePrintStudentReport = async () => {
    setIsProcessing(true);
    const data = getStudentReportData();
    if (!data) { alert("الرجاء اختيار طالب"); setIsProcessing(false); return; }
    try {
        await printStudentReport(data.schoolName, data.studentName, data.gradeName, data.className, data.history, data.periodText);
    } finally {
        setIsProcessing(false);
    }
  };

  const selectedStudentName = students.find(s => s.id === selectedStudentId)?.name;

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-4 pt-4 px-2">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
            <FileSpreadsheet size={28} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-slate-800">مركز التقارير</h2>
            <p className="text-gray-500 text-sm mt-1">طباعة الكشوفات ومشاركتها (بلوتوث / واتساب)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4">
        <button 
            onClick={() => setActiveTab('class')}
            className={`btn flex-1 md:flex-none ${activeTab === 'class' ? 'btn-primary' : 'btn-secondary'}`}
        >
            <Users size={18} />
            تقارير الفصل
        </button>
        <button 
            onClick={() => setActiveTab('student')}
            className={`btn flex-1 md:flex-none ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
        >
            <User size={18} />
            تقرير طالب
        </button>
      </div>

      <div className="card p-6 md:p-8 animate-fadeIn">
        
        {/* TAB 1: CLASS REPORT */}
        {activeTab === 'class' && (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">تقرير الفصل الدراسي</h3>
                        <p className="text-gray-500 text-sm">اختر نوع التقرير والفترة الزمنية</p>
                    </div>

                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200 self-start md:self-auto">
                        <button 
                            onClick={() => { setReportType('daily'); setSelectedClass(''); }}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'daily' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Calendar size={14} />
                            غياب يومي
                        </button>
                        <button 
                            onClick={() => { setReportType('period'); setSelectedClass(availableClasses[0]?.id || ''); }}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'period' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <CalendarRange size={14} />
                            إحصاء فترة
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                     {reportType === 'daily' ? (
                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-600">تاريخ الكشف</label>
                            <input 
                                type="date" 
                                value={classDate}
                                onChange={(e) => setClassDate(e.target.value)}
                                className="form-input text-center text-sm"
                            />
                        </div>
                     ) : (
                         <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600">من تاريخ</label>
                                <input 
                                    type="date" 
                                    value={classStartDate}
                                    onChange={(e) => setClassStartDate(e.target.value)}
                                    className="form-input text-center text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600">إلى تاريخ</label>
                                <input 
                                    type="date" 
                                    value={classEndDate}
                                    onChange={(e) => setClassEndDate(e.target.value)}
                                    className="form-input text-center text-sm"
                                />
                            </div>
                         </>
                     )}

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
                            className={`form-input text-sm ${selectedClass === 'ALL' ? 'font-bold text-blue-600' : ''}`}
                        >
                            {availableClasses.length === 0 && <option value="">لا توجد فصول</option>}
                            {reportType === 'daily' && availableClasses.length > 0 && (
                                <option value="ALL" className="font-bold">-- جميع الفصول --</option>
                            )}
                            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100 mt-4 gap-3">
                    <button 
                        onClick={handlePrintClassReport}
                        disabled={!selectedClass || isProcessing}
                        className="btn bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border-transparent w-full md:w-auto"
                    >
                         {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer size={18} />}
                         <span className="mr-2">طباعة / مشاركة PDF</span>
                    </button>
                </div>
            </div>
        )}

        {/* TAB 2: STUDENT REPORT */}
        {activeTab === 'student' && (
            <div className="space-y-6">
                 <div className="pb-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-slate-800">بيانات التقرير</h3>
                    <p className="text-gray-500 text-sm">يمكنك تغيير الطالب أو الفترة الزمنية من هنا</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">الصف الدراسي</label>
                        <select 
                            value={stGrade}
                            onChange={(e) => setStGrade(e.target.value)}
                            className="form-input text-sm"
                        >
                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">الفصل</label>
                        <select 
                            value={stClass}
                            onChange={(e) => setStClass(e.target.value)}
                            disabled={stAvailableClasses.length === 0}
                            className="form-input text-sm"
                        >
                            {stAvailableClasses.length === 0 && <option value="">لا توجد فصول</option>}
                            {stAvailableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">اختر الطالب</label>
                         <select 
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            disabled={availableStudents.length === 0}
                            className="form-input text-sm font-bold bg-yellow-50 border-yellow-200"
                        >
                            {availableStudents.length === 0 && <option value="">لا يوجد طلاب</option>}
                            {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
                    <h4 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                        <Filter size={14} />
                        تصفية الفترة الزمنية (اختياري)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">من تاريخ</label>
                            <input 
                                type="date" 
                                value={stStartDate}
                                onChange={(e) => setStStartDate(e.target.value)}
                                className="form-input text-center text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">إلى تاريخ</label>
                            <input 
                                type="date" 
                                value={stEndDate}
                                onChange={(e) => setStEndDate(e.target.value)}
                                className="form-input text-center text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100 mt-4 gap-3">
                    <button 
                        onClick={handlePrintStudentReport}
                        disabled={!selectedStudentId || isProcessing}
                        className="btn bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border-transparent w-full md:w-auto"
                    >
                         {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer size={18} />}
                         <span className="mr-2">طباعة / مشاركة PDF</span>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
