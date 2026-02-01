
import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { StudentPeriodStats, SchoolAssets } from './dataService';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * دالة الطباعة الذكية
 */
const printHTML = async (contentBody: string, title: string = 'تقرير') => {
  if (Capacitor.isNativePlatform()) {
      try {
        await shareHTMLAsPDF(contentBody, title);
      } catch (e) {
        console.error("Android Print Error", e);
        alert("حدث خطأ أثناء تحضير الملف للطباعة.");
      }
      return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(getReportHTMLStructure(contentBody));
  doc.close();

  setTimeout(() => {
    if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        try {
            iframe.contentWindow.print();
        } catch (e) {
            console.error("Print error:", e);
        }
    }
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000); 
  }, 500);
};

// هيكل HTML الموحد
const getReportHTMLStructure = (bodyContent: string) => `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
        
        body { 
            font-family: 'Tajawal', sans-serif; 
            background-color: white; 
            color: black; 
            margin: 0;
            padding: 20px;
            direction: rtl;
        }

        .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
        .print-title { font-size: 24px; font-weight: 800; margin: 0; }
        .print-subtitle { font-size: 16px; color: #444; margin-top: 5px; }
        .print-meta { display: flex; justify-content: space-between; margin-top: 20px; font-weight: bold; font-size: 14px; border: 1px solid #000; padding: 10px; border-radius: 5px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; font-weight: bold; }
        
        .status-absent { background-color: #ffe4e6 !important; -webkit-print-color-adjust: exact; font-weight: bold; }
        .status-truant { background-color: #fef3c7 !important; -webkit-print-color-adjust: exact; }
        
        /* فواصل الصفحات للطباعة المتعددة */
        .page-break { page-break-after: always; display: block; height: 1px; margin: 30px 0; border-bottom: 1px dashed #ccc; }
        .report-section { margin-bottom: 40px; page-break-inside: avoid; }

        .footer-sig { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; padding: 0 50px; }

        @media print {
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { border: none; height: 0; }
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
`;

/**
 * دالة توليد PDF ذكية تدعم تعدد الصفحات
 */
export const shareHTMLAsPDF = async (contentBody: string, fileName: string) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '0';
    container.style.width = '210mm'; // عرض A4 بالضبط
    container.style.minHeight = '297mm';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-100';
    
    container.innerHTML = getReportHTMLStructure(contentBody);
    document.body.appendChild(container);

    try {
        await new Promise(resolve => setTimeout(resolve, 800)); // انتظار أطول قليلاً للرندر

        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 794 // تقريباً عرض A4 بالبكسل عند 96 DPI
        });

        const imgData = canvas.toDataURL('image/png');
        
        // إعدادات PDF للصفحات المتعددة
        const imgWidth = 210; // مم (عرض A4)
        const pageHeight = 295; // مم (ارتفاع A4 - هامش بسيط)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        const pdf = new jsPDF('p', 'mm', 'a4');

        // الصفحة الأولى
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // باقي الصفحات (إذا كان المحتوى طويلاً)
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        if (Capacitor.isNativePlatform()) {
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
                text: `تقرير: ${fileName}`,
                url: uriResult.uri,
                dialogTitle: 'طباعة / مشاركة التقرير' 
            });
        } else {
            pdf.save(`${fileName}.pdf`);
        }

    } catch (error) {
        console.error("Error sharing PDF:", error);
        alert("حدث خطأ أثناء محاولة إنشاء ملف التقرير.");
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};

// --- المولدات ---

