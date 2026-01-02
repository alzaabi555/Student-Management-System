
import { Student, Grade, SchoolClass, AttendanceStatus, AttendanceRecord } from '../types';
import { dbService, STORES } from './db';

// --- In-Memory Cache ---
// We keep data in memory for instant React updates, while syncing to DB asynchronously.
export let grades: Grade[] = [];
export let classes: SchoolClass[] = [];
export let students: Student[] = [];
// Map for O(1) attendance lookups: key = "YYYY-MM-DD-studentId"
let attendanceStore: Record<string, AttendanceRecord> = {};

// --- Initialization & Migration Logic ---

const migrateFromLocalStorage = async () => {
    const LS_KEYS = {
        GRADES: 'madrasati_grades',
        CLASSES: 'madrasati_classes',
        STUDENTS: 'madrasati_students',
        ATTENDANCE: 'madrasati_attendance',
        SETTINGS: 'school_settings',
        ASSETS: 'school_assets'
    };

    const hasLegacyData = localStorage.getItem(LS_KEYS.STUDENTS);
    
    if (hasLegacyData) {
        console.log("Migrating data from LocalStorage to IndexedDB...");
        try {
            // 1. Grades
            const lsGrades = JSON.parse(localStorage.getItem(LS_KEYS.GRADES) || '[]');
            if (lsGrades.length) await dbService.putBulk(STORES.GRADES, lsGrades);

            // 2. Classes
            const lsClasses = JSON.parse(localStorage.getItem(LS_KEYS.CLASSES) || '[]');
            if (lsClasses.length) await dbService.putBulk(STORES.CLASSES, lsClasses);

            // 3. Students
            const lsStudents = JSON.parse(localStorage.getItem(LS_KEYS.STUDENTS) || '[]');
            if (lsStudents.length) await dbService.putBulk(STORES.STUDENTS, lsStudents);

            // 4. Attendance
            const lsAttendance = JSON.parse(localStorage.getItem(LS_KEYS.ATTENDANCE) || '{}');
            const attendanceKeys = Object.keys(lsAttendance);
            if (attendanceKeys.length > 0) {
                 for (const key of attendanceKeys) {
                     await dbService.put(STORES.ATTENDANCE, lsAttendance[key], key);
                 }
            }

            // 5. Settings
            const lsSettings = JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS) || 'null');
            if (lsSettings) {
                await dbService.put(STORES.SETTINGS, { ...lsSettings, id: 'main' });
            }

            // 6. Assets
            const lsAssets = JSON.parse(localStorage.getItem(LS_KEYS.ASSETS) || 'null');
            if (lsAssets) {
                await dbService.put(STORES.ASSETS, { ...lsAssets, id: 'main' });
            }

            // Clear LocalStorage after successful migration
            localStorage.clear();
            console.log("Migration complete. LocalStorage cleared.");

        } catch (error) {
            console.error("Migration failed:", error);
            alert("حدث خطأ أثناء تحديث قاعدة البيانات. قد تبقى بعض البيانات في النسخة القديمة.");
        }
    }
};

export const initializeData = async () => {
    try {
        await migrateFromLocalStorage();

        // Load data from DB to Memory
        grades = await dbService.getAll<Grade>(STORES.GRADES);
        classes = await dbService.getAll<SchoolClass>(STORES.CLASSES);
        students = await dbService.getAll<Student>(STORES.STUDENTS);
        
        // For attendance, we fetch all values and reconstruct the map
        const attRecords = await dbService.getAll<AttendanceRecord>(STORES.ATTENDANCE);
        attendanceStore = {};
        attRecords.forEach(r => {
            const key = `${r.date}-${r.studentId}`;
            attendanceStore[key] = r;
        });

    } catch (e) {
        console.error("Failed to initialize data service:", e);
    }
};

// --- Backup & Restore Logic ---

export const exportDatabase = async (): Promise<string> => {
    const backupData = {
        grades: await dbService.getAll(STORES.GRADES),
        classes: await dbService.getAll(STORES.CLASSES),
        students: await dbService.getAll(STORES.STUDENTS),
        attendance: await dbService.getAll(STORES.ATTENDANCE),
        settings: await dbService.getAll(STORES.SETTINGS),
        assets: await dbService.getAll(STORES.ASSETS),
        metadata: {
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            appName: 'Madrasati'
        }
    };
    return JSON.stringify(backupData, null, 2);
};

