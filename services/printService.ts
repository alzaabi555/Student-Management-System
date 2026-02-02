
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
// عدد الصفوف في الصفحة الواحدة (تم ضبطه لضمان ظهور الترويسة والختم في كل صفحة)
const ROWS_PER_PAGE = 13; 

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
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');
            
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            
            .report-container { 
                width: 210mm; 
                margin: 0 auto; 
                background: white; 
                color: black;
            }

            /* تصميم الصفحة الواحدة - يضمن التقسيم الصحيح */
            .print-page {
                width: 210mm;
                height: 296mm; /* A4 height approx - 1mm margin */
                padding: 15mm 15mm;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                page-break-after: always;
                border-bottom: 1px dashed #ddd; /* خط وهمي للمعاينة فقط */
            }
            .print-page:last-child {
                border-bottom: none;
                page-break-after: auto;
            }

            .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .print-title { font-size: 20px; font-weight: 800; margin: 0; }
            .print-subtitle { font-size: 14px; color: #333; margin-top: 5px; font-weight: bold; }
            
            .print-meta { 
                display: flex; 
                justify-content: space-between; 
                margin-top: 10px; 
                font-weight: bold; 
                font-size: 12px; 
                border: 1px solid #000; 
                padding: 6px; 
                border-radius: 4px; 
                background-color: #f9f9f9;
            }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; }
            th { background-color: #e5e7eb !important; font-weight: 800; color: #000; height: 35px; }
            
            .status-absent { background-color: #ffe4e6 !important; }
            .status-truant { background-color: #fef3c7 !important; }
            
            .footer-sig { 
                position: absolute; 
                bottom: 20mm; 
                left: 15mm; 
                right: 15mm; 
                display: flex; 
                justify-content: space-between; 
            }
            .footer-sig div { text-align: center; font-weight: bold; font-size: 14px; }
            
            .page-number {
                position: absolute;
                bottom: 8mm;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 10px;
                color: #666;
            }

            @media print {
                .report-container { width: 100%; }
                .print-page { border-bottom: none; height: auto; min-height: 290mm; }
            }
        </style>
        ${bodyContent}
      </div>
      ${!isWebPrint ? '</body></html>' : ''}
`;

// --- دوال مساعدة ---
// دالة تقسيم المصفوفة إلى أجزاء (Pagination Logic)
const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

// --- دوال بناء المحتوى HTML ---

// 1. دالة بناء HTML لصف واحد (تستخدم للكشوفات اليومية)
const generateSingleClassHTML = (
    schoolName: string, gradeName: string, className: string, date: string,
    allStudents: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    // نقسم الطلاب إلى صفحات
    const studentChunks = chunkArray(allStudents, ROWS_PER_PAGE);
    
    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            const status = attendanceData[student.id] || AttendanceStatus.PRESENT;
            let statusText = 'حاضر';
            let rowClass = '';
            
            if (status === AttendanceStatus.ABSENT) { statusText = 'غائب'; rowClass = 'status-absent'; } 
            else if (status === AttendanceStatus.TRUANT) { statusText = 'تسرب من الحصة'; rowClass = 'status-truant'; } 
            else if (status === AttendanceStatus.ESCAPE) { statusText = 'تسرب من المدرسة'; rowClass = 'status-truant'; }
            
            return `<tr class="${rowClass}"><td>${globalIndex}</td><td style="text-align: right; font-weight: bold;">${student.name}</td><td>${statusText}</td><td></td></tr>`;
        }).join('');

        // تكرار الهيكل لكل صفحة
        return `
            <div class="print-page">
                <div class="print-header">
                    <h1 class="print-title">${schoolName}</h1>
                    <div class="print-subtitle">نظام المتابعة اليومية</div>
                    <div class="print-meta"><span>التاريخ: ${date}</span><span>الصف: ${gradeName}</span><span>الفصل: ${className}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th width="50">#</th>
                            <th>اسم الطالب</th>
                            <th width="120">الحالة</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>

                <div class="footer-sig">
                    <div>توقيع المعلم</div>
                    <div>ختم الإدارة</div>
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
    const studentChunks = chunkArray(allAbsentStudents, ROWS_PER_PAGE);

    return studentChunks.map((chunk, pageIndex) => {
        const rows = chunk.map((student, index) => {
            const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
            let statusText = 'غائب';
            let rowClass = 'status-absent';
            
            if (student.status === AttendanceStatus.TRUANT) { statusText = 'تسرب حصة'; rowClass = 'status-truant'; } 
            else if (student.status === AttendanceStatus.ESCAPE) { statusText = 'تسرب مدرسة'; rowClass = 'status-truant'; }
            
            return `<tr class="${rowClass}">
                <td>${globalIndex}</td>
                <td style="text-align: right; font-weight: bold;">${student.name}</td>
                <td>${student.gradeName} / ${student.className}</td>
                <td>${statusText}</td>
                <td>${student.parentPhone}</td>
            </tr>`;
        }).join('');

        return `
            <div class="print-page">
                <div class="print-header">
                    <h1 class="print-title">${schoolName}</h1>
                    <div class="print-subtitle">تقرير الغياب والتسرب اليومي</div>
                    <div class="print-meta"><span>التاريخ: ${date}</span><span>الإجمالي: ${allAbsentStudents.length}</span></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="40">#</th>
                            <th>اسم الطالب</th>
                            <th>الصف / الشعبة</th>
                            <th>الحالة</th>
                            <th>رقم ولي الأمر</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="footer-sig">
                    <div>مسؤول السجل</div>
                    <div>مدير المدرسة</div>
                </div>
                <div class="page-number">صفحة ${pageIndex + 1} من ${studentChunks.length}</div>
            </div>
        `;
    }).join('');
};

// 3. واجهة طباعة كشف الحضور (لصف واحد)
export const generateAttendanceSheetHTML = (
  schoolName: string, gradeName: string, className: string, date: string,
  students: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    return generateSingleClassHTML(schoolName, gradeName, className, date, students, attendanceData);
};

// 4. واجهة طباعة تقرير شامل (لجميع الفصول)
export const generateGradeDailyReportHTML = (
    schoolName: string, gradeName: string, date: string,
    classesData: { className: string, students: Student[] }[],
    attendanceData: Record<string, AttendanceStatus>
) => {
    // تكرار العملية لكل فصل دراسي
    return classesData.map((cls) => {
        return generateSingleClassHTML(schoolName, gradeName, cls.className, date, cls.students, attendanceData);
    }).join('');
};

// 5. تقرير إحصائي للفصل (أعداد الغياب لكل طالب خلال فترة)
export const generateClassPeriodReportHTML = (
  schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]
) => {
  const sortedStats = [...stats].sort((a, b) => (b.absentCount + b.truantCount + b.escapeCount) - (a.absentCount + a.truantCount + a.escapeCount));
  const statChunks = chunkArray(sortedStats, ROWS_PER_PAGE);

  return statChunks.map((chunk, pageIndex) => {
      const rows = chunk.map((stat, index) => {
        const globalIndex = (pageIndex * ROWS_PER_PAGE) + index + 1;
        const totalViolations = stat.absentCount + stat.truantCount + stat.escapeCount;
        const rowClass = totalViolations > 0 ? '' : 'text-gray-400';
        return `<tr class="${rowClass}"><td>${globalIndex}</td><td style="text-align: right; font-weight: bold;">${stat.student.name}</td><td>${stat.absentCount}</td><td>${stat.truantCount}</td><td>${stat.escapeCount}</td><td style="font-weight: bold;">${totalViolations}</td></tr>`;
      }).join('');

      return `
        <div class="print-page">
            <div class="print-header">
            <h1 class="print-title">${schoolName}</h1>
            <div class="print-subtitle">تقرير إحصائي للفصل</div>
            <div class="print-meta"><span>الفترة: ${startDate} إلى ${endDate}</span><span>الصف: ${gradeName} / ${className}</span></div>
            </div>
            <table><thead><tr><th width="40">#</th><th>اسم الطالب</th><th>غياب</th><th>تسرب حصة</th><th>تسرب مدرسة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="footer-sig"><div>الأخصائي الاجتماعي</div><div>مدير المدرسة</div></div>
            <div class="page-number">صفحة ${pageIndex + 1} من ${statChunks.length}</div>
        </div>
      `;
  }).join('');
};

// 6. تقرير حالة طالب (سجل الطالب)
export const generateStudentReportHTML = (
  schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string
) => {
  const STUDENT_ROWS = 10; // عدد أقل للطالب لأنه يحتوي على تفاصيل نصية أكثر
  const recordChunks = records.length > 0 ? chunkArray(records, STUDENT_ROWS) : [[]];

  return recordChunks.map((chunk, pageIndex) => {
      const recordsRows = chunk.length === 0 
      ? `<tr><td colspan="4">لا توجد سجلات غياب أو تسرب لهذا الطالب خلال الفترة المحددة.</td></tr>`
      : chunk.map((record, index) => {
        const globalIndex = (pageIndex * STUDENT_ROWS) + index + 1;
        let statusText = '', rowClass = '', details = '';
        if (record.status === AttendanceStatus.ABSENT) { statusText = 'غائب'; rowClass = 'status-absent'; } 
        else if (record.status === AttendanceStatus.TRUANT) { statusText = 'تسرب من الحصة'; rowClass = 'status-truant'; if (record.period) details = `حصة: ${record.period}`; } 
        else if (record.status === AttendanceStatus.ESCAPE) { statusText = 'تسرب من المدرسة'; rowClass = 'status-truant'; if (record.note) details = `ملاحظة: ${record.note}`; }
        return `<tr class="${rowClass}"><td>${globalIndex}</td><td>${record.date}</td><td>${statusText}</td><td style="font-size: 10px;">${details}</td></tr>`;
      }).join('');

      return `
        <div class="print-page">
            <div class="print-header">
            <h1 class="print-title">${schoolName}</h1>
            <div class="print-subtitle">تقرير حالة طالب</div>
            <div class="print-meta"><span>الطالب: ${studentName}</span><span>الصف: ${gradeName} / ${className}</span></div>
            </div>
            ${pageIndex === 0 ? `<div style="margin: 10px 0; font-weight:bold;">${periodText}</div>` : ''}
            <table><thead><tr><th width="40">#</th><th width="100">التاريخ</th><th>الحالة</th><th>تفاصيل</th></tr></thead><tbody>${recordsRows}</tbody></table>
            <div class="footer-sig" style="bottom: 15mm;"><div>توقيع ولي الأمر بالعلم</div><div>الأخصائي الاجتماعي</div></div>
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
    
    if (isFullGrade && classesData.length > 0) {
        html = generateGradeDailyReportHTML(schoolName, gradeName, date, classesData, attendanceData);
        fName = `تقرير_شامل_${gradeName}_${date}`;
    } else {
        html = generateAttendanceSheetHTML(schoolName, gradeName, className, date, students, attendanceData);
        fName = `كشف_غياب_${className}_${date}`;
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
      const stampHtml = assets?.schoolStamp ? `<div style="text-align: center;"><img src="${assets.schoolStamp}" style="width: 120px; opacity: 0.8;" /></div>` : ``;
      const headerLogoHtml = assets?.headerLogo ? `<img src="${assets.headerLogo}" alt="الشعار" style="height: 80px; width: auto; margin: 0 auto; display: block;" />` : ``;
    
      const html = `
        <div class="print-page" style="border: none;">
            <div style="border: 4px double #000; padding: 40px; height: 100%; box-sizing: border-box; position: relative;">
                <div style="text-align: center; margin-bottom: 40px; line-height: 1.6; color: #000; direction: rtl;">
                <div style="margin-bottom: 10px;">${headerLogoHtml}</div>
                <div style="font-size: 20px; font-weight: bold;">سلطنة عُمان</div>
                <div style="font-size: 20px; font-weight: bold;">وزارة التربية والتعليم</div>
                <div style="font-size: 18px; font-weight: bold;">المديرية العامة للتربية والتعليم لمحافظة ${districtName}</div>
                <div style="font-size: 18px; font-weight: bold;">مدرسة ${schoolName}</div>
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
                <div style="margin-top: 50px; padding: 0 20px; display: flex; justify-content: space-between; align-items: flex-end; position: relative;">
                    <div style="text-align: center; width: 220px; z-index: 2;"><p style="font-weight: bold; margin-bottom: 10px; font-size: 18px;">رئيس لجنة شؤون الطلبة</p>${committeeSigHtml}</div>
                    <div style="position: absolute; left: 50%; transform: translateX(-50%); bottom: 10px; z-index: 1;">${stampHtml}</div>
                    <div style="text-align: center; width: 220px; z-index: 2;"><p style="font-weight: bold; margin-bottom: 10px; font-size: 18px;">مدير المدرسة</p>${principalSigHtml}</div>
                </div>
            </div>
        </div>
      `;
      executeOutputStrategy(html, `استدعاء_${studentName}`);
};
