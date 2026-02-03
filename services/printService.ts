import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { StudentPeriodStats, SchoolAssets } from './dataService';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- إعدادات الورقة A4 (دقة ومقاسات ثابتة بالبكسل) ---
// هذا يضمن عدم انضغاط الصورة لأننا نحدد الأبعاد بدقة
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const ROWS_PER_PAGE = 24; // 30 طالب في الصفحة

// --- دوال مساعدة للتاريخ ---
const formatDateWithDay = (dateString: string) => {
    try {
        const date = new Date(dateString);
        // استخراج اسم اليوم والتاريخ بالعربي
        return date.toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString;
    }
};

// --- المحرك الأساسي ---

export const shareHTMLAsPDF = async (contentBody: string, fileName: string) => {
    await executeOutputStrategy(contentBody, fileName);
};

const executeOutputStrategy = async (contentHTML: string, fileName: string) => {
    if (Capacitor.isNativePlatform()) {
        await generateAndSharePDF(contentHTML, fileName);
    } else {
        await printDirectlyOnWeb(contentHTML);
    }
};

const generateAndSharePDF = async (contentHTML: string, fileName: string) => {
    // 1. إنشاء حاوية مخفية
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '-9999px';
    // تحديد العرض والارتفاع بدقة لمنع الانضغاط
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.zIndex = '-1000';
    
    container.innerHTML = getReportHTMLStructure(contentHTML, false);
    document.body.appendChild(container);

    try {
        await new Promise(resolve => setTimeout(resolve, 800)); // انتظار الخطوط

        const pages = container.querySelectorAll('.print-page');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = 210; 
        const pdfHeight = 297; 

        for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i] as HTMLElement;
            
            const canvas = await html2canvas(pageElement, {
                scale: 2, // دقة عالية
                useCORS: true,
                logging: false,
                width: A4_WIDTH_PX,
                height: A4_HEIGHT_PX, 
                windowWidth: A4_WIDTH_PX,
                windowHeight: A4_HEIGHT_PX,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        const base64Data = pdf.output('datauristring').split(',')[1];
        const safeFileName = `${fileName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

        await Filesystem.writeFile({
            path: safeFileName,
            data: base64Data,
            directory: Directory.Cache
        });

        const uriResult = await Filesystem.getUri({
            directory: Directory.Cache,
            path: safeFileName
        });

        await Share.share({
            title: fileName,
            url: uriResult.uri
        });

    } catch (error) {
        console.error("PDF Error:", error);
        alert("حدث خطأ أثناء إنشاء ملف الطباعة");
    } finally {
        if (document.body.contains(container)) document.body.removeChild(container);
    }
};

const printDirectlyOnWeb = async (contentBody: string) => {
    let printMount = document.getElementById('print-mount');
    if (!printMount) {
        printMount = document.createElement('div');
        printMount.id = 'print-mount';
        document.body.appendChild(printMount);
    }
    printMount.innerHTML = getReportHTMLStructure(contentBody, true);
    await new Promise(resolve => setTimeout(resolve, 500));
    window.print();
    printMount.innerHTML = '';
};

// --- CSS وتنسيق الصفحة (Fixed Dimensions) ---
const getReportHTMLStructure = (bodyContent: string, isWebPrint: boolean = false) => `
      ${!isWebPrint ? '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"></head><body>' : ''}
      <div class="report-wrapper">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; background: white; color: black; }
            
            /* الصفحة الواحدة بمقاس ثابت */
            .print-page {
                width: 794px;  
                height: 1123px; 
                padding: 40px;
                position: relative;
                background: white;
                border-bottom: 1px dashed #ccc; 
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            /* الترويسة */
            .simple-header {
                text-align: center;
                border-bottom: 3px double #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
                height: 140px; /* ارتفاع ثابت للترويسة */
            }
            .school-name { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
            .report-title { font-size: 28px; font-weight: 800; margin: 10px 0; color: #000; }
            
            .meta-info { 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                font-weight: bold; 
                font-size: 16px; 
                margin-top: 15px;
                background: #f1f5f9;
                padding: 10px 20px;
                border: 1px solid #000;
                border-radius: 8px;
            }

            /* الجدول */
            table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 14px; 
                border: 1px solid #000;
                margin-top: 10px;
            }
            
            th { 
                background-color: #e2e8f0 !important; 
                font-weight: 800; 
                padding: 12px 5px; 
                border: 1px solid #000; 
                text-align: center;
                color: #000;
            }

            td { 
                border: 1px solid #000; 
                padding: 5px; 
                text-align: center; 
                height: 28px; /* ارتفاع ثابت للصف */
                vertical-align: middle;
            }

            tr:nth-child(even) { background-color: #ffffff; }
            tr:nth-child(odd) { background-color: #f8fafc; }

            /* التذييل */
            .signatures {
                position: absolute;
                bottom: 50px;
                left: 40px;
                right: 40px;
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 16px;
            }
            
            .footer-page {
                position: absolute;
                bottom: 15px;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
        </style>
        ${bodyContent}
      </div>
      ${!isWebPrint ? '</body></html>' : ''}
`;

const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) chunked.push(array.slice(i, i + size));
    return chunked;
};

// --- المولدات ---

// 1. كشف الحضور والغياب
const generateSingleClassHTML = (
    schoolName: string, gradeName: string, className: string, date: string,
    allStudents: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    const studentChunks = chunkArray(allStudents, ROWS_PER_PAGE);
    const dateWithDay = formatDateWithDay(date); // إضافة اليوم
    
    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            const status = attendanceData[student.id] || AttendanceStatus.PRESENT;
            
            let statusText = 'حاضر';
            let rowStyle = '';

            if (status === AttendanceStatus.ABSENT) { 
                statusText = 'غائب'; 
                rowStyle = 'background-color: #fee2e2 !important; color: #b91c1c; font-weight: bold;';
            } else if (status === AttendanceStatus.TRUANT) { 
                statusText = 'تسرب'; 
                rowStyle = 'color: #d97706; font-weight: bold;';
            } else if (status === AttendanceStatus.ESCAPE) { 
                statusText = 'هروب';
                rowStyle = 'color: #b45309; font-weight: bold;';
            }
            
            return `
            <tr style="${rowStyle}">
                <td>${globalIndex}</td>
                <td style="text-align: right; padding-right: 15px;">${student.name}</td>
                <td>${statusText}</td>
                <td></td>
            </tr>`;
        }).join('');

        return `
            <div class="print-page">
                <div class="simple-header">
                    <div class="school-name">${schoolName}</div>
                    <div class="report-title">كشف الحضور والغياب اليومي</div>
                    <div class="meta-info">
                        <span>الصف: ${gradeName} / ${className}</span>
                        <span>${dateWithDay}</span> </div>
                </div>
                <table>
                    <colgroup>
                        <col style="width: 8%;">
                        <col style="width: 50%;">
                        <col style="width: 15%;">
                        <col style="width: 27%;">
                    </colgroup>
                    <thead><tr><th>م</th><th>الاسم</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer-page">صفحة ${pageIndex + 1} من ${studentChunks.length}</div>
            </div>
        `;
    }).join('');
};

// --- الدوال المصدرة ---

export const generateAttendanceSheetHTML = (
    schoolName: string, gradeName: string, className: string, date: string,
    students: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    return generateSingleClassHTML(schoolName, gradeName, className, date, students, attendanceData);
};

export const generateGradeDailyReportHTML = (
    schoolName: string, gradeName: string, date: string,
    classesData: { className: string, students: Student[] }[],
    attendanceData: Record<string, AttendanceStatus>
) => {
    return classesData.map((cls) => {
        return generateSingleClassHTML(schoolName, gradeName, cls.className, date, cls.students, attendanceData);
    }).join('');
};

export const generateDailyAbsenceReportHTML = (
    schoolName: string, date: string, allAbsentStudents: any[]
) => {
    const studentChunks = chunkArray(allAbsentStudents, ROWS_PER_PAGE);
    const dateWithDay = formatDateWithDay(date);

    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            let statusText = 'غائب';
            if (student.status === AttendanceStatus.TRUANT) statusText = 'تسرب حصة';
            if (student.status === AttendanceStatus.ESCAPE) statusText = 'تسرب مدرسة';

            return `
            <tr>
                <td>${globalIndex}</td>
                <td style="text-align: right; padding-right: 10px;">${student.name}</td>
                <td>${student.gradeName}/${student.className}</td>
                <td>${statusText}</td>
                <td>${student.parentPhone || '-'}</td>
            </tr>`;
        }).join('');

        return `
            <div class="print-page">
                <div class="simple-header">
                    <div class="school-name">${schoolName}</div>
                    <div class="report-title">تقرير الغياب اليومي</div>
                    <div class="meta-info">
                        <span>العدد: ${allAbsentStudents.length}</span>
                        <span>${dateWithDay}</span>
                    </div>
                </div>
                <table>
                    <colgroup>
                        <col style="width: 5%;">
                        <col style="width: 45%;">
                        <col style="width: 15%;">
                        <col style="width: 15%;">
                        <col style="width: 20%;">
                    </colgroup>
                    <thead><tr><th>م</th><th>اسم الطالب</th><th>الصف</th><th>الحالة</th><th>ولي الأمر</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                
                <div class="signatures">
                    <div>مسؤول السجل</div>
                    <div>مدير المدرسة</div>
                </div>

                <div class="footer-page">صفحة ${pageIndex + 1}</div>
            </div>
        `;
    }).join('');
};

export const generateClassPeriodReportHTML = (
  schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]
) => {
    const sortedStats = [...stats].sort((a, b) => (b.absentCount + b.truantCount) - (a.absentCount + a.truantCount));
    const chunks = chunkArray(sortedStats, ROWS_PER_PAGE);

    return chunks.map((chunk, pageIndex) => {
        const rows = chunk.map((stat, i) => `
            <tr>
                <td>${(pageIndex * ROWS_PER_PAGE) + i + 1}</td>
                <td style="text-align:right;padding-right:10px;">${stat.student.name}</td>
                <td>${stat.absentCount}</td>
                <td>${stat.truantCount}</td>
                <td style="font-weight:bold;">${stat.absentCount + stat.truantCount}</td>
            </tr>
        `).join('');

        return `
            <div class="print-page">
                <div class="simple-header">
                    <div class="school-name">${schoolName}</div>
                    <div class="report-title">تقرير الانضباط الطلابي</div>
                    <div class="meta-info">
                        <span>الصف: ${gradeName}/${className}</span>
                        <span>من ${startDate} إلى ${endDate}</span>
                    </div>
                </div>
                <table>
                    <thead><tr><th>م</th><th>الاسم</th><th>غياب</th><th>تسرب</th><th>الإجمالي</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer-page">صفحة ${pageIndex + 1}</div>
            </div>
        `;
    }).join('');
};

export const generateStudentReportHTML = (
    schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string
) => {
    const chunks = records.length > 0 ? chunkArray(records, 15) : [[]];
    
    return chunks.map((chunk, pageIndex) => {
        const rows = chunk.length === 0 ? 
            `<tr><td colspan="4" style="padding:20px;">لا توجد غيابات مسجلة.</td></tr>` :
            chunk.map((rec, i) => {
                let statusText = 'حاضر';
                if (rec.status === AttendanceStatus.ABSENT) statusText = 'غائب';
                else if (rec.status === AttendanceStatus.TRUANT) statusText = 'تسرب';
                else if (rec.status === AttendanceStatus.ESCAPE) statusText = 'هروب';

                const dateDisplay = formatDateWithDay(rec.date);

                return `
                <tr>
                    <td>${i + 1}</td>
                    <td>${dateDisplay}</td>
                    <td>${statusText}</td>
                    <td>${rec.note || '-'}</td>
                </tr>
                `;
            }).join('');

        return `
            <div class="print-page">
                <div class="simple-header">
                    <div class="school-name">${schoolName}</div>
                    <div class="report-title">سجل متابعة طالب</div>
                    <div class="meta-info">
                        <span>الطالب: ${studentName}</span>
                        <span>الصف: ${gradeName}/${className}</span>
                    </div>
                </div>
                <table>
                    <thead><tr><th>م</th><th>التاريخ</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer-page">صفحة ${pageIndex + 1}</div>
            </div>
        `;
    }).join('');
};

// --- التنفيذ ---

export const printAttendanceSheet = (
    schoolName: string, gradeName: string, className: string, date: string, 
    students: Student[], attendanceData: Record<string, AttendanceStatus>,
    isFullGrade: boolean = false, classesData: any[] = []
) => {
    let html = '';
    if (isFullGrade && classesData.length > 0) {
        html = generateGradeDailyReportHTML(schoolName, gradeName, date, classesData, attendanceData);
    } else {
        html = generateAttendanceSheetHTML(schoolName, gradeName, className, date, students, attendanceData);
    }
    executeOutputStrategy(html, `كشف_${className}_${date}`);
};

export const printDailyAbsenceReport = (schoolName: string, date: string, absentStudents: any[]) => {
    const html = generateDailyAbsenceReportHTML(schoolName, date, absentStudents);
    executeOutputStrategy(html, `غياب_${date}`);
};

export const printClassPeriodReport = (schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]) => {
    const html = generateClassPeriodReportHTML(schoolName, gradeName, className, startDate, endDate, stats);
    executeOutputStrategy(html, `تقرير_فصل_${className}`);
};

export const printStudentReport = (schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string) => {
    const html = generateStudentReportHTML(schoolName, studentName, gradeName, className, records, periodText);
    executeOutputStrategy(html, `تقرير_الطالب_${studentName}`);
};

export const printSummonLetter = (
  schoolName: string, districtName: string, studentName: string, gradeName: string, className: string, date: string, time: string, reason: string, issueDate: string, assets?: SchoolAssets
) => {
      const html = `
        <div class="print-page">
            <div style="border: 2px solid #000; padding: 40px; height: 100%; box-sizing: border-box; position: relative;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 18px; font-weight: bold;">سلطنة عُمان</div>
                    <div style="font-size: 18px; font-weight: bold;">وزارة والتعليم</div>
                    <div style="font-size: 16px;">مدرسة ${schoolName}</div>
                </div>
                
                <div style="text-align: center; font-size: 26px; font-weight: bold; text-decoration: underline; margin: 50px 0;">استدعاء ولي أمر</div>

                <div style="font-size: 18px; line-height: 2.2; text-align: justify; direction: rtl;">
                    <p><strong>الفاضل ولي أمر الطالب:</strong> ${studentName}</p>
                    <p><strong>الصف:</strong> ${gradeName} / ${className}</p>
                    <br/>
                    <p>السلام عليكم ورحمة الله وبركاته،،،</p>
                    <p>نرجو منكم التكرم بالحضور إلى المدرسة يوم <strong>${formatDateWithDay(date)}</strong> الساعة <strong>${time}</strong>.</p>
                    <p><strong>وذلك لمناقشة:</strong> ${reason}</p>
                    <br/>
                    <p>شاكرين لكم حسن تعاونكم لما فيه مصلحة الطالب.</p>
                </div>

                <div style="margin-top: 80px; display: flex; justify-content: space-between; font-size: 16px;">
                    <div style="text-align: center;"><strong>إدارة المدرسة</strong><br/><br/>.........................</div>
                    <div style="text-align: center;"><strong>ولي الأمر</strong><br/><br/>.........................</div>
                </div>
            </div>
        </div>
      `;
      executeOutputStrategy(html, `استدعاء_${studentName}`);
};
