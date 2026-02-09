
import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { StudentPeriodStats, SchoolAssets } from './dataService';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- الثوابت ---
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297; 
const A4_WIDTH_PX = 794; 
// تم تعديل عدد الطلاب ليتناسب مع التصميم الجديد المريح (22 طالب للصفحة لضمان عدم انضغاط الجدول)
const ROWS_PER_PAGE = 22; 

/**
 * المحرك الأساسي للطباعة والمشاركة
 * يقرر هل يستخدم الطباعة المباشرة (ويب) أو توليد PDF (تطبيق)
 */
const executeOutputStrategy = async (contentHTML: string, fileName: string) => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        await generateAndSharePDF(contentHTML, fileName);
    } else {
        await printDirectlyOnWeb(contentHTML);
    }
};

/**
 * استراتيجية الموبايل: توليد PDF ومشاركته
 * يقوم بتحويل HTML إلى صورة طويلة ثم تقسيمها إلى صفحات PDF
 */
const generateAndSharePDF = async (contentHTML: string, fileName: string) => {
    // إنشاء حاوية مخفية لرسم التقرير
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
        // انتظار بسيط لتحميل الصور والخطوط
        await new Promise(resolve => setTimeout(resolve, 800));

        // نلتقط الصورة للطول الكامل (الذي قد يحتوي على عدة صفحات)
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
        
        // حساب الارتفاع الكلي للصورة الناتجة
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // الصفحة الأولى
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // إضافة الصفحات التالية (إذا كان التقرير طويلاً)
        while (heightLeft > 0) {
            position -= pageHeight; // سحب الصورة للأعلى
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const base64Data = pdf.output('datauristring').split(',')[1];
        const safeFileName = `${fileName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

        // حفظ الملف في الكاش
        await Filesystem.writeFile({
            path: safeFileName,
            data: base64Data,
            directory: Directory.Cache
        });

        const uriResult = await Filesystem.getUri({
            directory: Directory.Cache,
            path: safeFileName
        });

        // فتح نافذة المشاركة
        await Share.share({
            title: fileName,
            text: `تم إنشاء التقرير: ${fileName}`,
            url: uriResult.uri,
            dialogTitle: 'طباعة / مشاركة التقرير' 
        });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("حدث خطأ أثناء معالجة الملف للطباعة.");
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};

/**
 * استراتيجية الويب والكمبيوتر
 * تستخدم نافذة الطباعة المباشرة للمتصفح
 */
const printDirectlyOnWeb = async (contentBody: string) => {
    const printMount = document.getElementById('print-mount');
    if (!printMount) return;

    printMount.innerHTML = getReportHTMLStructure(contentBody, true);
    document.body.classList.add('printing');
    
    // انتظار تحميل الصور (الشعار)
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    window.print();
    
    // تنظيف بعد الطباعة
    setTimeout(() => {
        document.body.classList.remove('printing');
        printMount.innerHTML = '';
    }, 500);
};

// --- CSS وهيكل التقرير ---
const getReportHTMLStructure = (bodyContent: string, isWebPrint: boolean = false) => `
      ${!isWebPrint ? '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"></head><body>' : ''}
      <div class="report-container">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
            
            * { box-sizing: border-box; }
            body { 
                margin: 0; padding: 0; 
                font-family: 'Tajawal', sans-serif; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                background-color: white;
            }
            
            @page {
                size: A4;
                margin: 0;
            }

            .report-container { 
                width: 210mm; 
                margin: 0 auto; 
                background: white; 
                color: black;
            }

            /* تصميم الصفحة */
            .print-page {
                width: 210mm;
                min-height: 297mm;
                padding: 15mm 15mm; /* هوامش مريحة */
                position: relative;
                display: flex;
                flex-direction: column;
                page-break-after: always;
            }
            .print-page:last-child {
                page-break-after: auto;
            }

            /* الترويسة */
            .print-header { 
                text-align: center; 
                border-bottom: 2px solid #000; 
                padding-bottom: 15px; 
                margin-bottom: 25px; 
            }
            .print-title { font-size: 24px; font-weight: 800; margin: 0 0 5px 0; }
            .print-subtitle { font-size: 16px; color: #333; font-weight: bold; margin-bottom: 5px; }
            
            .print-meta { 
                display: flex; 
                justify-content: space-between; 
                margin-top: 15px; 
                font-weight: bold; 
                font-size: 14px; 
                border: 1px solid #333; 
                padding: 8px 20px; 
                border-radius: 6px; 
                background-color: #fcfcfc;
            }
            
            /* الجدول - تصميم احترافي */
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px; 
                font-size: 15px; 
                border: 1px solid #000;
            }
            
            /* رأس الجدول */
            th { 
                background-color: #ffe4e6 !important; /* لون خلفية خفيف ومميز للرأس */
                color: #000; 
                font-weight: 800; 
                padding: 12px 10px; 
                border: 1px solid #000; 
                text-align: center;
                height: 45px; /* ارتفاع جيد للرأس */
            }

            /* خلايا الجدول */
            td { 
                border: 1px solid #000; 
                padding: 6px 10px; /* هامش داخلي مريح */
                text-align: center; 
                height: 38px; /* ارتفاع ثابت للصف لمنع التكدس */
                vertical-align: middle;
            }

            /* تلوين الصفوف الفردية والزوجية لسهولة القراءة */
            tr:nth-child(even) {
                background-color: #fafafa;
            }
            
            /* نصوص الأعمدة */
            td.col-name {
                text-align: right;
                padding-right: 15px;
                font-weight: 700;
                font-size: 15px;
            }

            .status-text { font-weight: bold; }
            
            /* التذييل والتواقيع */
            .footer-sig { 
                margin-top: auto; 
                padding-top: 30px;
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 30px;
            }
            .footer-sig div { 
                text-align: center; 
                font-weight: bold; 
                font-size: 16px; 
                width: 250px;
            }
            .footer-sig div span {
                display: block;
                margin-top: 40px;
                font-weight: normal;
                color: #aaa;
            }
            
            .page-number {
                text-align: center;
                font-size: 12px;
                color: #555;
                position: absolute;
                bottom: 10mm;
                left: 0;
                right: 0;
            }

            @media print {
                .report-container { width: 100%; }
                .print-page { height: auto; min-height: 297mm; }
                th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
                tr:nth-child(even) { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
            }
        </style>
        ${bodyContent}
      </div>
      ${!isWebPrint ? '</body></html>' : ''}
`;

// --- دوال مساعدة ---
const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

// --- دوال بناء المحتوى HTML ---

// 1. دالة بناء HTML لصف واحد
const generateSingleClassHTML = (
    schoolName: string, gradeName: string, className: string, date: string,
    allStudents: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    const studentChunks = chunkArray(allStudents, ROWS_PER_PAGE);
    
    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            const status = attendanceData[student.id] || AttendanceStatus.PRESENT;
            let statusText = 'حاضر';
            
            if (status === AttendanceStatus.ABSENT) { statusText = 'غائب'; } 
            else if (status === AttendanceStatus.TRUANT) { statusText = 'تسرب حصة'; } 
            else if (status === AttendanceStatus.ESCAPE) { statusText = 'تسرب مدرسة'; }
            
            return `
            <tr>
                <td style="font-weight: bold;">${globalIndex}</td>
                <td class="col-name">${student.name}</td>
                <td class="status-text">${statusText}</td>
                <td></td>
            </tr>`;
        }).join('');

        return `
            <div class="print-page">
                <div class="print-header">
                    <h1 class="print-title">${schoolName}</h1>
                    <div class="print-subtitle">نظام المتابعة اليومية</div>
                    <div class="print-meta">
                        <span>التاريخ: ${date}</span>
                        <span>الصف: ${gradeName}</span>
                        <span>الفصل: ${className}</span>
                    </div>
                </div>
                
                <table>
                    <colgroup>
                        <col style="width: 8%;">
                        <col style="width: 52%;">
                        <col style="width: 15%;">
                        <col style="width: 25%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>اسم الطالب</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>

                <div class="footer-sig">
                    <div>توقيع المعلم<span>.........................</span></div>
                    <div>ختم الإدارة<span>.........................</span></div>
                </div>
                
                <div class="page-number">صفحة ${pageIndex + 1} من ${studentChunks.length}</div>
            </div>
        `;
    }).join('');
};

// 2. دالة تقرير الغياب اليومي (للمشرفين)
export const generateDailyAbsenceReportHTML = (
    schoolName: string,
    date: string,
    allAbsentStudents: any[]
) => {
    const dateObj = new Date(date);
    const dateWithDay = dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
    
    const studentChunks = chunkArray(allAbsentStudents, ROWS_PER_PAGE);

    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            let statusText = 'غائب';
            
            if (student.status === AttendanceStatus.TRUANT) { statusText = 'تسرب حصة'; } 
            else if (student.status === AttendanceStatus.ESCAPE) { statusText = 'تسرب مدرسة'; }
            
            return `
            <tr>
                <td style="font-weight:bold;">${globalIndex}</td>
                <td class="col-name">${student.name}</td>
                <td style="font-weight:bold;">${student.gradeName} / ${student.className}</td>
                <td class="status-text">${statusText}</td>
                <td style="direction: ltr; text-align:center;">${student.parentPhone}</td>
            </tr>`;
        }).join('');

        return `
            <div class="print-page">
                <div class="print-header">
                    <h1 class="print-title">${schoolName}</h1>
                    <div class="print-subtitle">تقرير الغياب والتسرب اليومي</div>
                    <div class="print-meta">
                        <span>التاريخ: ${dateWithDay}</span>
                        <span>الإجمالي: ${allAbsentStudents.length} طالب</span>
                    </div>
                </div>
                <table>
                    <colgroup>
                        <col style="width: 8%;">
                        <col style="width: 42%;">
                        <col style="width: 20%;">
                        <col style="width: 15%;">
                        <col style="width: 15%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>اسم الطالب</th>
                            <th>الصف / الشعبة</th>
                            <th>الحالة</th>
                            <th>رقم ولي الأمر</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer-sig">
                    <div>مسؤول السجل<span>.........................</span></div>
                    <div>مدير المدرسة<span>.........................</span></div>
                </div>
                <div class="page-number">صفحة ${pageIndex + 1} من ${studentChunks.length}</div>
            </div>
        `;
    }).join('');
};

// ... الدوال الأخرى (بدون تغيير كبير في المنطق، فقط تستفيد من الستايل الجديد) ...

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

export const generateClassPeriodReportHTML = (
  schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]
) => {
  const sortedStats = [...stats].sort((a, b) => (b.absentCount + b.truantCount + b.escapeCount) - (a.absentCount + a.truantCount + a.escapeCount));
  const statChunks = chunkArray(sortedStats, ROWS_PER_PAGE);

  return statChunks.map((chunk, pageIndex) => {
      const rows = chunk.map((stat, index) => {
        const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
        const totalViolations = stat.absentCount + stat.truantCount + stat.escapeCount;
        
        return `<tr>
            <td style="font-weight:bold;">${globalIndex}</td>
            <td class="col-name">${stat.student.name}</td>
            <td>${stat.absentCount}</td>
            <td>${stat.truantCount}</td>
            <td>${stat.escapeCount}</td>
            <td style="font-weight: bold;">${totalViolations}</td>
        </tr>`;
      }).join('');

      return `
        <div class="print-page">
            <div class="print-header">
                <h1 class="print-title">${schoolName}</h1>
                <div class="print-subtitle">تقرير إحصائي للفصل</div>
                <div class="print-meta">
                    <span>الفترة: ${startDate} إلى ${endDate}</span>
                    <span>الصف: ${gradeName} / ${className}</span>
                </div>
            </div>
            <table>
                <colgroup>
                    <col style="width: 8%;">
                    <col style="width: 42%;">
                    <col style="width: 12%;">
                    <col style="width: 12%;">
                    <col style="width: 12%;">
                    <col style="width: 14%;">
                </colgroup>
                <thead><tr><th>#</th><th>اسم الطالب</th><th>غياب</th><th>تسرب حصة</th><th>تسرب مدرسة</th><th>الإجمالي</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer-sig"><div>الأخصائي الاجتماعي<span>.........................</span></div><div>مدير المدرسة<span>.........................</span></div></div>
            <div class="page-number">صفحة ${pageIndex + 1} من ${statChunks.length}</div>
        </div>
      `;
  }).join('');
};

export const generateStudentReportHTML = (
  schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string
) => {
  const STUDENT_ROWS = 18; // عدد صفوف أقل للطالب لوجود مساحات للتوقيع
  const recordChunks = records.length > 0 ? chunkArray(records, STUDENT_ROWS) : [[]];

  return recordChunks.map((chunk, pageIndex) => {
      const recordsRows = chunk.length === 0 
      ? `<tr><td colspan="4" style="padding: 20px;">لا توجد سجلات غياب أو تسرب لهذا الطالب خلال الفترة المحددة.</td></tr>`
      : chunk.map((record, index) => {
        const globalIndex = (pageIndex * STUDENT_ROWS) + index + 1;
        let statusText = '', details = '';
        if (record.status === AttendanceStatus.ABSENT) { statusText = 'غائب'; } 
        else if (record.status === AttendanceStatus.TRUANT) { statusText = 'تسرب من الحصة'; if (record.period) details = `حصة: ${record.period}`; } 
        else if (record.status === AttendanceStatus.ESCAPE) { statusText = 'تسرب من المدرسة'; if (record.note) details = `ملاحظة: ${record.note}`; }
        
        const dateWithDay = new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
        
        return `<tr>
            <td style="font-weight:bold;">${globalIndex}</td>
            <td style="font-weight:bold;">${dateWithDay}</td>
            <td class="status-text">${statusText}</td>
            <td style="font-size: 13px;">${details}</td>
        </tr>`;
      }).join('');

      return `
        <div class="print-page">
            <div class="print-header">
                <h1 class="print-title">${schoolName}</h1>
                <div class="print-subtitle">تقرير حالة طالب</div>
                <div class="print-meta">
                    <span>الطالب: ${studentName}</span>
                    <span>الصف: ${gradeName} / ${className}</span>
                </div>
            </div>
            ${pageIndex === 0 ? `<div style="margin: 15px 0; font-weight:bold; text-align:center; background:#eee; padding:5px;">${periodText}</div>` : ''}
            <table>
                 <colgroup>
                    <col style="width: 8%;">
                    <col style="width: 30%;">
                    <col style="width: 25%;">
                    <col style="width: 37%;">
                </colgroup>
                <thead><tr><th>#</th><th>التاريخ</th><th>الحالة</th><th>تفاصيل</th></tr></thead>
                <tbody>${recordsRows}</tbody>
            </table>
            <div class="footer-sig"><div>توقيع ولي الأمر بالعلم<span>.........................</span></div><div>الأخصائي الاجتماعي<span>.........................</span></div></div>
            <div class="page-number">صفحة ${pageIndex + 1} من ${recordChunks.length}</div>
        </div>
      `;
  }).join('');
};

// دالة تصدير HTML إلى PDF
export const shareHTMLAsPDF = async (contentBody: string, fileName: string) => {
    await executeOutputStrategy(contentBody, fileName);
};

// الدوال العامة التي تستدعيها واجهة المستخدم
export const printAttendanceSheet = (
    schoolName: string, gradeName: string, className: string, date: string, 
    students: Student[], attendanceData: Record<string, AttendanceStatus>,
    isFullGrade: boolean = false, classesData: { className: string, students: Student[] }[] = []
) => {
    let html = '';
    let fName = '';
    
    // تنسيق التاريخ لاسم الملف
    const safeDate = date.replace(/-/g, '_');

    if (isFullGrade && classesData.length > 0) {
        html = generateGradeDailyReportHTML(schoolName, gradeName, date, classesData, attendanceData);
        fName = `تقرير_شامل_${gradeName}_${safeDate}`;
    } else {
        html = generateAttendanceSheetHTML(schoolName, gradeName, className, date, students, attendanceData);
        fName = `كشف_غياب_${className}_${safeDate}`;
    }
    
    executeOutputStrategy(html, fName);
};

export const printClassPeriodReport = (schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]) => {
  const html = generateClassPeriodReportHTML(schoolName, gradeName, className, startDate, endDate, stats);
  executeOutputStrategy(html, `تقرير_فصل_${className}`);
};

export const printStudentReport = (schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string) => {
  const html = generateStudentReportHTML(schoolName, studentName, gradeName, className, records, periodText);
  executeOutputStrategy(html, `تقرير_الطالب_${studentName}`);
};

export const printDailyAbsenceReport = (schoolName: string, date: string, absentStudents: any[]) => {
    const html = generateDailyAbsenceReportHTML(schoolName, date, absentStudents);
    executeOutputStrategy(html, `غياب_يوم_${date}`);
};

// دالة طباعة خطاب الاستدعاء
export const printSummonLetter = (
  schoolName: string, districtName: string, studentName: string, gradeName: string, className: string, date: string, time: string, reason: string, issueDate: string, assets?: SchoolAssets
) => {
      // منطق الصور والتواقيع
      const committeeSigHtml = assets?.committeeSig ? `<img src="${assets.committeeSig}" style="height: 60px; display: block; margin: 10px auto;" />` : `<p style="margin-top: 40px;">.........................</p>`;
      const principalSigHtml = assets?.principalSig ? `<img src="${assets.principalSig}" style="height: 60px; display: block; margin: 10px auto;" />` : `<p style="margin-top: 40px;">.........................</p>`;
      const stampHtml = assets?.schoolStamp ? `<img src="${assets.schoolStamp}" style="width: 120px; opacity: 0.8; transform: rotate(-5deg);" />` : `<div style="width: 100px; height: 100px; border: 1px dashed #ccc; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #ccc;">الختم</div>`;
      const headerLogoHtml = assets?.headerLogo ? `<img src="${assets.headerLogo}" alt="الشعار" style="height: 100px; width: auto; object-fit: contain;" />` : `<div style="height: 100px; width: 100px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #ccc;">الشعار</div>`;
    
      const html = `
        <div class="print-page" style="border: none;">
            <div style="border: 4px double #000; padding: 40px; height: 100%; box-sizing: border-box; position: relative;">
                
                <!-- New Header Layout using Flexbox -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px;">
                    <!-- Right: Text (RTL) -->
                    <div style="text-align: right; width: 40%;">
                        <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">سلطنة عُمان</div>
                        <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">وزارة التربية والتعليم</div>
                        <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">المديرية العامة للتربية والتعليم لمحافظة ${districtName}</div>
                        <div style="font-size: 16px; font-weight: bold;">مدرسة ${schoolName}</div>
                    </div>
                    
                    <!-- Center: Logo -->
                    <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
                        ${headerLogoHtml}
                    </div>

                    <!-- Left: Empty for balance -->
                    <div style="width: 30%;"></div>
                </div>

                <div style="padding: 10px; font-size: 18px; line-height: 2.2; text-align: justify; direction: rtl;">
                    <div style="border-bottom: 1px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                        <div style="font-weight: bold; margin-bottom: 15px;">الفاضل ولي أمر الطالب : ( ${studentName} )</div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                            <span>المقيد بالصف : ( ${gradeName} / ${className} )</span>
                            <span style="font-weight: normal; font-size: 16px;">تحريراً في: ${issueDate}</span>
                        </div>
                    </div>
                    <div style="text-align: center; margin: 30px 0; font-weight: bold; font-size: 22px; text-decoration: underline; text-underline-offset: 8px;">السلام علیکم ورحمة الله وبرکاته</div>
                    <div style="text-align: justify; text-align-last: right;">
                        <p style="margin-bottom: 10px;">نظراً لأهمية التعاون بين المدرسة وولي الأمر فيما يخدم مصلحة الطالب، ويحقق له النجاح، نأمل منكم الحضور إلى المدرسة لبحث بعض الأمور المتعلقة بابنكم:</p>
                        <div style="text-align: center; margin: 25px 0; font-weight: bold; font-size: 20px; background-color: #f0f0f0; border-radius: 5px; padding: 5px;">( ${reason} )</div>
                        <p>ولنا في حضوركم أمل بهدف التعاون بين البيت والمدرسة لتحقيق الرسالة التربوية الهادفة التي نسعى إليها، وتأمل المدرسة حضوركم في أقرب فرصة ممكنة لديكم.</p>
                    </div>
                    <p style="margin-top: 30px; font-size: 16px; color: #555; text-align: center; border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #fafafa;">* الموعد المقترح: يوم <strong>${date}</strong> الساعة <strong>${time}</strong>.</p>
                    <p style="margin-top: 30px; font-weight: bold; text-align: center;">شاكرين لكم حسن تعاونكم وتجاوبكم معنا لتحقيق مصلحة الطالب</p>
                </div>
                
                <!-- Footer Signatures -->
                <div style="margin-top: 60px; padding: 0 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="text-align: center; width: 220px;">
                        <p style="font-weight: bold; margin-bottom: 15px; font-size: 18px;">رئيس لجنة شؤون الطلبة</p>
                        ${committeeSigHtml}
                    </div>
                    
                    <!-- Center: Stamp -->
                    <div style="flex: 1; display: flex; justify-content: center; align-items: center; padding-bottom: 10px;">
                        ${stampHtml}
                    </div>

                    <div style="text-align: center; width: 220px;">
                        <p style="font-weight: bold; margin-bottom: 15px; font-size: 18px;">مدير المدرسة</p>
                        ${principalSigHtml}
                    </div>
                </div>
            </div>
        </div>
      `;
      executeOutputStrategy(html, `استدعاء_${studentName}`);
};