// توليد تقرير لفصل واحد
const generateSingleClassHTML = (
    schoolName: string, gradeName: string, className: string, date: string,
    students: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    const rows = students.map((student, index) => {
        const status = attendanceData[student.id] || AttendanceStatus.PRESENT;
        let statusText = 'حاضر';
        let rowClass = '';
        
        if (status === AttendanceStatus.ABSENT) { statusText = 'غائب'; rowClass = 'status-absent'; } 
        else if (status === AttendanceStatus.TRUANT) { statusText = 'تسرب من الحصة'; rowClass = 'status-truant'; } 
        else if (status === AttendanceStatus.ESCAPE) { statusText = 'تسرب من المدرسة'; rowClass = 'status-truant'; }
        
        return `<tr class="${rowClass}"><td>${index + 1}</td><td style="text-align: right; font-weight: bold;">${student.name}</td><td>${statusText}</td><td></td></tr>`;
    }).join('');

    return `
        <div class="report-section">
            <div class="print-header">
                <h1 class="print-title">${schoolName}</h1>
                <div class="print-subtitle">نظام المتابعة اليومية</div>
                <div class="print-meta"><span>التاريخ: ${date}</span><span>الصف: ${gradeName}</span><span>الفصل: ${className}</span></div>
            </div>
            <table><thead><tr><th width="50">#</th><th>اسم الطالب</th><th width="150">الحالة</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="footer-sig"><div>توقيع المعلم: ....................</div><div>ختم الإدارة: ....................</div></div>
        </div>
    `;
};

// الدالة المستخدمة من الخارج للطباعة (فصل واحد أو عدة فصول)
export const generateAttendanceSheetHTML = (
  schoolName: string, gradeName: string, className: string, date: string,
  students: Student[], attendanceData: Record<string, AttendanceStatus>
) => {
    return generateSingleClassHTML(schoolName, gradeName, className, date, students, attendanceData);
};

// دالة جديدة: توليد تقرير للصف كاملاً (عدة فصول)
export const generateGradeDailyReportHTML = (
    schoolName: string, gradeName: string, date: string,
    classesData: { className: string, students: Student[] }[],
    attendanceData: Record<string, AttendanceStatus>
) => {
    // نقوم بتوليد HTML لكل فصل ونضع بينهم فاصل صفحات
    return classesData.map((cls, index) => {
        const classHtml = generateSingleClassHTML(schoolName, gradeName, cls.className, date, cls.students, attendanceData);
        // إضافة فاصل صفحات بعد كل فصل ما عدا الأخير
        return index < classesData.length - 1 
            ? `${classHtml}<div class="page-break"></div>` 
            : classHtml;
    }).join('');
};

export const generateClassPeriodReportHTML = (
  schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]
) => {
  const sortedStats = [...stats].sort((a, b) => (b.absentCount + b.truantCount + b.escapeCount) - (a.absentCount + a.truantCount + a.escapeCount));
  const rows = sortedStats.map((stat, index) => {
    const totalViolations = stat.absentCount + stat.truantCount + stat.escapeCount;
    const rowClass = totalViolations > 0 ? '' : 'text-gray-400';
    return `<tr class="${rowClass}"><td>${index + 1}</td><td style="text-align: right; font-weight: bold;">${stat.student.name}</td><td>${stat.absentCount}</td><td>${stat.truantCount}</td><td>${stat.escapeCount}</td><td style="font-weight: bold;">${totalViolations}</td></tr>`;
  }).join('');

  return `
    <div class="print-header">
      <h1 class="print-title">${schoolName}</h1>
      <div class="print-subtitle">تقرير متابعة فصل (إحصائي)</div>
      <div class="print-meta"><span>الفترة: من ${startDate} إلى ${endDate}</span><span>الصف: ${gradeName}</span><span>الفصل: ${className}</span></div>
    </div>
    <table><thead><tr><th width="50">#</th><th>اسم الطالب</th><th>عدد أيام الغياب</th><th>تسرب من الحصة</th><th>تسرب من المدرسة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer-sig"><div>الأخصائي الاجتماعي: ....................</div><div>مدير المدرسة: ....................</div></div>
  `;
};

