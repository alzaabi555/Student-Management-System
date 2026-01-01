
export enum AttendanceStatus {
  PRESENT = 'hader',
  ABSENT = 'ghaeb',
  TRUANT = 'motasareb', // Skipping class (تسرب من حصة)
  ESCAPE = 'horob'      // Escaping school (هروب من المدرسة)
}

export interface Student {
  id: string;
  name: string;
  gradeId: string;
  classId: string;
  parentPhone: string;
}

export interface Grade {
  id: string;
  name: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeId: string;
}

export interface AttendanceRecord {
  date: string; // ISO Date string YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
  period?: number; // رقم الحصة في حال التسرب
  timestamp: number;
}

export interface DashboardStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  truantCount: number;
  escapeCount: number;
  attendanceRate: number;
}

declare global {
  interface Window {
    electron?: {
      openExternal: (url: string) => Promise<void>;
    };
  }
}
