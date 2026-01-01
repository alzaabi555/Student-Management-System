import React, { useEffect, useState } from 'react';
import { UserX, UserMinus, Activity, DoorOpen, Calendar, ArrowUpRight } from 'lucide-react';
import { getDailyStats } from '../services/dataService';
import { DashboardStats } from '../types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  subtext?: string;
  textColor: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, subtext, textColor, delay = 0 }) => (
  <div 
    className="bg-white rounded-3xl p-5 md:p-6 shadow-soft hover:shadow-floating transition-all duration-500 transform hover:-translate-y-1 relative overflow-hidden group border border-gray-50"
    style={{ animation: `fadeInUp 0.6s ease-out ${delay}ms both` }}
  >
    {/* Background Blob */}
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700 ease-in-out ${gradient}`}></div>
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-3.5 rounded-2xl shadow-sm ${gradient} text-white transform group-hover:rotate-6 transition-transform duration-300`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
      </div>
      {subtext && (
        <span className="flex items-center gap-1 text-xs font-bold bg-green-50 text-green-600 px-2.5 py-1 rounded-full border border-green-100">
          {subtext} <ArrowUpRight size={12} />
        </span>
      )}
    </div>
    
    <div className="relative z-10">
      <h3 className="text-gray-400 text-sm font-bold mb-1">{title}</h3>
      <p className={`text-3xl md:text-4xl font-extrabold ${textColor} tracking-tight`}>{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const dateStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Simulate loading
    const data = getDailyStats(dateStr);
    setStats(data);
  }, [dateStr]);

  if (!stats) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-fadeIn">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2">لوحة المعلومات</h2>
          <p className="text-gray-500 font-medium flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            إحصائيات اليوم: <span className="text-slate-700 font-bold font-mono dir-ltr">{dateStr}</span>
          </p>
        </div>
      </header>

      {/* Grid Layout - 4 Columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <StatCard 
          title="حضور اليوم" 
          value={stats.presentCount} 
          icon={<Activity />} 
          gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
          subtext={`${stats.attendanceRate}%`}
          textColor="text-emerald-600"
          delay={100}
        />
        
        <StatCard 
          title="حالات الغياب" 
          value={stats.absentCount} 
          icon={<UserX />} 
          gradient="bg-gradient-to-br from-rose-400 to-rose-600"
          textColor="text-rose-600"
          delay={200}
        />
        
        <StatCard 
          title="تسرب حصص" 
          value={stats.truantCount} 
          icon={<UserMinus />} 
          gradient="bg-gradient-to-br from-amber-400 to-amber-600"
          textColor="text-amber-600"
          delay={300}
        />
        
         <StatCard 
          title="تسرب من المدرسة" 
          value={stats.escapeCount} 
          icon={<DoorOpen />} 
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          textColor="text-violet-600"
          delay={400}
        />
      </div>
    </div>
  );
};

export default Dashboard;