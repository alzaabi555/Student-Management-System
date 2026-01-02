
import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { StudentPeriodStats, SchoolAssets } from './dataService';

/**
 * دالة الطباعة الأساسية
 */
const printHTML = (contentBody: string) => {
  let printContainer = document.getElementById('print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    document.body.appendChild(printContainer);
  }
  
  printContainer.innerHTML = contentBody;

  if (!document.getElementById('print-css-rules')) {
    const style = document.createElement('style');
    style.id = 'print-css-rules';
    style.textContent = `
      @media screen {
        #print-container { display: none; }
      }
      @media print {
        body > *:not(#print-container) { display: none !important; }
        @page { size: A4; margin: 10mm; }
        #print-container {
          display: block !important;
          position: absolute;
          top: 0; left: 0; width: 100%;
          background-color: white; color: black;
          font-family: 'Tajawal', sans-serif; direction: rtl;
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
      }
    `;
    document.head.appendChild(style);
  }

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
  attendanceData: Record<string, AttendanceStatus>,
  attendanceRecords?: Record<string, AttendanceRecord>
) => {
  const rows = students.map((student, index) => {
    const status = attendanceData[student.id] || AttendanceStatus.PRESENT;
    let statusText = 'حاضر';
    let rowClass = '';
    
    if (status === AttendanceStatus.ABSENT) {
       statusText = 'غائب';
       rowClass = 'status-absent';
    } else if (status === AttendanceStatus.TRUANT) {
       statusText = 'تسرب من الحصة';
       rowClass = 'status-truant';
    } else if (status === AttendanceStatus.ESCAPE) {
       statusText = 'تسرب من المدرسة';
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
          <th width="150">الحالة</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer-sig">
      <div>توقيع المعلم: ....................</div>
      <div>ختم الإدارة: ....................</div>
    </div>
  `;
  printHTML(html);
};

export const printClassPeriodReport = (
  schoolName: string,
  gradeName: string,
  className: string,
  startDate: string,
  endDate: string,
  stats: StudentPeriodStats[]
) => {
  const sortedStats = [...stats].sort((a, b) => 
    (b.absentCount + b.truantCount + b.escapeCount) - (a.absentCount + a.truantCount + a.escapeCount)
  );

  const rows = sortedStats.map((stat, index) => {
    const totalViolations = stat.absentCount + stat.truantCount + stat.escapeCount;
    const rowClass = totalViolations > 0 ? '' : 'text-gray-400';
    
    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td style="text-align: right; font-weight: bold;">${stat.student.name}</td>
        <td>${stat.absentCount}</td>
        <td>${stat.truantCount}</td>
        <td>${stat.escapeCount}</td>
        <td style="font-weight: bold;">${totalViolations}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="print-header">
      <h1 class="print-title">${schoolName}</h1>
      <div class="print-subtitle">تقرير متابعة فصل (إحصائي)</div>
      <div class="print-meta">
        <span>الفترة: من ${startDate} إلى ${endDate}</span>
        <span>الصف: ${gradeName}</span>
        <span>الفصل: ${className}</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th width="50">#</th>
          <th>اسم الطالب</th>
          <th>عدد أيام الغياب</th>
          <th>تسرب من الحصة</th>
          <th>تسرب من المدرسة</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer-sig">
      <div>الأخصائي الاجتماعي: ....................</div>
      <div>مدير المدرسة: ....................</div>
    </div>
  `;
  printHTML(html);
};

export const printStudentReport = (
  schoolName: string,
  studentName: string,
  gradeName: string,
  className: string,
  records: AttendanceRecord[],
  periodText?: string
) => {
  const recordsRows = records.length === 0 
  ? `<tr><td colspan="4">لا توجد سجلات غياب أو تسرب لهذا الطالب خلال الفترة المحددة.</td></tr>`
  : records.map((record, index) => {
    let statusText = '';
    let rowClass = '';
    let details = '';
    
    if (record.status === AttendanceStatus.ABSENT) {
       statusText = 'غائب';
       rowClass = 'status-absent';
    } else if (record.status === AttendanceStatus.TRUANT) {
       statusText = 'تسرب من الحصة';
       rowClass = 'status-truant';
       if (record.period) details = `حصة: ${record.period}`;
    } else if (record.status === AttendanceStatus.ESCAPE) {
       statusText = 'تسرب من المدرسة';
       rowClass = 'status-truant';
       if (record.note) details = `ملاحظة: ${record.note}`;
    }
    
    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>${record.date}</td>
        <td>${statusText}</td>
        <td style="font-size: 10px;">${details}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="print-header">
      <h1 class="print-title">${schoolName}</h1>
      <div class="print-subtitle">تقرير حالة طالب</div>
      <div class="print-meta">
        <span>الطالب: ${studentName}</span>
        <span>${periodText || 'سجل كامل'}</span>
        <span>الفصل: ${className}</span>
      </div>
    </div>
    <div style="margin: 20px 0;"><h3>سجل المخالفات (غياب / تسرب):</h3></div>
    <table>
      <thead>
        <tr>
          <th width="50">#</th>
          <th width="120">التاريخ</th>
          <th>الحالة</th>
          <th>تفاصيل</th>
        </tr>
      </thead>
      <tbody>${recordsRows}</tbody>
    </table>
    <div class="footer-sig" style="margin-top: 60px;">
      <div>توقيع ولي الأمر بالعلم: ....................</div>
      <div>الأخصائي الاجتماعي: ....................</div>
    </div>
  `;
  printHTML(html);
};

export const printSummonLetter = (
  schoolName: string,
  districtName: string,
  studentName: string,
  gradeName: string,
  className: string,
  date: string,
  time: string,
  reason: string,
  issueDate: string,
  assets?: SchoolAssets
) => {
  
  const committeeSigHtml = assets?.committeeSig 
    ? `<img src="${assets.committeeSig}" style="height: 60px; display: block; margin: 10px auto;" />` 
    : `<p style="margin-top: 40px;">.........................</p>`;

  const principalSigHtml = assets?.principalSig 
    ? `<img src="${assets.principalSig}" style="height: 60px; display: block; margin: 10px auto;" />` 
    : `<p style="margin-top: 40px;">.........................</p>`;

  const stampHtml = assets?.schoolStamp
    ? `<div style="text-align: center;"><img src="${assets.schoolStamp}" style="width: 120px; opacity: 0.8;" /></div>`
    : ``;

  const headerLogoHtml = assets?.headerLogo 
    ? `<img src="${assets.headerLogo}" alt="الشعار" style="height: 80px; width: auto; margin: 0 auto; display: block;" />`
    : `<img src="/assets/logo.png" alt="الشعار" style="height: 80px; width: auto; margin: 0 auto; display: block;" />`;

  const html = `
    <div style="border: 4px double #000; padding: 40px; margin: 0 auto; height: 98vh; box-sizing: border-box; position: relative; background: #fff;">
        
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

            <div style="text-align: center; margin: 30px 0; font-weight: bold; font-size: 22px; text-decoration: underline; text-underline-offset: 8px;">
                السلام علیکم ورحمة الله وبرکاته
            </div>
            
            <div style="text-align: justify; text-align-last: right;">
                <p style="margin-bottom: 10px;">
                    نظراً لأهمية التعاون بين المدرسة وولي الأمر فيما يخدم مصلحة الطالب، ويحقق له النجاح، نأمل منكم الحضور إلى المدرسة لبحث بعض الأمور المتعلقة بابنكم:
                </p>
                <div style="text-align: center; margin: 25px 0; font-weight: bold; font-size: 20px;">
                    ( ${reason} )
                </div>
                <p>
                    ولنا في حضوركم أمل بهدف التعاون بين البيت والمدرسة لتحقيق الرسالة التربوية الهادفة التي نسعى إليها، وتأمل المدرسة حضوركم في أقرب فرصة ممكنة لديكم.
                </p>
            </div>

            <p style="margin-top: 30px; font-size: 16px; color: #555; text-align: center; border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #fafafa;">
               * الموعد المقترح: يوم <strong>${date}</strong> الساعة <strong>${time}</strong>.
            </p>

            <p style="margin-top: 30px; font-weight: bold; text-align: center;">
                شاكرين لكم حسن تعاونكم وتجاوبكم معنا لتحقيق مصلحة الطالب
            </p>
        </div>

        <div style="margin-top: 50px; padding: 0 20px; display: flex; justify-content: space-between; align-items: flex-end; position: relative;">
            <div style="text-align: center; width: 220px; z-index: 2;">
                <p style="font-weight: bold; margin-bottom: 10px; font-size: 18px;">رئيس لجنة شؤون الطلبة بالمدرسة</p>
                ${committeeSigHtml}
            </div>
            <div style="position: absolute; left: 50%; transform: translateX(-50%); bottom: 10px; z-index: 1;">
                 ${stampHtml}
            </div>
            <div style="text-align: center; width: 220px; z-index: 2;">
                <p style="font-weight: bold; margin-bottom: 10px; font-size: 18px;">مدير المدرسة</p>
                ${principalSigHtml}
            </div>
        </div>
    </div>
  `;
  printHTML(html);
};
