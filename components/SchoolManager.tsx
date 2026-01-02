import React, { useState } from 'react';
import { Layers, Plus, Trash2, Folder, GraduationCap, ChevronLeft, AlertCircle } from 'lucide-react';
import { grades, classes, addGrade, deleteGrade, addClass, deleteClass } from '../services/dataService';

const SchoolManager: React.FC = () => {
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(grades.length > 0 ? grades[0].id : null);
  const [newGradeName, setNewGradeName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  // Force update used to trigger re-renders on data change
  const [_, setForceUpdate] = useState(0);

  const refresh = () => setForceUpdate(prev => prev + 1);

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeName.trim()) return;
    const addedGrade = addGrade(newGradeName);
    setNewGradeName('');
    
    if (grades.length === 1) {
        setSelectedGradeId(addedGrade.id);
    }
    refresh();
  };

  const handleDeleteGrade = (id: string) => {
    if (window.confirm('حذف الصف سيؤدي لحذف جميع الفصول المرتبطة به. هل أنت متأكد؟')) {
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
    if (window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) {
      deleteClass(id);
      refresh();
    }
  };

  // Derived state
  const currentClasses = classes.filter(c => c.gradeId === selectedGradeId);
  const selectedGradeName = grades.find(g => g.id === selectedGradeId)?.name;

  return (
    <div className="p-4 md:p-8 h-[calc(100vh-80px)] overflow-hidden flex flex-col max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-1">
          <Layers className="text-primary" size={28} />
          الهيكل المدرسي
        </h2>
        <p className="text-sm text-gray-500">إعداد البنية الأساسية للنظام (الصفوف والفصول)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-hidden pb-4">
        
        {/* Grades Column (Windows 11 Card) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 flex flex-col h-full overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <GraduationCap size={20} className="text-primary" />
              الصفوف الدراسية
            </h3>
            <span className="text-xs font-bold bg-white border border-gray-200 px-2.5 py-1 rounded-full text-slate-600 shadow-sm">{grades.length}</span>
          </div>

          <div className="p-4 bg-white border-b border-gray-100">
            <form onSubmit={handleAddGrade} className="flex gap-2">
              <input
                type="text"
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                placeholder="اسم الصف (مثال: الخامس)"
                className="flex-1 px-3 py-2.5 rounded-[6px] border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
              />
              <button 
                type="submit"
                disabled={!newGradeName.trim()}
                className="win-btn-primary flex items-center justify-center w-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {grades.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                    <Layers size={32} className="mb-2 opacity-20" />
                    <span>لا توجد صفوف مضافة</span>
                </div>
            )}
            {grades.map(grade => (
              <div 
                key={grade.id}
                onClick={() => setSelectedGradeId(grade.id)}
                className={`
                  p-3 rounded-xl cursor-pointer transition-all duration-200 flex justify-between items-center group relative overflow-hidden
                  ${selectedGradeId === grade.id 
                    ? 'bg-primary/5 border border-primary/20 shadow-sm' 
                    : 'bg-white border border-transparent hover:bg-gray-50 hover:border-gray-200'}
                `}
              >
                {selectedGradeId === grade.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedGradeId === grade.id ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                    <GraduationCap size={16} />
                  </div>
                  <span className={`font-semibold text-sm ${selectedGradeId === grade.id ? 'text-primary' : 'text-slate-700'}`}>
                    {grade.name}
                  </span>
                </div>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteGrade(grade.id); }}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="حذف الصف"
                >
                    <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Classes Column (Windows 11 Card) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 flex flex-col h-full overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
            {!selectedGradeId ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 backdrop-blur-sm z-10">
                    <AlertCircle size={40} className="mb-3 opacity-30 text-slate-400" />
                    <p className="text-sm font-medium">الرجاء اختيار صف دراسي لعرض فصوله</p>
                </div>
            ) : (
                <>
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Folder size={20} className="text-amber-500" />
                    فصول: <span className="text-primary">{selectedGradeName}</span>
                    </h3>
                    <span className="text-xs font-bold bg-white border border-gray-200 px-2.5 py-1 rounded-full text-slate-600 shadow-sm">{currentClasses.length}</span>
                </div>

                <div className="p-4 bg-white border-b border-gray-100">
                    <form onSubmit={handleAddClass} className="flex gap-2">
                    <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder={`اسم الفصل (مثال: ${selectedGradeName}/1)`}
                        className="flex-1 px-3 py-2.5 rounded-[6px] border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
                    />
                    <button 
                        type="submit"
                        disabled={!newClassName.trim()}
                        className="win-btn-primary flex items-center justify-center w-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={20} />
                    </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                    {currentClasses.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl m-2">
                            <Folder size={32} className="mb-2 opacity-20" />
                            <span>لا توجد فصول مضافة لهذا الصف</span>
                         </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {currentClasses.map(cls => (
                            <div key={cls.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex justify-between items-center group">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                    <span className="font-bold text-slate-700 text-sm">{cls.name}</span>
                                </div>
                                <button 
                                    onClick={() => handleDeleteClass(cls.id)}
                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
                </>
            )}
        </div>

      </div>
    </div>
  );
};

export default SchoolManager;