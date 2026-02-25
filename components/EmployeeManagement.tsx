import React, { useState } from 'react';
import type { Employee, DayOfWeek, Department, MgmtUser } from '../types';
import { Edit, Trash2, X, Save } from 'lucide-react';

interface EmployeeManagementProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  currentUser: MgmtUser;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, setEmployees, currentUser }) => {
  const [departments, setDepartments] = useState<Department[]>([
    { id: 1, name: 'الإدارة' },
    { id: 2, name: 'الحسابات' },
    { id: 3, name: 'المبيعات' },
    { id: 4, name: 'المشتريات' },
    { id: 5, name: 'المخازن' },
    { id: 6, name: 'العلاقات العامه' },
    { id: 7, name: 'شئون العاملين' },
  ]);
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id'>>({
    name: '',
    jobTitle: '',
    departmentId: 1,
    salary: 0,
    vacationDays: [],
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editEmployeeData, setEditEmployeeData] = useState<Employee | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingEmployeeId && editEmployeeData) {
        setEditEmployeeData({ ...editEmployeeData, [name]: name === 'departmentId' || name === 'salary' ? Number(value) : value });
    } else {
        setNewEmployee({ ...newEmployee, [name]: name === 'departmentId' || name === 'salary' ? Number(value) : value });
    }
  };

  const handleDayToggle = (day: DayOfWeek) => {
    if (editingEmployeeId && editEmployeeData) {
        const vacationDays = editEmployeeData.vacationDays.includes(day)
          ? editEmployeeData.vacationDays.filter((d) => d !== day)
          : [...editEmployeeData.vacationDays, day];
        setEditEmployeeData({ ...editEmployeeData, vacationDays });
    } else {
        const vacationDays = newEmployee.vacationDays.includes(day)
          ? newEmployee.vacationDays.filter((d) => d !== day)
          : [...newEmployee.vacationDays, day];
        setNewEmployee({ ...newEmployee, vacationDays });
    }
  };

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.jobTitle && newEmployee.salary > 0) {
      setEmployees([...employees, { ...newEmployee, id: Date.now() }]);
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة العامل الجديد ${newEmployee.name} براتب [SENSITIVE:${newEmployee.salary}]` }));
      setNewEmployee({
        name: '',
        jobTitle: '',
        departmentId: 1,
        salary: 0,
        vacationDays: [],
      });
    }
  };

  const handleEditClick = (employee: Employee) => {
      setEditingEmployeeId(employee.id);
      setEditEmployeeData({ ...employee });
  };

  const handleCancelEdit = () => {
      setEditingEmployeeId(null);
      setEditEmployeeData(null);
  };

  const handleSaveEdit = () => {
      if (editEmployeeData && editEmployeeData.name && editEmployeeData.jobTitle && editEmployeeData.salary > 0) {
          setEmployees(employees.map(emp => emp.id === editEmployeeData.id ? editEmployeeData : emp));
          window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل بيانات العامل ${editEmployeeData.name}` }));
          setEditingEmployeeId(null);
          setEditEmployeeData(null);
      }
  };

  const handleDeleteEmployee = (id: number, name: string) => {
      if (window.confirm(`هل أنت متأكد من حذف العامل ${name}؟`)) {
          setEmployees(employees.filter(emp => emp.id !== id));
          window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بحذف العامل ${name}` }));
      }
  };

  const daysOfWeek: DayOfWeek[] = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">إدارة العاملين</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">{editingEmployeeId ? 'تعديل بيانات العامل' : 'إضافة عامل جديد'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              name="name"
              value={editingEmployeeId && editEmployeeData ? editEmployeeData.name : newEmployee.name}
              onChange={handleInputChange}
              placeholder="اسم العامل"
              className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="jobTitle"
              value={editingEmployeeId && editEmployeeData ? editEmployeeData.jobTitle : newEmployee.jobTitle}
              onChange={handleInputChange}
              placeholder="المسمى الوظيفي"
              className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <select
              name="departmentId"
              value={editingEmployeeId && editEmployeeData ? editEmployeeData.departmentId : newEmployee.departmentId}
              onChange={handleInputChange}
              className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <input
              type="number"
              name="salary"
              value={editingEmployeeId && editEmployeeData ? editEmployeeData.salary : newEmployee.salary}
              onChange={handleInputChange}
              placeholder="المرتب"
              className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-600 mb-2">أيام الإجازات الأسبوعية</h3>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => {
                  const isSelected = editingEmployeeId && editEmployeeData 
                    ? editEmployeeData.vacationDays.includes(day) 
                    : newEmployee.vacationDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {editingEmployeeId ? (
              <div className="mt-6 flex gap-3">
                  <button 
                    onClick={handleSaveEdit} 
                    className="flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors">
                    <Save size={20} /> حفظ التعديلات
                  </button>
                  <button 
                    onClick={handleCancelEdit} 
                    className="flex items-center gap-2 bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors">
                    <X size={20} /> إلغاء
                  </button>
              </div>
          ) : (
              <button 
                onClick={handleAddEmployee} 
                className="mt-6 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                إضافة العامل
              </button>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">قائمة العاملين</h2>
          <div className="bg-white rounded-lg shadow-md">
            <ul className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <li key={employee.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="font-bold text-lg text-gray-800">{employee.name}</p>
                    <p className="text-gray-600">{employee.jobTitle} - {departments.find(d => d.id === employee.departmentId)?.name} - {employee.salary} جنيه</p>
                    <p className="text-sm text-gray-500 mt-1">
                      إجازة: {employee.vacationDays.join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                      <button 
                          onClick={() => handleEditClick(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="تعديل"
                      >
                          <Edit size={20} />
                      </button>
                      <button 
                          onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="حذف"
                      >
                          <Trash2 size={20} />
                      </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;