export const importDatabase = async (jsonString: string): Promise<boolean> => {
    try {
        const data = JSON.parse(jsonString);
        
        // Basic validation
        if (!data.grades || !data.classes || !data.students || !data.metadata) {
            throw new Error("ملف النسخة الاحتياطية غير صالح أو تالف");
        }

        // Clear existing data to prevent conflicts
        await dbService.clear(STORES.GRADES);
        await dbService.clear(STORES.CLASSES);
        await dbService.clear(STORES.STUDENTS);
        await dbService.clear(STORES.ATTENDANCE);
        await dbService.clear(STORES.SETTINGS);
        await dbService.clear(STORES.ASSETS);

        // Import new data
        if (data.grades.length) await dbService.putBulk(STORES.GRADES, data.grades);
        if (data.classes.length) await dbService.putBulk(STORES.CLASSES, data.classes);
        if (data.students.length) await dbService.putBulk(STORES.STUDENTS, data.students);
        
        // Attendance needs manual key reconstruction because IndexedDB putBulk in our util 
        // assumes in-line keys or simple put. Attendance store has no keyPath.
        if (data.attendance && data.attendance.length) {
            for(const record of data.attendance) {
                const key = `${record.date}-${record.studentId}`;
                await dbService.put(STORES.ATTENDANCE, record, key);
            }
        }

        if (data.settings && data.settings.length) await dbService.putBulk(STORES.SETTINGS, data.settings);
        if (data.assets && data.assets.length) await dbService.putBulk(STORES.ASSETS, data.assets);

        // Re-initialize memory
        await initializeData();
        return true;
    } catch (e) {
        console.error("Import failed:", e);
        return false;
    }
};

export const resetDatabase = async () => {
    await dbService.clear(STORES.GRADES);
    await dbService.clear(STORES.CLASSES);
    await dbService.clear(STORES.STUDENTS);
    await dbService.clear(STORES.ATTENDANCE);
    await dbService.clear(STORES.SETTINGS);
    await dbService.clear(STORES.ASSETS);
    
    // Clear memory
    grades = [];
    classes = [];
    students = [];
    attendanceStore = {};
};


// --- CRUD Operations ---

export const getSchoolSettings = async () => {
    const settings = await dbService.get<{name: string, district: string, id: string}>(STORES.SETTINGS, 'main');
    return settings ? { ...settings, isSetup: true } : { name: '', district: '', isSetup: false };
};

export const saveSchoolSettings = async (name: string, district: string) => {
    await dbService.put(STORES.SETTINGS, { id: 'main', name, district });
};

export const getSchoolAssets = async (): Promise<SchoolAssets> => {
    const assets = await dbService.get<SchoolAssets & {id: string}>(STORES.ASSETS, 'main');
    return assets || {};
};

export const saveSchoolAssets = async (assets: SchoolAssets) => {
    await dbService.put(STORES.ASSETS, { ...assets, id: 'main' });
};

export interface SchoolAssets {
    headerLogo?: string;
    committeeSig?: string;
    schoolStamp?: string;
    principalSig?: string;
}

// Grades & Classes
export const addGrade = (name: string) => {
    const newGrade = { id: Date.now().toString(), name };
    grades.push(newGrade);
    dbService.put(STORES.GRADES, newGrade);
    return newGrade;
};

export const deleteGrade = (id: string) => {
    grades = grades.filter(g => g.id !== id);
    // Cascade delete classes
    const classesToDelete = classes.filter(c => c.gradeId === id);
    classesToDelete.forEach(c => deleteClass(c.id));
    classes = classes.filter(c => c.gradeId !== id);
    
    dbService.delete(STORES.GRADES, id);
    classesToDelete.forEach(c => dbService.delete(STORES.CLASSES, c.id));
};

export const addClass = (name: string, gradeId: string) => {
    const newClass = { id: Date.now().toString(), name, gradeId };
    classes.push(newClass);
    dbService.put(STORES.CLASSES, newClass);
    return newClass;
};

