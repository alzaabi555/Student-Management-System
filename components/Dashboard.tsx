
import React, { useEffect, useState, useMemo } from 'react';
import { UserX, UserMinus, Activity, DoorOpen, Calendar, PlusCircle, FileText, Send, PieChart, BarChart3, X, TrendingUp, TrendingDown } from 'lucide-react';
import { getDailyStats, students, grades, getAttendanceRecord, getSchoolAssets } from '../services/dataService';
import { DashboardStats, AttendanceStatus } from '../types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  theme: 'green' | 'red' | 'amber' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, theme }) => {
  const themes = {
      green: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
      red: { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100', iconBg: 'bg-rose-100' },
      amber: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-100' },
      purple: { text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', iconBg: 'bg-violet-100' },
  };
  
  const t = themes[theme];

  return (
    <div className={`card p-5 flex items-center justify-between border-t-4 ${t.bg} border-t-${theme === 'green' ? 'emerald' : theme === 'red' ? 'rose' : theme === 'amber' ? 'amber' : 'violet'}-500 transition-transform hover:-translate-y-1`}>
      <div>
        <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wide">{title}</p>
        <p className={`text-3xl font-extrabold ${t.text}`}>{value}</p>
      </div>
      <div className={`p-4 rounded-2xl ${t.iconBg} ${t.text} shadow-sm`}>
         {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
      </div>
    </div>
  );
};

const QuickAction: React.FC<{ label: string; icon: React.ReactNode; onClick?: () => void; color: string }> = ({ label, icon, onClick, color }) => (
    <button onClick={onClick} className="card p-4 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 h-32 group border border-slate-200">
        <div className={`p-4 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-md transition-all ${color}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 26 })}
        </div>
        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">{label}</span>
    </button>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  
  const dateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isoDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const data = getDailyStats(isoDate);
    setStats(data);
    
    // Load school logo
    const loadLogo = async () => {
        const assets = await getSchoolAssets();
        if (assets && assets.headerLogo) {
            setSchoolLogo(assets.headerLogo);
        }
    };
    loadLogo();
  }, [isoDate, showAnalysis]); 

  // --- Analysis Logic ---
  const analysisData = useMemo(() => {
    if (!students.length) return null;

    // 1. Calculate Grade Absence
    const gradeAbsence: Record<string, number> = {};
    grades.forEach(g => gradeAbsence[g.id] = 0);

    students.forEach(s => {
        const record = getAttendanceRecord(isoDate, s.id);
        if (record && (record.status === AttendanceStatus.ABSENT || record.status === AttendanceStatus.ESCAPE)) {
            if (gradeAbsence[s.gradeId] !== undefined) {
                gradeAbsence[s.gradeId]++;
            }
        }
    });

    const sortedGrades = Object.entries(gradeAbsence)
        .map(([gradeId, count]) => ({
            name: grades.find(g => g.id === gradeId)?.name || 'غير معروف',
            count
        }))
        .sort((a, b) => b.count - a.count)
        .filter(g => g.count > 0)
        .slice(0, 5); // Top 5

    // 2. Calculate Percentages for Pie Chart
    const total = stats ? stats.totalStudents : 0;
    const pPresent = stats ? (stats.presentCount / total) * 100 : 0;
    const pAbsent = stats ? (stats.absentCount / total) * 100 : 0;
    const pTruant = stats ? (stats.truantCount / total) * 100 : 0;
    const pEscape = stats ? (stats.escapeCount / total) * 100 : 0;

    const g1 = pPresent;
    const g2 = g1 + pAbsent;
    const g3 = g2 + pTruant;
    
    // Modern colors matches the cards
    const gradient = `conic-gradient(
        #10b981 0% ${g1}%, 
        #f43f5e ${g1}% ${g2}%, 
        #f59e0b ${g2}% ${g3}%, 
        #8b5cf6 ${g3}% 100%
    )`;

    return { sortedGrades, gradient, percentages: { pPresent, pAbsent, pTruant, pEscape } };
  }, [stats, isoDate]);


  if (!stats) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 to-brand-700 shadow-xl shadow-brand-900/20 text-white p-8">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                {schoolLogo ? (
                    <img src={schoolLogo} alt="شعار المدرسة" className="h-20 w-auto mb-4 object-contain brightness-0 invert opacity-90" />
                ) : (
                    <h1 className="text-3xl font-bold mb-2">لوحة المعلومات اليومية</h1>
                )}
                <p className="text-brand-100 flex items-center gap-2 text-lg">
                    <Calendar size={20} />
                    <span>{dateStr}</span>
                </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 text-center min-w-[180px]">
                <p className="text-xs text-brand-200 font-bold uppercase tracking-wider mb-1">معدل الحضور</p>
                <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-black tracking-tight">{stats.attendanceRate}%</span>
                    {stats.attendanceRate >= 95 
                        ? <TrendingUp size={24} className="text-emerald-400" />
                        : <TrendingDown size={24} className="text-rose-400" />
                    }
                </div>
            </div>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="حضور اليوم" 
          value={stats.presentCount} 
          icon={<Activity />} 
          theme="green"
        />
        <StatCard 
          title="غياب كامل" 
          value={stats.absentCount} 
          icon={<UserX />} 
          theme="red"
        />
        <StatCard 
          title="تسرب حصص" 
          value={stats.truantCount} 
          icon={<UserMinus />} 
          theme="amber"
        />
         <StatCard 
          title="تسرب مدرسة" 
          value={stats.escapeCount} 
          icon={<DoorOpen />} 
          theme="purple"
        />
      </div>

      {/* Quick Actions */}
      <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-brand-600" />
            الإجراءات السريعة
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <QuickAction 
                  label="تسجيل حضور" 
                  icon={<PlusCircle />} 
                  color="text-brand-600"
                  onClick={() => document.getElementById('btn-nav-attendance')?.click()}
               />
               <QuickAction 
                  label="إصدار استدعاء" 
                  icon={<Send />} 
                  color="text-rose-600"
                  onClick={() => document.getElementById('btn-nav-summons')?.click()}
               />
               <QuickAction 
                  label="التقارير" 
                  icon={<FileText />} 
                  color="text-slate-600"
                  onClick={() => document.getElementById('btn-nav-reports')?.click()}
               />
               <QuickAction 
                  label="تحليل بياني" 
                  icon={<PieChart />} 
                  color="text-emerald-600"
                  onClick={() => setShowAnalysis(true)}
               />
          </div>
      </div>

      {/* --- ANALYSIS MODAL --- */}
      {showAnalysis && analysisData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                            <PieChart className="text-emerald-600" size={24} />
                            التحليل البياني
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">نظرة معمقة على إحصائيات يوم {dateStr}</p>
                    </div>
                    <button onClick={() => setShowAnalysis(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-colors">
                        <X size={28} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 overflow-y-auto bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* CHART 1: PIE CHART */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                            <h4 className="font-bold text-slate-700 mb-8 flex items-center gap-2 self-start w-full border-b pb-2">
                                <Activity size={18} className="text-brand-500" />
                                توزيع الحالات
                            </h4>
                            
                            <div className="relative w-56 h-56 rounded-full shadow-inner mb-8" style={{ background: analysisData.gradient }}>
                                <div className="absolute inset-0 m-auto w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-lg shadow-slate-200">
                                    <span className="text-4xl font-black text-slate-800 tracking-tight">{stats.attendanceRate}%</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">نسبة الحضور</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full px-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
                                    <span>حضور ({stats.presentCount})</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></span>
                                    <span>غياب ({stats.absentCount})</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></span>
                                    <span>تسرب حصص ({stats.truantCount})</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <span className="w-3 h-3 rounded-full bg-violet-500 shadow-sm"></span>
                                    <span>تسرب ({stats.escapeCount})</span>
                                </div>
                            </div>
                        </div>

                        {/* CHART 2: BAR CHART */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                            <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2 border-b pb-2">
                                <BarChart3 size={18} className="text-rose-500" />
                                أعلى معدلات الغياب (حسب الصف)
                            </h4>
                            
                            <div className="flex-1">
                                {analysisData.sortedGrades.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 p-8">
                                        <TrendingUp size={32} className="mb-2 text-emerald-400" />
                                        سجل نظيف! لا يوجد غياب اليوم 🎉
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {analysisData.sortedGrades.map((g, idx) => {
                                            const maxVal = analysisData.sortedGrades[0].count;
                                            const widthPct = (g.count / maxVal) * 100;
                                            return (
                                                <div key={idx} className="space-y-1.5">
                                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                                        <span>{g.name}</span>
                                                        <span className="text-rose-600">{g.count} طالب</span>
                                                    </div>
                                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-700 ease-out" 
                                                            style={{ width: `${widthPct}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 bg-brand-50 p-4 rounded-xl border border-brand-100">
                                <p className="text-xs text-brand-800 leading-relaxed font-medium text-center">
                                    <span className="font-bold block mb-1">💡 توصية النظام:</span> 
                                    {stats.attendanceRate < 90 
                                        ? "يرجى مراجعة الصفوف ذات الغياب المرتفع وإرسال إشعارات جماعية لأولياء الأمور عبر واتساب."
                                        : "نسبة الحضور ممتازة. استمر في تعزيز الانضباط المدرسي."
                                    }
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
