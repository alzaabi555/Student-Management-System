import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { StudentPeriodStats, SchoolAssets } from './dataService';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- الإعدادات ---
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297; 
const A4_WIDTH_PX = 794; 
const ROWS_PER_PAGE = 30; // 30 طالب كما طلبت

/**
 * دالة مساعدة لتصدير أي محتوى HTML إلى PDF (مطلوبة في Reports.tsx)
 */
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
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '-9999px';
    container.style.width = '210mm'; 
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-1000';
    
    container.innerHTML = getReportHTMLStructure(contentHTML, false);
    document.body.appendChild(container);

    try {
        await new Promise(resolve => setTimeout(resolve, 800));

        const canvas = await html2canvas(container.querySelector('.report-container') as HTMLElement, {
            scale: 2, 
            useCORS: true,
            logging: false,
            width: A4_WIDTH_PX,
            windowWidth: A4_WIDTH_PX,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = A4_WIDTH_MM;
        const pageHeight = A4_HEIGHT_MM;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position -= pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
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
        alert("حدث خطأ أثناء الطباعة");
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

// --- CSS وتنسيق الجدول ---
const getReportHTMLStructure = (bodyContent: string, isWebPrint: boolean = false) => `
      ${!isWebPrint ? '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"></head><body>' : ''}
      <div class="report-container">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; background: white; color: black; }
            
            .report-container { width: 210mm; margin: 0 auto; }

            .print-page {
                width: 210mm;
                min-height: 297mm;
                padding: 15mm;
                page-break-after: always;
                display: flex;
                flex-direction: column;
            }
            .print-page:last-child { page-break-after: auto; }

            /* ترويسة بسيطة */
            .simple-header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            .school-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .report-title { font-size: 22px; font-weight: 800; margin: 5px 0; }
            .meta-info { 
                display: flex; 
                justify-content: space-between; 
                font-weight: bold; 
                font-size: 14px; 
                margin-top: 10px;
                background: #f1f1f1;
                padding: 5px 10px;
                border: 1px solid #ccc;
            }

            /* الجدول */
            table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 12px;
                border: 1px solid #000;
            }
            
            th { 
                background-color: #ddd !important; 
                font-weight: 800; 
                padding: 8px; 
                border: 1px solid #000; 
                text-align: center;
            }

            td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: center; 
                height: 25px;
            }

            tr:nth-child(even) { background-color: #f9f9f9; }

            .footer-page {
                margin-top: auto;
                text-align: center;
                font-size: 10px;
                border-top: 1px solid #eee;
                padding-top: 5px;
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

// --- المولدات (Generators) - يجب تصديرها لأن Reports.tsx يستخدمها ---

// 1. كشف الحضور والغياب (صف واحد)
const generateSingleClassHTML = (
    schoolName: string, gradeName: string, className: string, date: string,
    allStudents: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    const studentChunks = chunkArray(allStudents, ROWS_PER_PAGE);
    
    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            const status = attendanceData[student.id] || AttendanceStatus.PRESENT;
            let statusText = status === AttendanceStatus.ABSENT ? 'غائب' : 
                             status === AttendanceStatus.TRUANT ? 'تسرب' : 
                             status === AttendanceStatus.ESCAPE ? 'هروب' : 'حاضر';
            
            return `
            <tr>
                <td>${globalIndex}</td>
                <td style="text-align: right; padding-right: 5px;">${student.name}</td>
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
                        <span>التاريخ: ${date}</span>
                        <span>الصف: ${gradeName} / ${className}</span>
                    </div>
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

// ✅ تصدير الدالة: توليد كشف الحضور (يستخدمها Reports.tsx)
export const generateAttendanceSheetHTML = (
    schoolName: string, gradeName: string, className: string, date: string,
    students: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    return generateSingleClassHTML(schoolName, gradeName, className, date, students, attendanceData);
};

// ✅ تصدير الدالة: توليد تقرير شامل لكل الصفوف (يستخدمها Reports.tsx)
export const generateGradeDailyReportHTML = (
    schoolName: string, gradeName: string, date: string,
    classesData: { className: string, students: Student[] }[],
    attendanceData: Record<string, AttendanceStatus>
) => {
    return classesData.map((cls) => {
        return generateSingleClassHTML(schoolName, gradeName, cls.className, date, cls.students, attendanceData);
    }).join('');
};

// ✅ تصدير الدالة: تقرير الغياب اليومي (يستخدمها Reports.tsx)
export const generateDailyAbsenceReportHTML = (
    schoolName: string, date: string, allAbsentStudents: any[]
) => {
    const studentChunks = chunkArray(allAbsentStudents, ROWS_PER_PAGE);

    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            let statusText = 'غائب';
            if (student.status === AttendanceStatus.TRUANT) statusText = 'تسرب حصة';
            if (student.status === AttendanceStatus.ESCAPE) statusText = 'تسرب مدرسة';

            return `
            <tr>
                <td>${globalIndex}</td>
                <td style="text-align: right; padding-right: 5px;">${student.name}</td>
                <td>${student.gradeName}/${student.className}</td>
                <td>${statusText}</td>
                <td>${student.parentPhone || '-'}</td>
            </tr>`;
        }).join('');

        return `
            <div class="print-page">
                <div class="simple-header">
                    <div class="school-name">${schoolName}</div>
                    <div class="report-title">تقرير الغياب والتسرب اليومي</div>
                    <div class="meta-info">
                        <span>التاريخ: ${date}</span>
                        <span>العدد: ${allAbsentStudents.length}</span>
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
                <div class="footer-page">صفحة ${pageIndex + 1}</div>
            </div>
        `;
    }).join('');
};