export const deleteClass = (id: string) => {
    classes = classes.filter(c => c.id !== id);
    // Cascade delete students
    const studentsToDelete = students.filter(s => s.classId === id);
    studentsToDelete.forEach(s => deleteStudent(s.id));
    
    dbService.delete(STORES.CLASSES, id);
};

// Students
export const addStudent = (student: Omit<Student, 'id'>) => {
    const newStudent = { ...student, id: Date.now().toString() };
    students.push(newStudent);
    dbService.put(STORES.STUDENTS, newStudent);
    return newStudent;
};

export const addStudentsBulk = (studentsData: Omit<Student, 'id'>[]) => {
    const newStudents = studentsData.map((s, idx) => ({
        ...s,
        id: (Date.now() + idx).toString()
    }));
    students.push(...newStudents);
    dbService.putBulk(STORES.STUDENTS, newStudents);
};

export const updateStudent = (id: string, data: Partial<Omit<Student, 'id'>>) => {
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
        students[index] = { ...students[index], ...data };
        dbService.put(STORES.STUDENTS, students[index]);
    }
};

export const deleteStudent = (id: string) => {
    students = students.filter(s => s.id !== id);
    dbService.delete(STORES.STUDENTS, id);
    // Also delete attendance? Typically yes, but we might keep it for historical stats.
    // For simplicity, we leave orphan attendance records or we could clean them up.
};

// Attendance
export const saveAttendance = (date: string, studentId: string, status: AttendanceStatus, period?: number, note?: string) => {
    const key = `${date}-${studentId}`;
    const record: AttendanceRecord = {
        date,
        studentId,
        status,
        period,
        note,
        timestamp: Date.now()
    };
    
    attendanceStore[key] = record;
    dbService.put(STORES.ATTENDANCE, record, key);
};

export const getAttendance = (date: string, studentId: string): AttendanceStatus => {
    const key = `${date}-${studentId}`;
    return attendanceStore[key]?.status || AttendanceStatus.PRESENT;
};

export const getAttendanceRecord = (date: string, studentId: string): AttendanceRecord | undefined => {
    const key = `${date}-${studentId}`;
    return attendanceStore[key];
};

export interface StudentPeriodStats {
    student: Student;
    absentCount: number;
    truantCount: number;
    escapeCount: number;
}

export const getDailyStats = (date: string) => {
    let presentCount = 0;
    let absentCount = 0;
    let truantCount = 0;
    let escapeCount = 0;

    // Iterate over all students to check their status for this date
    students.forEach(student => {
        const status = getAttendance(date, student.id);
        if (status === AttendanceStatus.PRESENT) presentCount++;
        else if (status === AttendanceStatus.ABSENT) absentCount++;
        else if (status === AttendanceStatus.TRUANT) truantCount++;
        else if (status === AttendanceStatus.ESCAPE) escapeCount++;
    });

    const totalStudents = students.length;
    const attendanceRate = totalStudents > 0 
        ? Math.round(((totalStudents - absentCount) / totalStudents) * 100) 
        : 100;

    return {
        totalStudents,
        presentCount,
        absentCount,
        truantCount,
        escapeCount,
        attendanceRate
    };
};

export const getStudentHistory = (studentId: string, startDate?: string, endDate?: string) => {
    // Filter attendance store for this student
    return Object.values(attendanceStore)
        .filter(r => {
            if (r.studentId !== studentId) return false;
            // Only return records with violations (Not Present)
            if (r.status === AttendanceStatus.PRESENT) return false; 
            
            if (startDate && r.date < startDate) return false;
            if (endDate && r.date > endDate) return false;
            return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
};

export const getClassPeriodStats = (classId: string, startDate: string, endDate: string): StudentPeriodStats[] => {
    const classStudents = students.filter(s => s.classId === classId);
    
    return classStudents.map(student => {
        const history = getStudentHistory(student.id, startDate, endDate);
        return {
            student,
            absentCount: history.filter(r => r.status === AttendanceStatus.ABSENT).length,
            truantCount: history.filter(r => r.status === AttendanceStatus.TRUANT).length,
            escapeCount: history.filter(r => r.status === AttendanceStatus.ESCAPE).length,
        };
    });
};
