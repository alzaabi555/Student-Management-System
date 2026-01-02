import { AttendanceStatus, Student } from '../types';

/**
 * دالة الطباعة الأساسية باستخدام CSS Injection
 * تقوم بإخفاء محتوى التطبيق وإظهار محتوى الطباعة فقط
 */
const printHTML = (contentBody: string) => {
  // 1. إنشاء حاوية الطباعة
  const printContainer = document.createElement('div');
  printContainer.id = 'print-container';
  printContainer.className = 'print-content';
  printContainer.innerHTML = contentBody;
  document.body.appendChild(printContainer);

  // 2. إضافة تنسيقات الطباعة الإجبارية
  const style = document.createElement('style');
  style.id = 'print-style';
  style.textContent = `
    @media screen {
        #print-container { display: none; }
    }
    @media print {
        /* إخفاء جميع عناصر الصفحة الأساسية */
        body > *:not(#print-container) { display: none !important; }
        
        /* إظهار وتنسيق حاوية الطباعة */
        #print-container {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 99999;
            background: white;
            color: black;
            direction: rtl;
        }

        /* إعدادات الصفحة */
        @page { size: A4; margin: 10mm; }
        body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        
        /* تنسيقات العناصر الداخلية */
        .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
        .print-h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: #000; }
        .print-h2 { margin: 0; font-size: 18px; color: #333; font-weight: 700; }
        .print-meta { display: flex; justify-content: space-between; margin-top: 15px; font-weight: bold; font-size: 16px; border-top: 1px dashed #ccc; padding-top: 10px; }
        
        .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; direction: rtl; }
        .print-th, .print-td { border: 1px solid #000; padding: 8px; font-size: 14px; text-align: center; }
        .print-th { background-color: #f3f4f6 !important; font-weight: bold; color: #000; }
        .print-td-name { text-align: right; font-weight: bold; }
        
        .print-footer { margin-top: 50px; display: flex; justify-content: space-between; font-weight: bold; padding: 0 50px; direction: rtl; page-break-inside: avoid; }
        .print-report-body { font-size: 16px; line-height: 2; text-align: justify; padding: 20px; border: 1px solid #eee; border-radius: 10px; margin-bottom: 30px; }
        
        /* Font Fix */
        .print-content { font-family: 'Tajawal', sans-serif !important; }
    }
  `;
  document.head.appendChild(style);

  // 3. تنفيذ الطباعة بعد مهلة قصيرة لضمان تحميل العناصر
  setTimeout(() => {
    window.print();
    
    // 4. تنظيف الصفحة بعد إغلاق نافذة الطباعة
    // نستخدم مهلة طويلة نسبياً لأن بعض المتصفحات توقف تنفيذ الجافاسكريبت أثناء فتح نافذة الطباعة
    setTimeout(() => {
        document.body.removeChild(printContainer);
        document.head.removeChild(style);
    }, 1000);
  }, 100);
};

/**
 * طباعة كشف الحضور
 */
export const printAttendanceSheet = (
  schoolName: string,
  gradeName: string,
  className: string,
  date: string,
  students: Student[],
  attendanceData: Record<string, AttendanceStatus>
) => {
  const rows = students.map((student, index) => {
    const status = attendanceData[student.id] || AttendanceStatus.PRESENT;
    let statusText = 'حاضر';
    if (status === AttendanceStatus.ABSENT) statusText = 'غائب';
    if (status === AttendanceStatus.TRUANT) statusText = 'تسرب';
    if (status === AttendanceStatus.ESCAPE) statusText = 'هروب';
    
    return `
      <tr>
        <td class="print-td">${index + 1}</td>
        <td class="print-td print-td-name">${student.name}</td>
        <td class="print-td">${statusText}</td>
        <td class="print-td"></td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <div class="print-header">
      <h1 class="print-h1">${schoolName}</h1>
      <h2 class="print-h2">كشف متابعة الغياب اليومي</h2>
      <div class="print-meta">
        <span>التاريخ: ${date}</span>
        <span>الصف: ${gradeName}</span>
        <span>الفصل: ${className}</span>
      </div>
    </div>
    
    <table class="print-table">
      <thead>
        <tr>
          <th class="print-th" width="50">#</th>
          <th class="print-th">اسم الطالب</th>
          <th class="print-th" width="120">حالة الحضور</th>
          <th class="print-th" width="200">ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    
    <div class="print-footer">
      <div>توقيع المعلم: ..........................</div>
      <div>يعتمد، مدير المدرسة: ..........................</div>
    </div>
  `;

  printHTML(htmlContent);
};

/**
 * طباعة التقرير الذكي
 */
export const printDailyReport = (
  schoolName: string,
  date: string,
  reportText: string
) => {
  const formattedText = reportText.replace(/\n/g, '<br/>');

  const htmlContent = `
    <div class="print-header">
      <h1 class="print-h1">${schoolName}</h1>
      <h2 class="print-h2">تقرير الحضور الذكي</h2>
      <div class="print-meta" style="justify-content: center;">
        <span>تاريخ التقرير: ${date}</span>
      </div>
    </div>
    
    <div class="print-report-body">
      ${formattedText}
    </div>
    
    <div class="print-footer" style="margin-top: 80px;">
      <div>مدير المدرسة: ..........................</div>
      <div>الختم الرسمي:</div>
    </div>
  `;

  printHTML(htmlContent);
};