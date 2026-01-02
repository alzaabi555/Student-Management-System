import React, { useState, useEffect, useMemo } from 'react';
import { Printer, FileSpreadsheet, User, Users, CalendarRange, Calendar, ChevronDown, Filter } from 'lucide-react';
import { getSchoolSettings, grades, classes, students, getAttendanceRecord, getStudentHistory, getClassPeriodStats } from '../services/dataService';
import { printAttendanceSheet, printStudentReport, printClassPeriodReport } from '../services/printService';
import { AttendanceStatus } from '../types';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'class' | 'student'>('class');
  const [schoolName, setSchoolName] = useState('مدرستي');

  // --- Class Report State ---
  const [reportType, setReportType] = useState<'daily' | 'period'>('daily');
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [classStartDate, setClassStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
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
    const settings = getSchoolSettings();
    if (settings?.name) {
        setSchoolName(settings.name);
    }
  }, []);

  // --- Sync Classes Dropdown for Class Report ---
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

  // --- Sync Classes & Students Dropdown for Student Report ---
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
        setSelectedStudentId(availableStudents[0].id);
    } else {
        setSelectedStudentId('');
    }
  }, [availableStudents]);


  // --- Handlers (Logic Preserved 100%) ---

  // 1. Class Report Handler
  const handlePrintClassReport = () => {
    if (!selectedClass) {
        alert("الرجاء اختيار فصل");
        return;
    }
    
    const gradeName = grades.find(g => g.id === selectedGrade)?.name || '';
    const className = classes.find(c => c.id === selectedClass)?.name || '';

    if (reportType === 'daily') {
        const classStudents = students.filter(s => s.classId === selectedClass);
        if (classStudents.length === 0) {
            alert("لا يوجد طلاب في هذا الفصل");
            return;
        }

        const attendanceMap: Record<string, AttendanceStatus> = {};
        classStudents.forEach(s => {
            const record = getAttendanceRecord(classDate, s.id);
            attendanceMap[s.id] = record ? record.status : AttendanceStatus.PRESENT;
        });

        printAttendanceSheet(
            schoolName,
            gradeName,
            className,
            classDate,
            classStudents,
            attendanceMap
        );
    } else {
        if (!classStartDate || !classEndDate) {
            alert("الرجاء تحديد تاريخ البداية والنهاية");
            return;
        }
        
        const stats = getClassPeriodStats(selectedClass, classStartDate, classEndDate);
        
        printClassPeriodReport(
            schoolName,
            gradeName,
            className,
            classStartDate,
            classEndDate,
            stats
        );
    }
  };

  // 2. Student Report Handler
  const handlePrintStudentReport = () => {
    if (!selectedStudentId) {
        alert("الرجاء اختيار طالب");
        return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const history = getStudentHistory(selectedStudentId, stStartDate, stEndDate);
    
    const gradeName = grades.find(g => g.id === stGrade)?.name || '';
    const className = classes.find(c => c.id === stClass)?.name || '';

    let periodText = 'سجل كامل';
    if (stStartDate && stEndDate) {
        periodText = `الفترة من ${stStartDate} إلى ${stEndDate}`;
    } else if (stStartDate) {
        periodText = `من تاريخ ${stStartDate}`;
    }

    printStudentReport(
        schoolName,
        student.name,
        gradeName,
        className,
        history,
        periodText
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">مركز التقارير</h2>
        <p className="text-gray-500 text-sm">طباعة الكشوفات الرسمية وتقارير المتابعة الفردية</p>
      </header>

      {/* Windows 11 Segmented Control (Tabs) */}
      <div className="bg-gray-100/80 p-1.5 rounded-lg inline-flex mb-6 border border-gray-200 w-full md:w-auto">
        <button 
            onClick={() => setActiveTab('class')}
            className={`
                px-6 py-2 rounded-[6px] text-sm font-semibold transition-all flex items-center justify-center gap-2 flex-1 md:flex-none
                ${activeTab === 'class' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500 hover:bg-gray-200/50 hover:text-slate-700'}
            `}
        >
            <Users size={16} />
            تقارير الفصل
        </button>
        <button 
            onClick={() => setActiveTab('student')}
            className={`
                px-6 py-2 rounded-[6px] text-sm font-semibold transition-all flex items-center justify-center gap-2 flex-1 md:flex-none
                ${activeTab === 'student' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500 hover:bg-gray-200/50 hover:text-slate-700'}
            `}
        >
            <User size={16} />
            تقرير طالب
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 md:p-8 animate-fadeIn min-h-[400px]">
        
        {/* TAB 1: CLASS REPORT */}
        {activeTab === 'class' && (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center shadow-sm">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">تقرير الفصل الدراسي</h3>
                            <p className="text-gray-500 text-sm">اختر نوع التقرير والفترة الزمنية</p>
                        </div>
                    </div>

                    {/* Report Type Toggle */}
                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <button 
                            onClick={() => setReportType('daily')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'daily' ? 'bg-white shadow-sm text-primary ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Calendar size={14} />
                            غياب يومي
                        </button>
                        <button 
                            onClick={() => setReportType('period')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'period' ? 'bg-white shadow-sm text-primary ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <CalendarRange size={14} />
                            إحصاء فترة
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                     {/* Dynamic Date Inputs */}
                     {reportType === 'daily' ? (
                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-600">تاريخ الكشف</label>
                            <input 
                                type="date" 
                                value={classDate}
                                onChange={(e) => setClassDate(e.target.value)}
                                className="win-input w-full p-2.5 outline-none text-right text-sm"
                                style={{ direction: 'ltr' }}
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
                                    className="win-input w-full p-2.5 outline-none text-right text-sm"
                                    style={{ direction: 'ltr' }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600">إلى تاريخ</label>
                                <input 
                                    type="date" 
                                    value={classEndDate}
                                    onChange={(e) => setClassEndDate(e.target.value)}
                                    className="win-input w-full p-2.5 outline-none text-right text-sm"
                                    style={{ direction: 'ltr' }}
                                />
                            </div>
                         </>
                     )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">الصف الدراسي</label>
                        <div className="relative">
                            <select 
                                value={selectedGrade}
                                onChange={(e) => setSelectedGrade(e.target.value)}
                                className="win-input w-full p-2.5 appearance-none outline-none text-sm"
                            >
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">الفصل</label>
                        <div className="relative">
                            <select 
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                disabled={availableClasses.length === 0}
                                className="win-input w-full p-2.5 appearance-none outline-none disabled:bg-gray-50 text-sm"
                            >
                                {availableClasses.length === 0 && <option value="">لا توجد فصول</option>}
                                {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100 mt-4">
                    <button 
                        onClick={handlePrintClassReport}
                        disabled={!selectedClass}
                        className="win-btn-primary flex items-center gap-2 px-8 py-2.5 shadow-md disabled:opacity-50 disabled:shadow-none"
                    >
                        <Printer size={18} />
                        {reportType === 'daily' ? 'طباعة كشف الغياب' : 'طباعة التقرير الإحصائي'}
                    </button>
                </div>
            </div>
        )}

        {/* TAB 2: STUDENT REPORT */}
        {activeTab === 'student' && (
            <div className="space-y-6">
                 <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                        <User size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">تقرير متابعة طالب</h3>
                        <p className="text-gray-500 text-sm">سجل الغياب والتسرب والمخالفات لطالب محدد</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">الصف الدراسي</label>
                        <div className="relative">
                            <select 
                                value={stGrade}
                                onChange={(e) => setStGrade(e.target.value)}
                                className="win-input w-full p-2.5 appearance-none outline-none text-sm"
                            >
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">الفصل</label>
                        <div className="relative">
                            <select 
                                value={stClass}
                                onChange={(e) => setStClass(e.target.value)}
                                disabled={stAvailableClasses.length === 0}
                                className="win-input w-full p-2.5 appearance-none outline-none disabled:bg-gray-50 text-sm"
                            >
                                {stAvailableClasses.length === 0 && <option value="">لا توجد فصول</option>}
                                {stAvailableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">اختر الطالب</label>
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
                             <ChevronDown className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                {/* Date Filter for Student */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50 mt-2">
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
                                className="win-input w-full p-2 outline-none text-right text-sm"
                                style={{ direction: 'ltr' }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">إلى تاريخ</label>
                            <input 
                                type="date" 
                                value={stEndDate}
                                onChange={(e) => setStEndDate(e.target.value)}
                                className="win-input w-full p-2 outline-none text-right text-sm"
                                style={{ direction: 'ltr' }}
                            />
                        </div>
                    </div>
                </div>

                 <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button 
                        onClick={handlePrintStudentReport}
                        disabled={!selectedStudentId}
                        className="bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2 px-8 py-2.5 rounded-[4px] shadow-md transition-all disabled:opacity-50 disabled:shadow-none font-medium"
                    >
                        <Printer size={18} />
                        طباعة تقرير الطالب
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Reports;