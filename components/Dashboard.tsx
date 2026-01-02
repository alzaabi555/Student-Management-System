import React, { useEffect, useState } from 'react';
import { UserX, UserMinus, Activity, DoorOpen, Calendar, ArrowUpRight } from 'lucide-react';
import { getDailyStats } from '../services/dataService';
import { DashboardStats } from '../types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconColorClass: string;
  subtext?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconColorClass, subtext, delay = 0 }) => (
  <div 
    className="bg-white rounded-lg p-5 border border-gray-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group"
    style={{ animation: `fadeInUp 0.6s ease-out ${delay}ms both` }}
  >
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2.5 rounded-md ${iconColorClass} bg-opacity-10`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20, className: iconColorClass.replace('bg-', 'text-') })}
      </div>
      {subtext && (
        <span className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100/50">
          {subtext} <ArrowUpRight size={10} />
        </span>
      )}
    </div>
    
    <div>
      <h3 className="text-gray-500 text-xs font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
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
      <div className="flex gap-2 items-center">
         <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
         <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
         <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  );

  return (
    <div className="p-2 md:p-6 space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">لوحة المعلومات</h2>
          <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            إحصائيات اليوم: <span className="text-slate-700 font-semibold dir-ltr">{dateStr}</span>
          </p>
        </div>
      </header>

      {/* Grid Layout - 4 Columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        <StatCard 
          title="حضور اليوم" 
          value={stats.presentCount} 
          icon={<Activity />} 
          iconColorClass="bg-emerald-500"
          subtext={`${stats.attendanceRate}%`}
          delay={100}
        />
        
        <StatCard 
          title="حالات الغياب" 
          value={stats.absentCount} 
          icon={<UserX />} 
          iconColorClass="bg-rose-500"
          delay={200}
        />
        
        <StatCard 
          title="تسرب حصص" 
          value={stats.truantCount} 
          icon={<UserMinus />} 
          iconColorClass="bg-amber-500"
          delay={300}
        />
        
         <StatCard 
          title="تسرب من المدرسة" 
          value={stats.escapeCount} 
          icon={<DoorOpen />} 
          iconColorClass="bg-violet-500"
          delay={400}
        />
      </div>
    </div>
  );
};

export default Dashboard;