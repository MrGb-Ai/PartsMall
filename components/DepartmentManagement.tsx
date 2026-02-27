import React, { useState } from 'react';
import type { Department } from '../types';

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([
    { id: 1, name: 'الإدارة' },
    { id: 2, name: 'الحسابات' },
    { id: 3, name: 'المبيعات' },
    { id: 4, name: 'المشتريات' },
    { id: 5, name: 'المخازن' },
    { id: 6, name: 'العلاقات العامه' },
    { id: 7, name: 'شئون العاملين' },
  ]);
  const [newDepartmentName, setNewDepartmentName] = useState('');

  const handleAddDepartment = () => {
    if (newDepartmentName.trim() !== '') {
      const newDepartment: Department = {
        id: Date.now(),
        name: newDepartmentName.trim(),
      };
      setDepartments([...departments, newDepartment]);
      setNewDepartmentName('');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">إدارة الأقسام</h1>
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">إضافة قسم جديد</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="اسم القسم"
              className="flex-grow p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleAddDepartment} 
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
              إضافة
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">قائمة الأقسام</h2>
          <div className="bg-white rounded-lg shadow-md">
            <ul className="divide-y divide-gray-200">
              {departments.map((dept) => (
                <li key={dept.id} className="p-4">
                  <p className="font-semibold text-lg text-gray-800">{dept.name}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagement;