export const generateStudentReportHTML = (
  schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string
) => {
  const recordsRows = records.length === 0 
  ? `<tr><td colspan="4">لا توجد سجلات غياب أو تسرب لهذا الطالب خلال الفترة المحددة.</td></tr>`
  : records.map((record, index) => {
    let statusText = '', rowClass = '', details = '';
    if (record.status === AttendanceStatus.ABSENT) { statusText = 'غائب'; rowClass = 'status-absent'; } 
    else if (record.status === AttendanceStatus.TRUANT) { statusText = 'تسرب من الحصة'; rowClass = 'status-truant'; if (record.period) details = `حصة: ${record.period}`; } 
    else if (record.status === AttendanceStatus.ESCAPE) { statusText = 'تسرب من المدرسة'; rowClass = 'status-truant'; if (record.note) details = `ملاحظة: ${record.note}`; }
    return `<tr class="${rowClass}"><td>${index + 1}</td><td>${record.date}</td><td>${statusText}</td><td style="font-size: 10px;">${details}</td></tr>`;
  }).join('');

  return `
    <div class="print-header">
      <h1 class="print-title">${schoolName}</h1>
      <div class="print-subtitle">تقرير حالة طالب</div>
      <div class="print-meta"><span>الطالب: ${studentName}</span><span>${periodText || 'سجل كامل'}</span><span>الفصل: ${className}</span></div>
    </div>
    <div style="margin: 20px 0;"><h3>سجل المخالفات (غياب / تسرب):</h3></div>
    <table><thead><tr><th width="50">#</th><th width="120">التاريخ</th><th>الحالة</th><th>تفاصيل</th></tr></thead><tbody>${recordsRows}</tbody></table>
    <div class="footer-sig" style="margin-top: 60px;"><div>توقيع ولي الأمر بالعلم: ....................</div><div>الأخصائي الاجتماعي: ....................</div></div>
  `;
};


// --- دوال التصدير ---

// طباعة كشف يومي (صف كامل أو فصل واحد)
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
    
    printHTML(html, fName);
};

export const printClassPeriodReport = (schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]) => {
  const html = generateClassPeriodReportHTML(schoolName, gradeName, className, startDate, endDate, stats);
  printHTML(html, `تقرير_فصل_${className}`);
};

export const printStudentReport = (schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string) => {
  const html = generateStudentReportHTML(schoolName, studentName, gradeName, className, records, periodText);
  printHTML(html, `تقرير_الطالب_${studentName}`);
};

export const printSummonLetter = (
  schoolName: string, districtName: string, studentName: string, gradeName: string, className: string, date: string, time: string, reason: string, issueDate: string, assets?: SchoolAssets
) => {
    
      const committeeSigHtml = assets?.committeeSig ? `<img src="${assets.committeeSig}" style="height: 60px; display: block; margin: 10px auto;" />` : `<p style="margin-top: 40px;">.........................</p>`;
      const principalSigHtml = assets?.principalSig ? `<img src="${assets.principalSig}" style="height: 60px; display: block; margin: 10px auto;" />` : `<p style="margin-top: 40px;">.........................</p>`;
      const stampHtml = assets?.schoolStamp ? `<div style="text-align: center;"><img src="${assets.schoolStamp}" style="width: 120px; opacity: 0.8;" /></div>` : ``;
      const headerLogoHtml = assets?.headerLogo ? `<img src="${assets.headerLogo}" alt="الشعار" style="height: 80px; width: auto; margin: 0 auto; display: block;" />` : `<img src="/assets/logo.png" alt="الشعار" style="height: 80px; width: auto; margin: 0 auto; display: block;" />`;
    
      const html = `
        <div style="border: 4px double #000; padding: 40px; margin: 0 auto; min-height: 90vh; box-sizing: border-box; position: relative; background: #fff;">
            <div style="text-align: center; margin-bottom: 40px; line-height: 1.8; color: #000; direction: rtl;">
              <div style="margin-bottom: 15px;">${headerLogoHtml}</div>
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
                    <div style="text-align: center; margin: 25px 0; font-weight: bold; font-size: 20px;">( ${reason} )</div>
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
      `;
      printHTML(html, `استدعاء_${studentName}`);
};
