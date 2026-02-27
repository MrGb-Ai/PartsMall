import React, { useState } from 'react';
import type { Employee, DayOfWeek, Department, MgmtUser } from '../types';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEmployee({ ...newEmployee, [name]: name === 'departmentId' || name === 'salary' ? Number(value) : value });
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const vacationDays = newEmployee.vacationDays.includes(day)
      ? newEmployee.vacationDays.filter((d) => d !== day)
      : [...newEmployee.vacationDays, day];
    setNewEmployee({ ...newEmployee, vacationDays });
  };

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.jobTitle && newEmployee.salary > 0) {
      setEmployees([...employees, { ...newEmployee, id: Date.now() }]);
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة العامل الجديد ${newEmployee.name}` }));
      setNewEmployee({
        name: '',
        jobTitle: '',
        departmentId: 1,
        salary: 0,
        vacationDays: [],
      });
    }
  };

  const daysOfWeek: DayOfWeek[] = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">إدارة العاملين</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">إضافة عامل جديد</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              name="name"
              value={newEmployee.name}
              onChange={handleInputChange}
              placeholder="اسم العامل"
              className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="jobTitle"
              value={newEmployee.jobTitle}
              onChange={handleInputChange}
              placeholder="المسمى الوظيفي"
              className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <select
              name="departmentId"
              value={newEmployee.departmentId}
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
              value={newEmployee.salary}
              onChange={handleInputChange}
              placeholder="المرتب"
              className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-600 mb-2">أيام الإجازات الأسبوعية</h3>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      newEmployee.vacationDays.includes(day)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={handleAddEmployee} 
            className="mt-6 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
            إضافة العامل
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">قائمة العاملين</h2>
          <div className="bg-white rounded-lg shadow-md">
            <ul className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <li key={employee.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg text-gray-800">{employee.name}</p>
                    <p className="text-gray-600">{employee.jobTitle} - {departments.find(d => d.id === employee.departmentId)?.name} - {employee.salary} جنيه</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    إجازة: {employee.vacationDays.join(', ')}
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
