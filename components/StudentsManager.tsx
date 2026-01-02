
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, User, Phone, Save, X, ArrowRight, Upload, FileSpreadsheet, Filter, Share2, UserPlus, FileText, Pen } from 'lucide-react';
import { students, grades, classes, addStudent, deleteStudent, addStudentsBulk, updateStudent } from '../services/dataService';
import { read, utils, write } from 'xlsx';
import { TableVirtuoso } from 'react-virtuoso';
import { Student } from '../types';

interface StudentsManagerProps {
  onNavigate: (page: string) => void;
  onOpenReport?: (studentId: string) => void;
}

const StudentsManager: React.FC<StudentsManagerProps> = ({ onNavigate, onOpenReport }) => {
  const [viewGradeId, setViewGradeId] = useState<string>('');
  const [viewClassId, setViewClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null); // New: Track editing ID

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  
  const [forceUpdate, setForceUpdate] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (grades.length > 0 && !viewGradeId) {
        setViewGradeId(grades[0].id);
    }
  }, [grades.length, viewGradeId]);

  const viewClasses = useMemo(() => 
    classes.filter(c => c.gradeId === viewGradeId), 
  [viewGradeId, classes]);

  useEffect(() => {
    if (viewClasses.length > 0) {
        if (!viewClasses.find(c => c.id === viewClassId)) {
            setViewClassId(viewClasses[0].id);
        }
    } else {
        setViewClassId('');
    }
  }, [viewClasses, viewClassId]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      (viewClassId ? s.classId === viewClassId : false) &&
      (s.name.includes(searchTerm) || s.parentPhone.includes(searchTerm))
    );
  }, [viewClassId, searchTerm, forceUpdate, students]);

  // Set default modal values when opening (Add Mode only)
  useEffect(() => {
    if (isModalOpen && !editingStudentId) {
        setNewStudentGrade(viewGradeId);
        setNewStudentClass(viewClassId);
    }
  }, [isModalOpen, editingStudentId]);

  const modalClasses = useMemo(() => 
    classes.filter(c => c.gradeId === newStudentGrade), 
  [newStudentGrade, classes]);

  useEffect(() => {
    if (isModalOpen && modalClasses.length > 0) {
        // If the currently selected class is not in the new list of classes, switch to first one
        if (!modalClasses.find(c => c.id === newStudentClass)) {
            setNewStudentClass(modalClasses[0].id);
        }
    }
  }, [newStudentGrade, modalClasses]);

  const resetForm = () => {
    setNewStudentName('');
    setNewStudentPhone('');
    setEditingStudentId(null);
    setMode('SINGLE');
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentClass) return;

    if (editingStudentId) {
        // Update Mode
        updateStudent(editingStudentId, {
            name: newStudentName,
            parentPhone: newStudentPhone || '',
            gradeId: newStudentGrade,
            classId: newStudentClass
        });
    } else {
        // Add Mode
        addStudent({
            name: newStudentName,
            parentPhone: newStudentPhone || '',
            gradeId: newStudentGrade,
            classId: newStudentClass
        });
    }

    resetForm();
    setIsModalOpen(false);
    setForceUpdate(prev => prev + 1);
  };

  const handleEditClick = (student: Student) => {
      setEditingStudentId(student.id);
      setNewStudentName(student.name);
      setNewStudentPhone(student.parentPhone);
      setNewStudentGrade(student.gradeId);
      setNewStudentClass(student.classId);
      setMode('SINGLE');
      setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);
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
        alert("حدث خطأ في قراءة الملف.");
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

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      deleteStudent(id);
      setForceUpdate(prev => prev + 1);
    }
  };

  const sendWhatsApp = async (student: Student) => {
    if (!student.parentPhone) {
        alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
        return;
    }
    const message = `السلام عليكم ولي أمر الطالب/ة ${student.name}.`;
    const url = `whatsapp://send?phone=968${student.parentPhone}&text=${encodeURIComponent(message)}`;
    if (window.electron && window.electron.openExternal) {
         await window.electron.openExternal(url);
    } else {
       window.open(url, '_blank');
    }
  };

  if (grades.length === 0) {
    return (
        <div className="card p-8 text-center m-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">لا يوجد هيكل مدرسي</h2>
            <p className="text-gray-500 mb-4">يجب إضافة الصفوف والفصول أولاً.</p>
            <button onClick={() => onNavigate('structure')} className="btn-primary mx-auto">
              إعداد الهيكل المدرسي <ArrowRight size={16} />
            </button>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">إدارة الطلاب</h2>
           <p className="text-gray-500 text-sm mt-1">عرض وإدارة قاعدة بيانات الطلاب المسجلين</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }} 
          className="btn bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2 px-6"
        >
            <UserPlus size={20} />
            <span>إضافة طالب جديد</span>
        </button>
      </div>

      <div className="card p-4 mb-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
            <Filter size={16} /> تصفية:
        </div>
        <select value={viewGradeId} onChange={(e) => setViewGradeId(e.target.value)} className="form-input md:w-48">
            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={viewClassId} onChange={(e) => setViewClassId(e.target.value)} disabled={viewClasses.length === 0} className="form-input md:w-48">
            {viewClasses.length === 0 && <option value="">لا توجد فصول</option>}
            {viewClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1 w-full">
          <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-8" />
          <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
        </div>
      </div>

      <div className="card flex-1 overflow-hidden">
        {!viewClassId ? (
            <div className="flex items-center justify-center h-full text-gray-400">الرجاء اختيار فصل</div>
        ) : (
            <TableVirtuoso
                style={{ height: '100%', direction: 'rtl' }}
                data={filteredStudents}
                fixedHeaderContent={() => (
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-3 text-right w-1/3 text-xs font-bold text-gray-600">اسم الطالب</th>
                        <th className="p-3 text-right w-1/3 text-xs font-bold text-gray-600">ولي الأمر</th>
                        <th className="p-3 text-center w-1/3 text-xs font-bold text-gray-600">إجراءات</th>
                    </tr>
                )}
                itemContent={(index, student) => (
                    <>
                        <td className="p-3 border-b border-gray-100">
                             <div className="font-semibold text-slate-800 text-sm">{student.name}</div>
                        </td>
                        <td className="p-3 border-b border-gray-100">
                             <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Phone size={14} /> {student.parentPhone}
                             </div>
                        </td>
                        <td className="p-3 border-b border-gray-100 text-center">
                            <div className="flex justify-center gap-2">
                                <button onClick={() => handleEditClick(student)} className="text-amber-600 hover:bg-amber-50 p-2 rounded transition-colors" title="تعديل"><Pen size={16}/></button>
                                <button onClick={() => onOpenReport && onOpenReport(student.id)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="تقرير الطالب"><FileText size={16}/></button>
                                <button onClick={() => sendWhatsApp(student)} className="text-green-600 hover:bg-green-50 p-2 rounded transition-colors" title="مراسلة"><Share2 size={16}/></button>
                                <button onClick={() => handleDeleteStudent(student.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="حذف"><Trash2 size={16}/></button>
                            </div>
                        </td>
                    </>
                )}
            />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-slate-800">
                  {editingStudentId ? 'تعديل بيانات طالب' : 'إضافة طلاب'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-5">
                {!editingStudentId && (
                    <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setMode('SINGLE')} className={`btn text-xs ${mode === 'SINGLE' ? 'bg-white text-blue-700 shadow-sm' : 'bg-transparent text-gray-500 border-none hover:bg-gray-200'}`}>إضافة يدوية</button>
                        <button onClick={() => setMode('BULK')} className={`btn text-xs ${mode === 'BULK' ? 'bg-white text-green-700 shadow-sm' : 'bg-transparent text-gray-500 border-none hover:bg-gray-200'}`}>استيراد Excel</button>
                    </div>
                )}

                <div className="bg-blue-50/50 p-4 rounded-lg mb-6 border border-blue-100">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold mb-1.5 block text-gray-600">الصف الدراسي</label>
                            <select value={newStudentGrade} onChange={e => setNewStudentGrade(e.target.value)} className="form-input text-sm h-9 py-0">
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold mb-1.5 block text-gray-600">الفصل</label>
                            <select value={newStudentClass} onChange={e => setNewStudentClass(e.target.value)} disabled={modalClasses.length === 0} className="form-input text-sm h-9 py-0">
                                {modalClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {mode === 'SINGLE' ? (
                    <form onSubmit={handleSaveStudent} className="space-y-4">
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-600">اسم الطالب الثلاثي</label>
                             <input type="text" required value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="form-input" placeholder="اكتب الاسم هنا..." />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-600">رقم هاتف ولي الأمر</label>
                             <input type="tel" required value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)} className="form-input" placeholder="9xxxxxxxx" />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={!newStudentClass} 
                            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                             {editingStudentId ? <Save size={20}/> : <Plus size={20}/>} 
                             {editingStudentId ? 'حفظ التعديلات' : 'حفظ وإضافة'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors group" 
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx" className="hidden" />
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 group-hover:scale-110 transition-transform">
                                <Upload size={24} />
                            </div>
                            <p className="text-sm font-bold text-gray-700">{importFile ? importFile.name : 'اضغط لاختيار ملف Excel'}</p>
                            <p className="text-xs text-gray-400 mt-1">يجب أن يحتوي العمود الأول على الاسم والثاني على الرقم</p>
                        </div>
                        <button onClick={handleBulkImport} disabled={!newStudentClass || importPreview.length === 0} className="btn w-full bg-green-600 text-white hover:bg-green-700 justify-center">
                            <FileSpreadsheet size={18} />
                            استيراد {importPreview.length > 0 ? `(${importPreview.length})` : ''}
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
