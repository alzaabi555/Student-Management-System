
import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { StudentPeriodStats, SchoolAssets } from './dataService';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * دالة الطباعة باستخدام Iframe
 * هذه الطريقة أكثر توافقاً مع الهواتف والتابلت لأنها تعزل محتوى الطباعة في نافذة مستقلة
 */
const printHTML = (contentBody: string) => {
  // 1. إنشاء Iframe مخفي
  const iframe = document.createElement('iframe');
  
  // إعدادات الستايل لضمان عدم ظهور الـ Iframe في الشاشة ولكن بقائه متاحاً للطباعة
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  // مهم جداً للأندرويد: يجب أن يكون جزءاً من الـ DOM
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  // 2. كتابة محتوى التقرير داخل الـ Iframe
  doc.open();
  doc.write(getReportHTMLStructure(contentBody));
  doc.close();

  // 3. تنفيذ أمر الطباعة بعد مهلة قصيرة
  setTimeout(() => {
    if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        try {
            iframe.contentWindow.print();
        } catch (e) {
            console.error("Print error:", e);
            alert("حدث خطأ أثناء محاولة الطباعة. يرجى المحاولة مرة أخرى.");
        }
    }
    
    // إزالة الـ Iframe بعد فترة
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000); 
  }, 500);
};

// هيكل HTML الموحد للتقارير (للطباعة وللمشاركة)
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
        
        .footer-sig { margin-top: 80px; display: flex; justify-content: space-between; page-break-inside: avoid; padding: 0 50px; }

        @media print {
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
`;

/**
 * دالة جديدة لمشاركة التقرير كـ PDF (بلوتوث، واتساب، إلخ)
 */
export const shareHTMLAsPDF = async (contentBody: string, fileName: string) => {
    // 1. إنشاء حاوية مؤقتة للرسم
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '0';
    container.style.width = '210mm'; // عرض A4
    container.style.minHeight = '297mm';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-100';
    
    // استخدام نفس الهيكل والتنسيقات
    container.innerHTML = getReportHTMLStructure(contentBody);
    document.body.appendChild(container);

    try {
        // انتظار بسيط لضمان تحميل التنسيقات
        await new Promise(resolve => setTimeout(resolve, 500));

        // 2. تحويل HTML إلى صورة (Canvas)
        const canvas = await html2canvas(container, {
            scale: 2, // جودة عالية
            useCORS: true,
            logging: false
        });

        // 3. تحويل الصورة إلى PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // 4. الحفظ والمشاركة
        if (Capacitor.isNativePlatform()) {
            const base64Data = pdf.output('datauristring').split(',')[1];
            const safeFileName = `${fileName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

            // حفظ الملف في الذاكرة المؤقتة للجهاز
            await Filesystem.writeFile({
                path: safeFileName,
                data: base64Data,
                directory: Directory.Cache
            });

            // الحصول على مسار الملف
            const uriResult = await Filesystem.getUri({
                directory: Directory.Cache,
                path: safeFileName
            });

            // فتح نافذة المشاركة الأصلية (Share Sheet)
            await Share.share({
                title: fileName,
                text: `مرفق تقرير: ${fileName}`,
                url: uriResult.uri,
                dialogTitle: 'مشاركة التقرير عبر' // سيظهر خيار البلوتوث هنا
            });
        } else {
            // للويب المكتبي: تحميل مباشر
            pdf.save(`${fileName}.pdf`);
        }

    } catch (error) {
        console.error("Error sharing PDF:", error);
        alert("حدث خطأ أثناء محاولة إنشاء ملف المشاركة.");
    } finally {
        // تنظيف
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};

// --- دوال تجهيز المحتوى (تُستخدم للطباعة وللمشاركة) ---

export const generateAttendanceSheetHTML = (
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
        <div class="print-header">
        <h1 class="print-title">${schoolName}</h1>
        <div class="print-subtitle">نظام المتابعة اليومية</div>
        <div class="print-meta"><span>التاريخ: ${date}</span><span>الصف: ${gradeName}</span><span>الفصل: ${className}</span></div>
        </div>
        <table><thead><tr><th width="50">#</th><th>اسم الطالب</th><th width="150">الحالة</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="footer-sig"><div>توقيع المعلم: ....................</div><div>ختم الإدارة: ....................</div></div>
    `;
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


// --- دوال التصدير القديمة (تم تعديلها لتستخدم الدوال المساعدة أعلاه) ---

export const printAttendanceSheet = (schoolName: string, gradeName: string, className: string, date: string, students: Student[], attendanceData: Record<string, AttendanceStatus>) => {
  printHTML(generateAttendanceSheetHTML(schoolName, gradeName, className, date, students, attendanceData));
};

export const printClassPeriodReport = (schoolName: string, gradeName: string, className: string, startDate: string, endDate: string, stats: StudentPeriodStats[]) => {
  printHTML(generateClassPeriodReportHTML(schoolName, gradeName, className, startDate, endDate, stats));
};

export const printStudentReport = (schoolName: string, studentName: string, gradeName: string, className: string, records: AttendanceRecord[], periodText?: string) => {
  printHTML(generateStudentReportHTML(schoolName, studentName, gradeName, className, records, periodText));
};

// Summon Letter (Already generates full HTML, just needs wrapper if we want to share it too)
export const printSummonLetter = (
    // ... params (kept same as before for compatibility, logic inside is same)
  schoolName: string, districtName: string, studentName: string, gradeName: string, className: string, date: string, time: string, reason: string, issueDate: string, assets?: SchoolAssets
) => {
    // ... (logic from previous implementation regarding HTML generation)
    // For brevity, assuming the full HTML generation logic is here as before, 
    // and passing it to printHTML. 
    // If you need sharing for SummonLetter, we'd extract its HTML generator too.
    // Given the user asked about "Reports" specifically, I will focus on the report functions above.
    // Re-implementing the printSummonLetter core logic briefly for completeness:
    
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
      printHTML(html);
};
