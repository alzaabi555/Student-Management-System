
import React, { useState } from 'react';
import { Layers, Plus, Trash2, Folder, GraduationCap, AlertCircle } from 'lucide-react';
import { grades, classes, addGrade, deleteGrade, addClass, deleteClass } from '../services/dataService';

const SchoolManager: React.FC = () => {
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(grades.length > 0 ? grades[0].id : null);
  const [newGradeName, setNewGradeName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [_, setForceUpdate] = useState(0);

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

  const currentClasses = classes.filter(c => c.gradeId === selectedGradeId);
  const selectedGradeName = grades.find(g => g.id === selectedGradeId)?.name;

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">الهيكل المدرسي</h2>
        <p className="text-gray-500">إضافة الصفوف والفصول الدراسية</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-4">
        
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
    </div>
  );
};

export default SchoolManager;
