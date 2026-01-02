import { AttendanceStatus, Student } from '../types';

/**
 * دالة الطباعة الأساسية - الحل الجذري
 * تقوم هذه الدالة بحقن تنسيقات CSS خاصة تخفي واجهة التطبيق بالكامل
 * وتظهر فقط تقرير الطباعة عند الضغط على زر طباعة أو Ctrl+P
 */
const printHTML = (contentBody: string) => {
  // 1. التأكد من وجود حاوية الطباعة أو إنشائها
  let printContainer = document.getElementById('print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    document.body.appendChild(printContainer);
  }
  
  // 2. وضع المحتوى داخل الحاوية
  printContainer.innerHTML = contentBody;

  // 3. إضافة تنسيقات الطباعة الإجبارية (تكتب مرة واحدة فقط)
  if (!document.getElementById('print-css-rules')) {
    const style = document.createElement('style');
    style.id = 'print-css-rules';
    style.textContent = `
      @media screen {
        #print-container { display: none; }
      }
      @media print {
        /* إخفاء كل شيء في الصفحة */
        body > *:not(#print-container) { display: none !important; }
        
        /* إعدادات الصفحة */
        @page { 
          size: A4; 
          margin: 10mm; 
        }
        
        /* إظهار حاوية الطباعة فقط وتنسيقها */
        #print-container {
          display: block !important;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          background-color: white;
          color: black;
          font-family: 'Tajawal', sans-serif;
          direction: rtl;
          z-index: 9999;
        }

        /* تنسيقات الجدول والتقرير */
        .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
        .print-title { font-size: 24px; font-weight: 800; margin: 0; }
        .print-subtitle { font-size: 16px; color: #444; margin-top: 5px; }
        .print-meta { display: flex; justify-content: space-between; margin-top: 20px; font-weight: bold; font-size: 14px; border: 1px solid #000; padding: 10px; border-radius: 5px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; font-weight: bold; }
        
        .status-absent { background-color: #ffe4e6 !important; -webkit-print-color-adjust: exact; font-weight: bold; }
        .status-truant { background-color: #fef3c7 !important; -webkit-print-color-adjust: exact; }
        
        .footer-sig { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
  }

  // 4. استدعاء أمر الطباعة (بعد مهلة قصيرة جداً لضمان تحديث DOM)
  setTimeout(() => {
    window.print();
  }, 100);
};

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
    let rowClass = '';
    
    if (status === AttendanceStatus.ABSENT) {
       statusText = 'غائب';
       rowClass = 'status-absent';
    } else if (status === AttendanceStatus.TRUANT) {
       statusText = 'تسرب';
       rowClass = 'status-truant';
    } else if (status === AttendanceStatus.ESCAPE) {
       statusText = 'هروب';
       rowClass = 'status-truant';
    }
    
    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td style="text-align: right; font-weight: bold;">${student.name}</td>
        <td>${statusText}</td>
        <td></td>
      </tr>
    `;
  }).join('');

  const html = `
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
      <thead>
        <tr>
          <th width="50">#</th>
          <th>اسم الطالب</th>
          <th width="100">الحالة</th>
          <th>ملاحظات المعلم</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    
    <div class="footer-sig">
      <div>توقيع المعلم: ....................</div>
      <div>ختم الإدارة: ....................</div>
    </div>
  `;

  printHTML(html);
};

export const printDailyReport = (
  schoolName: string,
  date: string,
  reportText: string
) => {
  const html = `
    <div class="print-header">
      <h1 class="print-title">${schoolName}</h1>
      <div class="print-subtitle">التقرير الإداري الذكي</div>
      <div class="print-meta" style="justify-content: center">
        <span>تاريخ التقرير: ${date}</span>
      </div>
    </div>
    
    <div style="font-size: 16px; line-height: 2; text-align: justify; padding: 20px; border: 1px solid #000; border-radius: 8px; margin-top: 30px; min-height: 400px;">
      ${reportText.replace(/\n/g, '<br>')}
    </div>
    
    <div class="footer-sig" style="margin-top: 80px;">
      <div>مدير المدرسة</div>
      <div>يعتمد،</div>
    </div>
  `;

  printHTML(html);
};