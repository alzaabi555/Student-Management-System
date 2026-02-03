import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { StudentPeriodStats } from './dataService';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- الإعدادات ---
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297; 
const A4_WIDTH_PX = 794; 
// ✅ تم التعديل إلى 30 طالب كما طلبت
const ROWS_PER_PAGE = 30; 

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
        await new Promise(resolve => setTimeout(resolve, 800)); // انتظار التحميل

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

// --- CSS وتنسيق الجدول المبسط (حل مشكلة التشتت) ---
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

            /* ترويسة بسيطة جداً */
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

            /* ✅ حل مشكلة تشتت الجدول */
            table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 12px; /* تصغير الخط قليلاً ليسع 30 طالب */
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
                height: 25px; /* ارتفاع ثابت للصف */
            }

            /* تلوين الصفوف */
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

// --- المولدات ---

// 1. تقرير كشف الحضور والغياب (للصف)
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
                <td></td> </tr>`;
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

// 2. تقرير الغياب اليومي (الذي ظهر فيه التشتت سابقاً)
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

// --- دوال الاستدعاء ---
export const printAttendanceSheet = (
    schoolName: string, gradeName: string, className: string, date: string, 
    students: Student[], attendanceData: Record<string, AttendanceStatus>,
    isFullGrade: boolean = false, classesData: any[] = []
) => {
    let html = '';
    if (isFullGrade && classesData.length > 0) {
        html = classesData.map(cls => generateSingleClassHTML(schoolName, gradeName, cls.className, date, cls.students, attendanceData)).join('');
    } else {
        html = generateSingleClassHTML(schoolName, gradeName, className, date, students, attendanceData);
    }
    executeOutputStrategy(html, `كشف_${className}_${date}`);
};

export const printDailyAbsenceReport = (schoolName: string, date: string, absentStudents: any[]) => {
    const html = generateDailyAbsenceReportHTML(schoolName, date, absentStudents);
    executeOutputStrategy(html, `غياب_${date}`);
};

// (يمكنك إضافة بقية دوال التقارير بنفس النمط البسيط إذا احتجتها)
