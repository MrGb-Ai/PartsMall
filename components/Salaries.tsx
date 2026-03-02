import React, { useState, useEffect } from 'react';
import type { Employee, AttendanceRecord, SalaryRecord, MgmtUser, SalesInvoice, SalesReturn, SalesRepresentative, Department } from '../types';
import { SaveIcon, DollarSignIcon, PrinterIcon } from 'lucide-react';

interface SalariesProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  salaryRecords: SalaryRecord[];
  setSalaryRecords: React.Dispatch<React.SetStateAction<SalaryRecord[]>>;
  currentUser: MgmtUser;
  salesInvoices: SalesInvoice[];
  salesReturns: SalesReturn[];
  salesRepresentatives: SalesRepresentative[];
  departments: Department[];
}

const Salaries: React.FC<SalariesProps> = ({ employees, attendanceRecords, salaryRecords, setSalaryRecords, currentUser, salesInvoices, salesReturns, salesRepresentatives, departments }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [currentRecords, setCurrentRecords] = useState<Record<number, Partial<SalaryRecord>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize records for the selected month
  useEffect(() => {
    const recordsForMonth = salaryRecords.filter(r => r.month === selectedMonth);
    const initialRecords: Record<number, Partial<SalaryRecord>> = {};
    
    employees.forEach(emp => {
      const existingRecord = recordsForMonth.find(r => r.employeeId === emp.id);
      
      // Calculate working days and late days from attendance
      const empAttendance = attendanceRecords.filter(r => 
        r.employeeId === emp.id && 
        r.date.startsWith(selectedMonth)
      );
      
      const workingDays = empAttendance.filter(r => 
        ['present', 'late', 'excused', 'vacation'].includes(r.status)
      ).length;
      
      const lateDays = empAttendance.filter(r => r.status === 'late').length;

      // Calculate total late and overtime minutes
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;

      empAttendance.forEach(r => {
        if (emp.scheduledCheckInTime && r.checkInTime) {
          const [schedInH, schedInM] = emp.scheduledCheckInTime.split(':').map(Number);
          const [actualInH, actualInM] = r.checkInTime.split(':').map(Number);
          const schedInTotal = schedInH * 60 + schedInM;
          const actualInTotal = actualInH * 60 + actualInM;
          if (actualInTotal > schedInTotal) totalLateMinutes += (actualInTotal - schedInTotal);
        }

        if (emp.scheduledCheckOutTime && r.checkOutTime) {
          const [schedOutH, schedOutM] = emp.scheduledCheckOutTime.split(':').map(Number);
          const [actualOutH, actualOutM] = r.checkOutTime.split(':').map(Number);
          let schedOutTotal = schedOutH * 60 + schedOutM;
          let actualOutTotal = actualOutH * 60 + actualOutM;
          if (actualOutTotal < actualOutTotal - 12 * 60) actualOutTotal += 24 * 60;
          if (schedOutTotal < schedOutTotal - 12 * 60) schedOutTotal += 24 * 60;

          if (actualOutTotal < schedOutTotal) {
            totalLateMinutes += (schedOutTotal - actualOutTotal);
          } else if (actualOutTotal > schedOutTotal) {
            totalOvertimeMinutes += (actualOutTotal - schedOutTotal);
          }
        }
      });

      // Calculate financial values
      const baseMonthlySalary = emp.salary || 0;
      const workingHoursPerDay = emp.workingHoursPerDay || 8;
      
      // Calculate working days in month (assuming 30 days minus vacation days)
      const vacationDaysPerWeek = emp.vacationDays?.length || 0;
      const averageWorkingDaysPerMonth = 30 - (vacationDaysPerWeek * 4); // Rough estimate
      
      const dayValue = baseMonthlySalary / (averageWorkingDaysPerMonth > 0 ? averageWorkingDaysPerMonth : 26);
      const hourValue = dayValue / workingHoursPerDay;
      const minuteValue = hourValue / 60;

      const calculatedBasicSalary = Math.round(dayValue * workingDays);
      const calculatedLates = Math.round(totalLateMinutes * minuteValue);
      const calculatedOvertime = Math.round(totalOvertimeMinutes * minuteValue);

      // Calculate sales commission
      let calculatedCommission = 0;
      const empDepartment = departments.find(d => d.id === emp.departmentId);
      if (empDepartment && empDepartment.name.includes('مبيعات') && emp.commissionType && emp.commissionType !== 'none') {
        // Find corresponding sales representative
        const salesRep = salesRepresentatives.find(rep => rep.name === emp.name);
        
        if (salesRep) {
          // Find sales invoices and returns for this employee in the selected month
          const empSales = salesInvoices.filter(inv => 
            inv.salesRepId === salesRep.id && 
            inv.date.startsWith(selectedMonth)
          );
          const empReturns = salesReturns.filter(ret => 
            ret.salesRepId === salesRep.id && 
            ret.date.startsWith(selectedMonth)
          );

          if (emp.commissionType === 'percentage') {
            const totalSalesAmount = empSales.reduce((sum, inv) => {
              const itemsTotal = inv.items.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
              return sum + itemsTotal - (inv.discount || 0) + (inv.tax || 0);
            }, 0);
            const totalReturnsAmount = empReturns.reduce((sum, ret) => {
              const itemsTotal = ret.items.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
              return sum + itemsTotal - (ret.discount || 0) + (ret.tax || 0);
            }, 0);
            
            const netSalesAmount = totalSalesAmount - totalReturnsAmount;
            calculatedCommission = Math.round(netSalesAmount * ((emp.commissionValue || 0) / 100));
          } else if (emp.commissionType === 'per_item') {
            const totalItemsSold = empSales.reduce((sum, inv) => {
              return sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
            }, 0);
            const totalItemsReturned = empReturns.reduce((sum, ret) => {
              return sum + ret.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
            }, 0);
            
            const netItemsSold = totalItemsSold - totalItemsReturned;
            calculatedCommission = Math.round(netItemsSold * (emp.commissionValue || 0));
          }
        }
      }

      if (existingRecord) {
        // If attendance changed, we might want to recalculate, but we'll respect saved values if they exist.
        // To be smart, if workingDays changed since last save, we recalculate basicSalary.
        const shouldRecalculate = existingRecord.workingDays !== workingDays;
        
        initialRecords[emp.id] = { 
          ...existingRecord,
          workingDays: workingDays,
          basicSalary: shouldRecalculate ? calculatedBasicSalary : (existingRecord.basicSalary ?? calculatedBasicSalary),
          lates: shouldRecalculate ? calculatedLates : (existingRecord.lates ?? calculatedLates),
          overtime: shouldRecalculate ? calculatedOvertime : (existingRecord.overtime ?? calculatedOvertime),
          commission: existingRecord.commission ?? calculatedCommission
        };
      } else {
        initialRecords[emp.id] = {
          employeeId: emp.id,
          month: selectedMonth,
          basicSalary: calculatedBasicSalary,
          workingDays: workingDays,
          lates: calculatedLates,
          overtime: calculatedOvertime,
          commission: calculatedCommission,
          deductions: 0,
          bonuses: 0,
          netSalary: calculatedBasicSalary + calculatedOvertime + calculatedCommission - calculatedLates,
          isPaid: false
        };
      }
    });
    
    setCurrentRecords(initialRecords);
  }, [selectedMonth, employees, attendanceRecords, salaryRecords]);

  const handleRecordChange = (employeeId: number, field: keyof SalaryRecord, value: any) => {
    setCurrentRecords(prev => {
      const record = { ...prev[employeeId], [field]: value };
      
      // Recalculate net salary
      const basic = Number(record.basicSalary) || 0;
      const overtime = Number(record.overtime) || 0;
      const commission = Number(record.commission) || 0;
      const bonuses = Number(record.bonuses) || 0;
      const lates = Number(record.lates) || 0;
      const deductions = Number(record.deductions) || 0;
      
      record.netSalary = basic + overtime + commission + bonuses - lates - deductions;
      
      return {
        ...prev,
        [employeeId]: record
      };
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    
    const newRecords = Object.values(currentRecords).map(record => {
      const existingRecord = salaryRecords.find(r => r.employeeId === record.employeeId && r.month === selectedMonth);
      
      if (existingRecord) {
        return {
          ...existingRecord,
          ...record,
          lastModifiedAt: new Date().toISOString(),
          lastModifiedBy: currentUser.username
        } as SalaryRecord;
      } else {
        return {
          ...record,
          id: Date.now() + Math.random(),
          createdAt: new Date().toISOString(),
          createdBy: currentUser.username
        } as SalaryRecord;
      }
    });

    const filteredRecords = salaryRecords.filter(r => r.month !== selectedMonth);
    setSalaryRecords([...filteredRecords, ...newRecords]);
    
    window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتحديث سجل المرتبات لشهر ${selectedMonth}` }));
    
    setTimeout(() => {
      setIsSaving(false);
      alert('تم حفظ سجل المرتبات بنجاح!');
    }, 500);
  };

  const inputClass = "h-10 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200 text-sm font-bold text-center transition-colors";

  return (
    <div className="flex flex-col gap-6 items-start">
      {/* Top Bar */}
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <DollarSignIcon className="h-7 w-7 text-green-600 dark:text-green-400" />
            سجل المرتبات
          </h1>
          
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <label className="font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap px-2">الشهر:</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-800 dark:text-gray-200 font-bold dir-ltr"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
            onClick={() => window.print()}
          >
            <PrinterIcon className="w-4 h-4" />
            <span>طباعة</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm disabled:opacity-70"
          >
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SaveIcon className="w-4 h-4" />
            )}
            <span>حفظ المرتبات</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">جدول المرتبات</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">كود الموظف</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap w-2/12 text-xs">اسم الموظف</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">الراتب الأساسي</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">أيام العمل</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">الراتب المستحق</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">تأخيرات</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">إضافي</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">عمولة مبيعات</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">خصم</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs">مكافآت</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 bg-green-50 dark:bg-green-900/20 text-xs">صافي المرتب</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    لا يوجد موظفين مسجلين في النظام.
                  </td>
                </tr>
              ) : (
                employees.map(emp => {
                  const record = currentRecords[emp.id] || {};
                  
                  // Get late days count for hint
                  const empAttendance = attendanceRecords.filter(r => 
                    r.employeeId === emp.id && 
                    r.date.startsWith(selectedMonth)
                  );
                  
                  let totalLateMinutes = 0;
                  let totalOvertimeMinutes = 0;

                  empAttendance.forEach(r => {
                    if (emp.scheduledCheckInTime && r.checkInTime) {
                      const [schedInH, schedInM] = emp.scheduledCheckInTime.split(':').map(Number);
                      const [actualInH, actualInM] = r.checkInTime.split(':').map(Number);
                      const schedInTotal = schedInH * 60 + schedInM;
                      const actualInTotal = actualInH * 60 + actualInM;
                      if (actualInTotal > schedInTotal) totalLateMinutes += (actualInTotal - schedInTotal);
                    }

                    if (emp.scheduledCheckOutTime && r.checkOutTime) {
                      const [schedOutH, schedOutM] = emp.scheduledCheckOutTime.split(':').map(Number);
                      const [actualOutH, actualOutM] = r.checkOutTime.split(':').map(Number);
                      let schedOutTotal = schedOutH * 60 + schedOutM;
                      let actualOutTotal = actualOutH * 60 + actualOutM;
                      if (actualOutTotal < actualOutTotal - 12 * 60) actualOutTotal += 24 * 60;
                      if (schedOutTotal < schedOutTotal - 12 * 60) schedOutTotal += 24 * 60;

                      if (actualOutTotal < schedOutTotal) {
                        totalLateMinutes += (schedOutTotal - actualOutTotal);
                      } else if (actualOutTotal > schedOutTotal) {
                        totalOvertimeMinutes += (actualOutTotal - schedOutTotal);
                      }
                    }
                  });

                  const formatMinutes = (m: number) => {
                    if (m === 0) return '';
                    const h = Math.floor(m / 60);
                    const mins = m % 60;
                    return h > 0 ? `${h}س ${mins}د` : `${mins}د`;
                  };

                  return (
                    <React.Fragment key={emp.id}>
                      <tr className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="p-2 text-center font-mono text-gray-600 dark:text-gray-400 text-xs">{emp.code || '-'}</td>
                        <td className="p-2">
                          <div className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate" title={emp.name}>{emp.name}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate">{emp.jobTitle}</div>
                        </td>
                        <td className="p-2 text-center font-bold text-gray-700 dark:text-gray-300 text-xs">
                          {emp.salary?.toLocaleString() || 0}
                        </td>
                        <td className="p-2 text-center font-bold text-gray-700 dark:text-gray-300 text-xs">
                          {record.workingDays || 0}
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" 
                            value={record.basicSalary || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'basicSalary', parseFloat(e.target.value) || 0)}
                            className={inputClass}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center relative group">
                          <input 
                            type="number" 
                            value={record.lates || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'lates', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-red-600 dark:text-red-400`}
                            min="0"
                          />
                          {totalLateMinutes > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10" title={`إجمالي التأخير: ${formatMinutes(totalLateMinutes)}`}>
                              {formatMinutes(totalLateMinutes)}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center relative group">
                          <input 
                            type="number" 
                            value={record.overtime || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'overtime', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-green-600 dark:text-green-400`}
                            min="0"
                          />
                          {totalOvertimeMinutes > 0 && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10" title={`إجمالي الإضافي: ${formatMinutes(totalOvertimeMinutes)}`}>
                              {formatMinutes(totalOvertimeMinutes)}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" 
                            value={record.commission || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'commission', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-blue-600 dark:text-blue-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" 
                            value={record.deductions || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'deductions', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-red-600 dark:text-red-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" 
                            value={record.bonuses || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'bonuses', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-green-600 dark:text-green-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center bg-green-50 dark:bg-green-900/20 font-black text-sm text-green-700 dark:text-green-300">
                          {record.netSalary?.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <td colSpan={11} className="p-2 px-4">
                          <input
                            type="text"
                            placeholder="ملاحظات على الراتب..."
                            value={record.notes || ''}
                            onChange={(e) => handleRecordChange(emp.id, 'notes', e.target.value)}
                            className="w-full text-sm bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Salaries;
