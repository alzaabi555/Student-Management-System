
import React, { useEffect, useState, useMemo } from 'react';
import { UserX, UserMinus, Activity, DoorOpen, Calendar, PlusCircle, FileText, Send, PieChart, BarChart3, X, TrendingUp } from 'lucide-react';
import { getDailyStats, students, grades, getAttendanceRecord } from '../services/dataService';
import { DashboardStats, AttendanceStatus } from '../types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string; // Used for text color
  bgClass: string;    // Used for icon background
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass, bgClass }) => {
  return (
    <div className="card p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
      <div>
        <p className="text-gray-500 text-xs font-bold mb-1">{title}</p>
        <p className="text-2xl font-extrabold text-gray-800">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
         {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
      </div>
    </div>
  );
};

const QuickAction: React.FC<{ label: string; icon: React.ReactNode; onClick?: () => void; color: string }> = ({ label, icon, onClick, color }) => (
    <button onClick={onClick} className="card p-4 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95 h-28 border border-gray-200 group">
        <div className={`${color} p-3 rounded-full bg-gray-50 group-hover:bg-white transition-colors`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
        </div>
        <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">{label}</span>
    </button>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const dateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isoDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const data = getDailyStats(isoDate);
    setStats(data);
  }, [isoDate, showAnalysis]); // Update when analysis opens to ensure fresh data

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

    // 2. Calculate Percentages for Pie Chart (CSS Conic Gradient)
    const total = stats ? stats.totalStudents : 0;
    const pPresent = stats ? (stats.presentCount / total) * 100 : 0;
    const pAbsent = stats ? (stats.absentCount / total) * 100 : 0;
    const pTruant = stats ? (stats.truantCount / total) * 100 : 0;
    const pEscape = stats ? (stats.escapeCount / total) * 100 : 0;

    // Build Gradient String
    // Green (Present) -> Red (Absent) -> Amber (Truant) -> Purple (Escape)
    const g1 = pPresent;
    const g2 = g1 + pAbsent;
    const g3 = g2 + pTruant;
    
    const gradient = `conic-gradient(
        #22c55e 0% ${g1}%, 
        #ef4444 ${g1}% ${g2}%, 
        #f59e0b ${g2}% ${g3}%, 
        #a855f7 ${g3}% 100%
    )`;

    return { sortedGrades, gradient, percentages: { pPresent, pAbsent, pTruant, pEscape } };
  }, [stats, isoDate]);


  if (!stats) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Header */}
      <div className="card p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-white to-blue-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">لوحة المعلومات</h2>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            <span className="font-medium">{dateStr}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-xl border border-blue-100 shadow-sm">
            <div className="text-left pl-2">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">نسبة الحضور اليوم</p>
                <div className="flex items-end gap-2">
                    <p className={`text-2xl font-black ${stats.attendanceRate >= 90 ? 'text-green-600' : 'text-blue-800'}`}>
                        {stats.attendanceRate}%
                    </p>
                    {stats.attendanceRate >= 95 && <TrendingUp size={20} className="text-green-500 mb-1" />}
                </div>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="حضور اليوم" 
          value={stats.presentCount} 
          icon={<Activity />} 
          colorClass="text-green-700"
          bgClass="bg-green-100"
        />
        <StatCard 
          title="غياب كامل" 
          value={stats.absentCount} 
          icon={<UserX />} 
          colorClass="text-red-700"
          bgClass="bg-red-100"
        />
        <StatCard 
          title="تسرب حصص" 
          value={stats.truantCount} 
          icon={<UserMinus />} 
          colorClass="text-amber-700"
          bgClass="bg-amber-100"
        />
         <StatCard 
          title="تسرب" 
          value={stats.escapeCount} 
          icon={<DoorOpen />} 
          colorClass="text-purple-700"
          bgClass="bg-purple-100"
        />
      </div>

      {/* Quick Actions */}
      <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            الوصول السريع
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <QuickAction 
                  label="تسجيل حضور" 
                  icon={<PlusCircle />} 
                  color="text-blue-600"
                  onClick={() => document.getElementById('btn-nav-attendance')?.click()}
               />
               <QuickAction 
                  label="إصدار استدعاء" 
                  icon={<Send />} 
                  color="text-red-600"
                  onClick={() => document.getElementById('btn-nav-summons')?.click()}
               />
               <QuickAction 
                  label="طباعة تقرير" 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <PieChart className="text-emerald-600" size={20} />
                            التحليل البياني اليومي
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">نظرة عامة على إحصائيات يوم {dateStr}</p>
                    </div>
                    <button onClick={() => setShowAnalysis(false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto bg-gray-50/50">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* CHART 1: PIE CHART (Overall Status) */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
                            <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                                <Activity size={16} className="text-blue-500" />
                                توزيع حالة الطلاب
                            </h4>
                            
                            {/* CSS Pie Chart */}
                            <div className="relative w-48 h-48 rounded-full shadow-inner mb-6" style={{ background: analysisData.gradient }}>
                                <div className="absolute inset-0 m-auto w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-3xl font-black text-gray-800">{stats.attendanceRate}%</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">نسبة الحضور</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full px-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    <span>حضور ({stats.presentCount})</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    <span>غياب ({stats.absentCount})</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    <span>تسرب حصص ({stats.truantCount})</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                    <span>تسرب ({stats.escapeCount})</span>
                                </div>
                            </div>
                        </div>

                        {/* CHART 2: BAR CHART (Absence by Grade) */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                                <BarChart3 size={16} className="text-red-500" />
                                أكثر الصفوف غياباً اليوم
                            </h4>
                            
                            {analysisData.sortedGrades.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-100 rounded-lg">
                                    سجل نظيف! لا يوجد غياب اليوم 🎉
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {analysisData.sortedGrades.map((g, idx) => {
                                        // Calculate relative width (max is usually the first one since it's sorted)
                                        const maxVal = analysisData.sortedGrades[0].count;
                                        const widthPct = (g.count / maxVal) * 100;
                                        
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-xs font-bold text-gray-600">
                                                    <span>{g.name}</span>
                                                    <span>{g.count} طالب</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-red-500 rounded-full transition-all duration-500" 
                                                        style={{ width: `${widthPct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="mt-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <p className="text-xs text-blue-800 leading-relaxed font-medium text-center">
                                    <span className="font-bold">نصيحة إدارية:</span> 
                                    {stats.attendanceRate < 90 
                                        ? " نسبة الغياب مرتفعة اليوم. يفضل متابعة الصفوف الأكثر غياباً وإرسال إشعارات لأولياء الأمور."
                                        : " نسبة الحضور ممتازة. شكرًا لجهودكم في متابعة انضباط الطلاب."
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
