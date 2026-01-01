import { Student, Grade, SchoolClass, AttendanceStatus, AttendanceRecord } from '../types';

// --- Local Storage Keys ---
const KEYS = {
  GRADES: 'madrasati_grades',
  CLASSES: 'madrasati_classes',
  STUDENTS: 'madrasati_students',
  ATTENDANCE: 'madrasati_attendance',
  SETTINGS: 'school_settings'
};

// --- Helper to load data ---
const loadData = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return defaultValue;
  }
};

// --- Helper to save data ---
const saveData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} (Quota might be exceeded)`, e);
    alert('تنبيه: مساحة التخزين ممتلئة، قد لا يتم حفظ بعض البيانات.');
  }
};

// --- Initial Data Setup (Load from Storage) ---
export let grades: Grade[] = loadData(KEYS.GRADES, []);
export let classes: SchoolClass[] = loadData(KEYS.CLASSES, []);
export let students: Student[] = loadData(KEYS.STUDENTS, []);
// Attendance is stored as a map for O(1) access performance with large datasets
let attendanceStore: Record<string, AttendanceRecord> = loadData(KEYS.ATTENDANCE, {});

// --- School Settings Management ---
export const saveSchoolSettings = (name: string, district: string) => {
  const settings = { name, district, isSetup: true };
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  return settings;
};

export const getSchoolSettings = () => {
  const settingsStr = localStorage.getItem(KEYS.SETTINGS);
  if (settingsStr) {
    return JSON.parse(settingsStr);
  }
  return null;
};

// --- Grade Management ---
export const addGrade = (name: string) => {
  const newGrade: Grade = {
    id: `g-${Date.now()}`,
    name: name
  };
  grades.push(newGrade);
  saveData(KEYS.GRADES, grades);
  return newGrade;
};

export const deleteGrade = (id: string) => {
  const index = grades.findIndex(g => g.id === id);
  if (index > -1) {
    grades.splice(index, 1);
    saveData(KEYS.GRADES, grades);

    // Remove associated classes
    const classesToRemove = classes.filter(c => c.gradeId === id);
    classesToRemove.forEach(c => deleteClass(c.id));
    
    // Remove associated students
    const studentsToRemove = students.filter(s => s.gradeId === id);
    studentsToRemove.forEach(s => deleteStudent(s.id));
  }
};

// --- Class Management ---
export const addClass = (name: string, gradeId: string) => {
  const newClass: SchoolClass = {
    id: `c-${Date.now()}`,
    name: name,
    gradeId: gradeId
  };
  classes.push(newClass);
  saveData(KEYS.CLASSES, classes);
  return newClass;
};

export const deleteClass = (id: string) => {
  const index = classes.findIndex(c => c.id === id);
  if (index > -1) {
    classes.splice(index, 1);
    saveData(KEYS.CLASSES, classes);

    // Remove students in this class
    const studentsToRemove = students.filter(s => s.classId === id);
    studentsToRemove.forEach(s => deleteStudent(s.id));
  }
};


// Helper to add a student
export const addStudent = (student: Omit<Student, 'id'>) => {
  const newId = `new-${Date.now()}`;
  const newStudent = { ...student, id: newId };
  students.unshift(newStudent); // Add to the beginning
  saveData(KEYS.STUDENTS, students);
  return newStudent;
};

// Helper to add multiple students (Optimized for Bulk)
export const addStudentsBulk = (newStudentsData: Omit<Student, 'id'>[]) => {
  const timestamp = Date.now();
  const newStudents = newStudentsData.map((s, index) => ({
    ...s,
    id: `bulk-${timestamp}-${index}`
  }));
  students.unshift(...newStudents);
  saveData(KEYS.STUDENTS, students);
  return newStudents;
};

// Helper to delete a student
export const deleteStudent = (id: string) => {
  const index = students.findIndex(s => s.id === id);
  if (index > -1) {
    students.splice(index, 1);
    saveData(KEYS.STUDENTS, students);
  }
};

export const getAttendance = (date: string, studentId: string): AttendanceStatus => {
  const key = `${date}-${studentId}`;
  return attendanceStore[key]?.status || AttendanceStatus.PRESENT; // Default to present
};

export const getAttendanceRecord = (date: string, studentId: string): AttendanceRecord | undefined => {
  const key = `${date}-${studentId}`;
  return attendanceStore[key];
};

export const saveAttendance = (date: string, studentId: string, status: AttendanceStatus, period?: number) => {
  const key = `${date}-${studentId}`;
  attendanceStore[key] = {
    date,
    studentId,
    status,
    period,
    timestamp: Date.now()
  };
  saveData(KEYS.ATTENDANCE, attendanceStore);
};

export const getDailyStats = (date: string) => {
  let present = 0;
  let absent = 0;
  let truant = 0;
  let escape = 0;

  // Optimizing stat calculation: Only iterate active students
  students.forEach(s => {
    const status = getAttendance(date, s.id);
    if (status === AttendanceStatus.ABSENT) absent++;
    else if (status === AttendanceStatus.TRUANT) truant++;
    else if (status === AttendanceStatus.ESCAPE) escape++;
    else present++;
  });

  return {
    totalStudents: students.length,
    presentCount: present,
    absentCount: absent,
    truantCount: truant,
    escapeCount: escape,
    attendanceRate: students.length > 0 ? Math.round((present / students.length) * 100) : 0
  };
};

export const getAbsentStudentsForDate = (date: string): Student[] => {
    return students.filter(s => getAttendance(date, s.id) === AttendanceStatus.ABSENT);
};

export const getTruantStudentsForDate = (date: string): Student[] => {
    return students.filter(s => getAttendance(date, s.id) === AttendanceStatus.TRUANT);
};