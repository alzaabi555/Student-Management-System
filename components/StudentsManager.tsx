import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, User, Phone, Save, X, Layers, ArrowRight, Upload, FileSpreadsheet, Download, Filter, Share2 } from 'lucide-react';
import { students, grades, classes, addStudent, deleteStudent, addStudentsBulk } from '../services/dataService';
import { read, utils, write } from 'xlsx';
import { TableVirtuoso } from 'react-virtuoso';
import { Student } from '../types';

interface StudentsManagerProps {
  onNavigate: (page: string) => void;
}

const StudentsManager: React.FC<StudentsManagerProps> = ({ onNavigate }) => {
  // --- View State (Filtering) ---
  const [viewGradeId, setViewGradeId] = useState<string>('');
  const [viewClassId, setViewClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  
  // --- Add Form State ---
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  
  // --- Utilities ---
  const [forceUpdate, setForceUpdate] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization & Sync Logic ---

  // 1. Initialize View Filters (Select first grade/class on load)
  useEffect(() => {
    if (grades.length > 0 && !viewGradeId) {
        setViewGradeId(grades[0].id);
    }
  }, [grades.length, viewGradeId]);

  // 2. Get Classes for View Dropdown
  const viewClasses = useMemo(() => 
    classes.filter(c => c.gradeId === viewGradeId), 
  [viewGradeId, classes]);

  // 3. Auto-select first class when grade changes in View
  useEffect(() => {
    if (viewClasses.length > 0) {
        // Only change if current selected class is not valid for this grade
        if (!viewClasses.find(c => c.id === viewClassId)) {
            setViewClassId(viewClasses[0].id);
        }
    } else {
        setViewClassId('');
    }
  }, [viewClasses, viewClassId]);


  // --- Filtered Data ---
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      // STRICT FILTER: Must match selected class
      (viewClassId ? s.classId === viewClassId : false) &&
      // OPTIONAL SEARCH: Name or Phone
      (s.name.includes(searchTerm) || s.parentPhone.includes(searchTerm))
    );
  }, [viewClassId, searchTerm, forceUpdate, students]);

  // --- Add Modal Logic ---

  // Sync Modal Dropdowns with View Dropdowns when opening modal
  useEffect(() => {
    if (isModalOpen) {
        setNewStudentGrade(viewGradeId);
        setNewStudentClass(viewClassId);
    }
  }, [isModalOpen]);

  // Classes available in Modal (based on modal's grade selection)
  const modalClasses = useMemo(() => 
    classes.filter(c => c.gradeId === newStudentGrade), 
  [newStudentGrade, classes]);

  // Auto-select class in modal when grade changes
  useEffect(() => {
    if (isModalOpen && modalClasses.length > 0) {
        if (!modalClasses.find(c => c.id === newStudentClass)) {
            setNewStudentClass(modalClasses[0].id);
        }
    }
  }, [newStudentGrade, modalClasses]);


  // --- Handlers ---

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentClass) return;

    addStudent({
      name: newStudentName,
      parentPhone: newStudentPhone || '',
      gradeId: newStudentGrade,
      classId: newStudentClass
    });

    setNewStudentName('');
    setNewStudentPhone('');
    setIsModalOpen(false);
    setForceUpdate(prev => prev + 1);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);
      setIsProcessing(true);
      
      try {
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
        
        const preview = jsonData.slice(1).map((row: any) => ({
             name: row[0],
             phone: row[1] ? String(row[1]) : ''
        })).filter((item: any) => item.name);

        setImportPreview(preview);
      } catch (err) {
        console.error("Error reading excel", err);
        alert("حدث خطأ في قراءة الملف.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkImport = () => {
    if (!newStudentClass || importPreview.length === 0) return;

    const studentsToAdd = importPreview.map(item => ({
        name: item.name,
        parentPhone: item.phone || '',
        gradeId: newStudentGrade,
        classId: newStudentClass
    }));

    addStudentsBulk(studentsToAdd);
    
    setIsModalOpen(false);
    setImportFile(null);
    setImportPreview([]);
    setForceUpdate(prev => prev + 1);
    alert(`تم استيراد ${studentsToAdd.length} طالب بنجاح!`);
  };

  const downloadTemplate = () => {
    const ws = utils.aoa_to_sheet([["اسم الطالب", "رقم الجوال"], ["سالم علي", "99000000"]]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Students");
    const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_students.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      deleteStudent(id);
      setForceUpdate(prev => prev + 1);
    }
  };

  // --- WhatsApp Nuclear Solution ---
  const sendWhatsApp = async (student: Student) => {
    if (!student.parentPhone) {
        alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
        return;
    }

    const message = `السلام عليكم ولي أمر الطالب/ة ${student.name}. نود التواصل معكم من إدارة المدرسة.`;
    
    // استخدام بروتوكول التطبيق whatsapp://
    const url = `whatsapp://send?phone=968${student.parentPhone}&text=${encodeURIComponent(message)}`;
    
    // الحل النووي: استخدام IPC Bridge
    if (window.electron && window.electron.openExternal) {
       try {
         await window.electron.openExternal(url);
       } catch (err) {
         console.error('Failed to open WhatsApp:', err);
         alert('تعذر فتح واتساب. تأكد من تثبيت التطبيق.');
       }
    } else {
       // Fallback
       window.open(url, '_blank');
    }
  };

  // --- Render ---

  if (grades.length === 0) {
    return (
        <div className="p-4 md:p-6 h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center bg-white rounded-lg border border-gray-200 shadow-sm m-6">
            <div className="bg-gray-50 p-6 rounded-full mb-4">
                <Layers size={32} className="text-gray-400 md:w-12 md:h-12" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">لا يوجد هيكل مدرسي</h2>
            <p className="text-sm md:text-base text-gray-500 mb-8 max-w-md leading-relaxed">
                لا يمكنك إضافة طلاب قبل تهيئة النظام. يجب عليك أولاً إضافة الصفوف الدراسية والفصول.
            </p>
            <button 
              onClick={() => onNavigate('structure')}
              className="win-btn-primary flex items-center gap-2 text-sm md:text-base"
            >
              <span>الذهاب لإضافة الصفوف والفصول</span>
              <ArrowRight size={20} />
            </button>
        </div>
    );
  }

  return (
    <div className="p-3 md:p-6 h-[calc(100vh-80px)] flex flex-col">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
           <h2 className="text-xl md:text-2xl font-bold text-slate-800">إدارة الطلاب</h2>
           <p className="text-xs md:text-sm text-gray-500">عرض وتعديل بيانات الطلاب حسب الفصل</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <button 
            onClick={() => { setMode('SINGLE'); setIsModalOpen(true); }}
            disabled={classes.length === 0}
            className="flex-1 md:flex-none win-btn-primary flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-50"
            >
            <Plus size={18} />
            <span className="whitespace-nowrap">إضافة طلاب</span>
            </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-200/60 shadow-sm mb-4 flex flex-col md:flex-row gap-3 md:gap-4 items-center">
        <div className="flex items-center gap-2 w-full md:w-auto text-gray-700 font-medium text-xs md:text-sm whitespace-nowrap">
            <Filter size={16} className="text-primary" />
            <span>تصفية القائمة:</span>
        </div>
        
        <div className="flex gap-2 md:gap-4 w-full md:w-auto flex-1">
            <select 
                value={viewGradeId}
                onChange={(e) => setViewGradeId(e.target.value)}
                className="flex-1 md:w-48 p-2 bg-white border border-gray-300 rounded-[4px] text-xs md:text-sm focus:border-primary outline-none"
            >
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            
            <select 
                value={viewClassId}
                onChange={(e) => setViewClassId(e.target.value)}
                disabled={viewClasses.length === 0}
                className="flex-1 md:w-32 p-2 bg-white border border-gray-300 rounded-[4px] text-xs md:text-sm focus:border-primary outline-none disabled:bg-gray-100"
            >
                {viewClasses.length === 0 && <option value="">لا توجد فصول</option>}
                {viewClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="بحث داخل هذا الفصل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-white border border-gray-300 rounded-[4px] focus:outline-none focus:border-primary focus:border-b-2 transition-all text-xs md:text-sm"
          />
          <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
        </div>
      </div>

      {/* List - Virtualized with Win11 List Style */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {!viewClassId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                الرجاء اختيار صف وفصل لعرض الطلاب
            </div>
        ) : filteredStudents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد طلاب في هذا الفصل بعد'}
            </div>
        ) : (
            <TableVirtuoso
                style={{ height: '100%', direction: 'rtl' }}
                data={filteredStudents}
                fixedHeaderContent={() => (
                    <tr className="bg-gray-50/50 border-b border-gray-200 backdrop-blur-sm">
                        <th className="p-3 md:p-4 text-[11px] md:text-xs font-semibold text-gray-600 text-right w-1/3">اسم الطالب</th>
                        <th className="p-3 md:p-4 text-[11px] md:text-xs font-semibold text-gray-600 text-right w-1/3">ولي الأمر</th>
                        <th className="p-3 md:p-4 text-[11px] md:text-xs font-semibold text-gray-600 text-center w-1/3">إجراءات</th>
                    </tr>
                )}
                itemContent={(index, student) => (
                    <>
                        <td className="p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-gray-200">
                                    <User size={14} />
                                </div>
                                <span className="font-medium text-slate-800 text-xs md:text-sm truncate">{student.name}</span>
                            </div>
                        </td>
                        <td className="p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-1 md:gap-2 text-gray-500 text-[10px] md:text-sm">
                                <span>{student.parentPhone}</span>
                                <Phone size={12} className="md:w-3.5 md:h-3.5" />
                            </div>
                        </td>
                        <td className="p-3 md:p-4 text-center border-b border-gray-100 hover:bg-gray-50 transition-colors flex justify-center gap-2">
                            <button 
                                onClick={() => sendWhatsApp(student)}
                                className="p-1.5 md:p-2 text-green-600 hover:bg-green-50 rounded-[4px] border border-transparent hover:border-green-200 transition-all"
                                title="مراسلة ولي الأمر"
                            >
                                <Share2 size={16} className="md:w-4 md:h-4" />
                            </button>
                            <button 
                                onClick={() => handleDeleteStudent(student.id)}
                                className="p-1.5 md:p-2 text-red-500 hover:bg-red-50 rounded-[4px] border border-transparent hover:border-red-200 transition-all"
                                title="حذف الطالب"
                            >
                                <Trash2 size={16} className="md:w-4 md:h-4" />
                            </button>
                        </td>
                    </>
                )}
            />
        )}
        
        {viewClassId && filteredStudents.length > 0 && (
             <div className="p-2 md:p-3 bg-gray-50 border-t border-gray-200 text-[10px] md:text-xs text-gray-500 text-center">
                إجمالي الطلاب في هذا الفصل: {filteredStudents.length}
             </div>
        )}
      </div>

      {/* Add Modal - Windows 11 Dialog Style */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-flyout border border-gray-200 animate-scaleIn overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">إضافة طلاب</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:bg-gray-200 rounded p-1 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 shrink-0 p-1 bg-gray-50">
                <button 
                    onClick={() => setMode('SINGLE')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${mode === 'SINGLE' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <User size={16} />
                    إضافة فردية
                </button>
                <button 
                    onClick={() => setMode('BULK')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${mode === 'BULK' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileSpreadsheet size={16} />
                    استيراد إكسل
                </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto bg-white">
                {/* Location Selector (Common) */}
                <div className="bg-blue-50/30 p-3 md:p-4 rounded-lg border border-blue-100/50 mb-6">
                    <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-1">
                        <Layers size={14} />
                        المكان المستهدف
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">الصف</label>
                            <select 
                                value={newStudentGrade}
                                onChange={e => setNewStudentGrade(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-[4px] text-sm bg-white focus:border-primary outline-none"
                            >
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">الفصل</label>
                            <select 
                                value={newStudentClass}
                                onChange={e => setNewStudentClass(e.target.value)}
                                disabled={modalClasses.length === 0}
                                className="w-full p-2 border border-gray-300 rounded-[4px] text-sm bg-white focus:border-primary outline-none disabled:bg-gray-100"
                            >
                                {modalClasses.length === 0 && <option>لا توجد فصول</option>}
                                {modalClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {mode === 'SINGLE' ? (
                    <form onSubmit={handleAddStudent} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب رباعي</label>
                            <div className="relative">
                            <input 
                                type="text" 
                                required
                                value={newStudentName}
                                onChange={e => setNewStudentName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[4px] border-b-2 border-b-gray-400 focus:border-b-primary focus:outline-none transition-colors"
                                placeholder="مثال: محمد أحمد علي .."
                            />
                            <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رقم جوال ولي الأمر</label>
                            <div className="relative">
                            <input 
                                type="tel" 
                                required
                                value={newStudentPhone}
                                onChange={e => setNewStudentPhone(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[4px] border-b-2 border-b-gray-400 focus:border-b-primary focus:outline-none text-left transition-colors"
                                placeholder="9xxxxxxx"
                            />
                            <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={!newStudentClass}
                                className="win-btn-primary w-full flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={18} />
                                حفظ الطالب
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <Download size={16} />
                                تعليمات الاستيراد:
                            </h4>
                            <p className="mb-2 text-xs">1. حمل ملف القالب (Excel) وتأكد من تعبئته.</p>
                            <p className="mb-3 text-xs">2. العمود الأول: اسم الطالب، العمود الثاني: رقم الجوال (8 أرقام).</p>
                            <button 
                                onClick={downloadTemplate}
                                className="text-primary underline font-bold hover:text-blue-700 flex items-center gap-1 text-xs"
                            >
                                <FileSpreadsheet size={14} />
                                تحميل ملف القالب الفارغ
                            </button>
                        </div>

                        <div className="border border-dashed border-gray-400 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer bg-gray-50/50" onClick={() => fileInputRef.current?.click()}>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx, .xls"
                                className="hidden"
                            />
                            <Upload className="mx-auto text-gray-500 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">
                                {importFile ? importFile.name : 'اضغط هنا لرفع ملف Excel'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls</p>
                        </div>

                        {importPreview.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                <p className="text-green-800 font-bold">تم العثور على {importPreview.length} طالب جاهز للاستيراد</p>
                            </div>
                        )}

                        <button 
                            onClick={handleBulkImport}
                            disabled={!newStudentClass || importPreview.length === 0}
                            className="w-full py-2 text-white bg-green-600 hover:bg-green-700 rounded-[4px] font-medium shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50 mt-4"
                        >
                            <Save size={18} />
                            استيراد القائمة
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;