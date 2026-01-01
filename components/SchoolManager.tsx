import React, { useState } from 'react';
import { Layers, Plus, Trash2, Folder, GraduationCap, ChevronLeft } from 'lucide-react';
import { grades, classes, addGrade, deleteGrade, addClass, deleteClass } from '../services/dataService';

const SchoolManager: React.FC = () => {
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(grades.length > 0 ? grades[0].id : null);
  const [newGradeName, setNewGradeName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);

  const refresh = () => setForceUpdate(prev => prev + 1);

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeName.trim()) return;
    const addedGrade = addGrade(newGradeName);
    setNewGradeName('');
    
    // Automatically select the new grade if it's the first one
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
    <div className="p-4 md:p-6 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Layers className="text-primary" size={24} />
          الهيكل المدرسي
        </h2>
        <p className="text-xs md:text-sm text-gray-500">إضافة وتعديل الصفوف الدراسية والفصول</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-full overflow-hidden">
        
        {/* Grades Column */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[40vh] md:h-full overflow-hidden">
          <div className="p-3 md:p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm md:text-base">
              <GraduationCap size={18} className="md:w-5 md:h-5" />
              الصفوف الدراسية
            </h3>
            <span className="text-xs bg-white border px-2 py-1 rounded-full text-gray-500">{grades.length}</span>
          </div>

          <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-100">
            <form onSubmit={handleAddGrade} className="flex gap-2">
              <input
                type="text"
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                placeholder="اسم الصف..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <button 
                type="submit"
                disabled={!newGradeName.trim()}
                className="bg-primary hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {grades.length === 0 && (
                <div className="text-center p-8 text-gray-400 text-sm">لا توجد صفوف مضافة</div>
            )}
            {grades.map(grade => (
              <div 
                key={grade.id}
                onClick={() => setSelectedGradeId(grade.id)}
                className={`
                  p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center group
                  ${selectedGradeId === grade.id 
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' 
                    : 'bg-white border border-gray-100 hover:border-blue-100 hover:shadow-sm'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 md:p-2 rounded-lg ${selectedGradeId === grade.id ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    <GraduationCap size={16} className="md:w-[18px] md:h-[18px]" />
                  </div>
                  <span className={`font-medium text-sm md:text-base ${selectedGradeId === grade.id ? 'text-blue-900' : 'text-gray-700'}`}>
                    {grade.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                    {selectedGradeId === grade.id && <ChevronLeft size={16} className="text-blue-400 animate-pulse ml-2" />}
                    <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteGrade(grade.id); }}
                    className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all"
                    >
                    <Trash2 size={16} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Classes Column */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden relative">
            {!selectedGradeId ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                    <Layers size={32} className="mb-4 opacity-20" />
                    <p className="text-sm">اختر صفاً دراسياً لعرض فصوله</p>
                </div>
            ) : (
                <>
                <div className="p-3 md:p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm md:text-base">
                    <Folder size={18} className="md:w-5 md:h-5" />
                    فصول: {selectedGradeName}
                    </h3>
                    <span className="text-xs bg-white border px-2 py-1 rounded-full text-gray-500">{currentClasses.length}</span>
                </div>

                <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-100">
                    <form onSubmit={handleAddClass} className="flex gap-2">
                    <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="اسم الفصل..."
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <button 
                        type="submit"
                        disabled={!newClassName.trim()}
                        className="bg-primary hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} />
                    </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-3 md:p-4">
                    {currentClasses.length === 0 ? (
                         <div className="text-center p-6 md:p-8 text-gray-400 text-xs md:text-sm border-2 border-dashed border-gray-100 rounded-xl">
                            لا توجد فصول مضافة لهذا الصف
                         </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                        {currentClasses.map(cls => (
                            <div key={cls.id} className="bg-white p-2 md:p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group hover:border-primary/50 transition-colors">
                                <span className="font-bold text-gray-700 text-sm md:text-base">{cls.name}</span>
                                <button 
                                    onClick={() => handleDeleteClass(cls.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
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