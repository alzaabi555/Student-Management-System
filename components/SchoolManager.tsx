
import React, { useState, useRef } from 'react';
import { Layers, Plus, Trash2, Folder, GraduationCap, AlertCircle, Database, Download, Upload, RefreshCw, AlertTriangle } from 'lucide-react';
import { grades, classes, addGrade, deleteGrade, addClass, deleteClass, exportDatabase, importDatabase, resetDatabase } from '../services/dataService';

const SchoolManager: React.FC = () => {
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(grades.length > 0 ? grades[0].id : null);
  const [newGradeName, setNewGradeName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [_, setForceUpdate] = useState(0);
  
  // Backup State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const refresh = () => setForceUpdate(prev => prev + 1);

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeName.trim()) return;
    const addedGrade = addGrade(newGradeName);
    setNewGradeName('');
    if (grades.length === 1) setSelectedGradeId(addedGrade.id);
    refresh();
  };

  const handleDeleteGrade = (id: string) => {
    if (window.confirm('حذف الصف سيؤدي لحذف جميع الفصول. هل أنت متأكد؟')) {
      deleteGrade(id);
      if (selectedGradeId === id) setSelectedGradeId(null);
      refresh();
    }
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedGradeId) return;
    addClass(newClassName, selectedGradeId);
    setNewClassName('');
    refresh();
  };

  const handleDeleteClass = (id: string) => {
    if (window.confirm('حذف الفصل؟')) { deleteClass(id); refresh(); }
  };
  
  // --- Backup Functions ---
  const handleBackup = async () => {
      try {
          const json = await exportDatabase();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const date = new Date().toISOString().split('T')[0];
          a.download = `Madrasati_Backup_${date}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (err) {
          alert("فشل إنشاء النسخة الاحتياطية");
      }
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!window.confirm("تحذير: استعادة النسخة سيقوم بحذف جميع البيانات الحالية واستبدالها بالنسخة الجديدة. هل أنت متأكد؟")) {
          e.target.value = '';
          return;
      }

      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          const success = await importDatabase(content);
          setIsProcessing(false);
          if (success) {
              alert("تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة.");
              window.location.reload();
          } else {
              alert("فشل استعادة البيانات. تأكد من صحة الملف.");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  const handleFactoryReset = async () => {
      if (window.confirm("حذف كافة البيانات؟ هذا الإجراء لا يمكن التراجع عنه! سيتم حذف جميع الطلاب والسجلات.")) {
          if (window.confirm("تأكيد أخير: هل أنت متأكد تماماً؟")) {
              await resetDatabase();
              window.location.reload();
          }
      }
  };

  const currentClasses = classes.filter(c => c.gradeId === selectedGradeId);
  const selectedGradeName = grades.find(g => g.id === selectedGradeId)?.name;

  return (
    <div className="flex flex-col max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">الهيكل المدرسي</h2>
        <p className="text-gray-500">إضافة الصفوف والفصول الدراسية وإدارة النظام</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        
        {/* Grades */}
        <div className="card flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold flex justify-between items-center">
            <span className="flex items-center gap-2"><GraduationCap size={18} /> الصفوف</span>
            <span className="bg-white px-2 rounded border text-xs">{grades.length}</span>
          </div>

          <div className="p-4 border-b">
            <form onSubmit={handleAddGrade} className="flex gap-3 items-center">
              <input type="text" value={newGradeName} onChange={(e) => setNewGradeName(e.target.value)} placeholder="اسم الصف (مثال: الخامس)" className="form-input flex-1" />
              <button 
                type="submit" 
                disabled={!newGradeName.trim()} 
                className="h-11 w-11 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {grades.map(grade => (
              <div key={grade.id} onClick={() => setSelectedGradeId(grade.id)} className={`p-3 rounded border cursor-pointer flex justify-between items-center ${selectedGradeId === grade.id ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <span>{grade.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteGrade(grade.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Classes */}
        <div className="card flex flex-col h-full overflow-hidden">
            {!selectedGradeId ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <AlertCircle size={32} className="mb-2" />
                    <p>اختر صفاً لعرض فصوله</p>
                </div>
            ) : (
                <>
                <div className="p-4 border-b bg-gray-50 font-bold flex justify-between items-center">
                    <span className="flex items-center gap-2"><Folder size={18} /> فصول: {selectedGradeName}</span>
                    <span className="bg-white px-2 rounded border text-xs">{currentClasses.length}</span>
                </div>

                <div className="p-4 border-b">
                    <form onSubmit={handleAddClass} className="flex gap-3 items-center">
                    <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="اسم الفصل" className="form-input flex-1" />
                    <button 
                        type="submit" 
                        disabled={!newClassName.trim()} 
                        className="h-11 w-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-3">
                    {currentClasses.map(cls => (
                        <div key={cls.id} className="p-3 rounded border bg-white flex justify-between items-center">
                            <span className="font-semibold">{cls.name}</span>
                            <button onClick={() => handleDeleteClass(cls.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    </div>
                </div>
                </>
            )}
        </div>
      </div>

      {/* --- DATA MANAGEMENT SECTION --- */}
      <div className="card overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold flex items-center gap-2 text-slate-700">
              <Database size={20} className="text-slate-600" />
              <h3>إدارة البيانات والنسخ الاحتياطي</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Backup */}
              <div className="flex flex-col gap-3 p-4 border border-blue-100 bg-blue-50/30 rounded-xl items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-1">
                      <Download size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800">حفظ نسخة احتياطية</h4>
                  <p className="text-xs text-gray-500 mb-2">تنزيل ملف كامل لبيانات المدرسة</p>
                  <button onClick={handleBackup} className="btn bg-white border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white w-full text-xs">
                      تنزيل البيانات
                  </button>
              </div>

              {/* Restore */}
              <div className="flex flex-col gap-3 p-4 border border-green-100 bg-green-50/30 rounded-xl items-center text-center">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-1">
                      {isProcessing ? <RefreshCw className="animate-spin" size={24} /> : <Upload size={24} />}
                  </div>
                  <h4 className="font-bold text-slate-800">استرجاع نسخة</h4>
                  <p className="text-xs text-gray-500 mb-2">استعادة البيانات من ملف سابق</p>
                  <button onClick={handleRestoreClick} disabled={isProcessing} className="btn bg-white border border-green-200 text-green-700 hover:bg-green-600 hover:text-white w-full text-xs">
                      رفع ملف النسخة
                  </button>
                  <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </div>

              {/* Reset */}
              <div className="flex flex-col gap-3 p-4 border border-red-100 bg-red-50/30 rounded-xl items-center text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-1">
                      <AlertTriangle size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800">حذف كافة البيانات</h4>
                  <p className="text-xs text-gray-500 mb-2">تصفير النظام وبدء عام جديد</p>
                  <button onClick={handleFactoryReset} className="btn bg-white border border-red-200 text-red-700 hover:bg-red-600 hover:text-white w-full text-xs">
                      حذف البيانات
                  </button>
              </div>

          </div>
      </div>

    </div>
  );
};

export default SchoolManager;