// ✅ تصدير الدالة: تقرير إحصائي للفصل (يستخدمها Reports.tsx)
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
                        <span>الفترة: من ${startDate} إلى ${endDate}</span>
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

// ✅ تصدير الدالة: تقرير طالب فردي (يستخدمها Reports.tsx)
export const generateStudentReportHTML = (
    schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string
) => {
    const chunks = records.length > 0 ? chunkArray(records, 15) : [[]];
    
    return chunks.map((chunk, pageIndex) => {
        const rows = chunk.length === 0 ? 
            `<tr><td colspan="4" style="padding:20px;">لا توجد غيابات مسجلة.</td></tr>` :
            chunk.map((rec, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${new Date(rec.date).toLocaleDateString('ar-EG')}</td>
                    <td>${rec.status === 'absent' ? 'غائب' : 'تسرب'}</td>
                    <td>${rec.note || '-'}</td>
                </tr>
            `).join('');

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

// --- دوال التنفيذ المباشر (Executors) ---

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

// ✅ إعادة إضافة دالة طباعة خطاب الاستدعاء (Summon Letter) - كانت مفقودة وتسبب الخطأ في SummonPage.tsx
export const printSummonLetter = (
  schoolName: string, districtName: string, studentName: string, gradeName: string, className: string, date: string, time: string, reason: string, issueDate: string, assets?: SchoolAssets
) => {
      const html = `
        <div class="print-page" style="border: none;">
            <div style="border: 2px solid #000; padding: 30px; height: 95%; box-sizing: border-box; position: relative;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 18px; font-weight: bold;">سلطنة عُمان</div>
                    <div style="font-size: 18px; font-weight: bold;">وزارة التربية والتعليم</div>
                    <div style="font-size: 16px;">مدرسة ${schoolName}</div>
                </div>
                
                <div style="text-align: center; font-size: 24px; font-weight: bold; text-decoration: underline; margin: 30px 0;">استدعاء ولي أمر</div>

                <div style="font-size: 16px; line-height: 2.0; text-align: justify; direction: rtl;">
                    <p><strong>الفاضل ولي أمر الطالب:</strong> ${studentName}</p>
                    <p><strong>الصف:</strong> ${gradeName} / ${className}</p>
                    <br/>
                    <p>السلام عليكم ورحمة الله وبركاته،،،</p>
                    <p>نرجو منكم التكرم بالحضور إلى المدرسة يوم <strong>${date}</strong> الساعة <strong>${time}</strong>.</p>
                    <p><strong>وذلك لمناقشة:</strong> ${reason}</p>
                    <br/>
                    <p>شاكرين لكم حسن تعاونكم لما فيه مصلحة الطالب.</p>
                </div>

                <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                    <div style="text-align: center;"><strong>إدارة المدرسة</strong><br/>.........................</div>
                    <div style="text-align: center;"><strong>ولي الأمر</strong><br/>.........................</div>
                </div>
            </div>
        </div>
      `;
      executeOutputStrategy(html, `استدعاء_${studentName}`);
};
