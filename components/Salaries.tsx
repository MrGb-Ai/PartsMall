import React, { useState, useMemo, useEffect } from 'react';
import type { Employee, AttendanceRecord, SalaryRecord, MgmtUser, SalesInvoice, SalesReturn, SalesRepresentative, Department } from '../types';
import { SaveIcon, CalendarIcon, DollarSignIcon, FileTextIcon, PrinterIcon, EyeIcon, EyeOffIcon, SearchIcon, XIcon } from 'lucide-react';

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

  // Attendance Log State
  const [showAttendanceLog, setShowAttendanceLog] = useState(false);
  const [searchEmpCode, setSearchEmpCode] = useState('');
  const [searchEmpName, setSearchEmpName] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(record => {
      const emp = employees.find(e => e.id === record.employeeId);
      if (!emp) return false;
      
      const matchCode = searchEmpCode ? (emp.code || '').toLowerCase().includes(searchEmpCode.toLowerCase()) : true;
      const matchName = searchEmpName ? (emp.name || '').toLowerCase().includes(searchEmpName.toLowerCase()) : true;
      const matchDateFrom = searchDateFrom ? record.date >= searchDateFrom : true;
      const matchDateTo = searchDateTo ? record.date <= searchDateTo : true;
      
      return matchCode && matchName && matchDateFrom && matchDateTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceRecords, employees, searchEmpCode, searchEmpName, searchDateFrom, searchDateTo]);

  const clearFilters = () => {
    setSearchEmpCode('');
    setSearchEmpName('');
    setSearchDateFrom('');
    setSearchDateTo('');
  };

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
          <button
            onClick={() => setShowAttendanceLog(!showAttendanceLog)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-bold text-sm"
          >
            {showAttendanceLog ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            <span>{showAttendanceLog ? 'إخفاء سجل الحضور والانصراف' : 'إظهار سجل الحضور والانصراف'}</span>
          </button>
        </div>

        {showAttendanceLog && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                سجل الحضور والانصراف
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">كود الموظف</label>
                  <input
                    type="text"
                    value={searchEmpCode}
                    onChange={(e) => setSearchEmpCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="بحث بالكود..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">اسم الموظف</label>
                  <input
                    type="text"
                    value={searchEmpName}
                    onChange={(e) => setSearchEmpName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="بحث بالاسم..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">التاريخ من</label>
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">التاريخ إلى</label>
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold text-sm"
                  >
                    <XIcon className="w-4 h-4" />
                    <span>تفريغ الحقول</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-white dark:bg-gray-800 sticky top-0 shadow-sm">
                    <tr>
                      <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">التاريخ</th>
                      <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">كود الموظف</th>
                      <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">اسم الموظف</th>
                      <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">الحضور</th>
                      <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">الانصراف</th>
                      <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">
                          لا توجد سجلات مطابقة للبحث
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map(record => {
                        const emp = employees.find(e => e.id === record.employeeId);
                        return (
                          <tr key={record.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="p-3 text-sm text-gray-800 dark:text-gray-200 font-mono">{record.date}</td>
                            <td className="p-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{emp?.code || '-'}</td>
                            <td className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200">{emp?.name || '-'}</td>
                            <td className="p-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{record.checkInTime || '-'}</td>
                            <td className="p-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{record.checkOutTime || '-'}</td>
                            <td className="p-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                record.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {record.status === 'present' ? 'حضور' :
                                 record.status === 'absent' ? 'غياب' :
                                 record.status === 'late' ? 'تأخير' :
                                 record.status === 'excused' ? 'إذن' : 'إجازة'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">كود الموظف</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">اسم الموظف</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">الراتب الأساسي</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">أيام العمل</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">الراتب لأيام العمل</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-28">تأخيرات</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-28">إضافي</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-28">عمولة مبيعات</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-28">خصم</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-28">مكافآت</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap bg-green-50 dark:bg-green-900/20">صافي المرتب</th>
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
                        <td className="p-4 text-center font-mono text-gray-600 dark:text-gray-400">{emp.code || '-'}</td>
                        <td className="p-4">
                          <div className="font-bold text-gray-800 dark:text-gray-200">{emp.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">{emp.jobTitle}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-700 dark:text-gray-300">
                          {emp.salary?.toLocaleString() || 0}
                        </td>
                        <td className="p-4 text-center font-bold text-gray-700 dark:text-gray-300">
                          {record.workingDays || 0}
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="number" 
                            value={record.basicSalary || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'basicSalary', parseFloat(e.target.value) || 0)}
                            className={inputClass}
                            min="0"
                          />
                        </td>
                        <td className="p-4 text-center relative group">
                          <input 
                            type="number" 
                            value={record.lates || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'lates', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-red-600 dark:text-red-400`}
                            min="0"
                          />
                          {totalLateMinutes > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm" title={`إجمالي التأخير: ${formatMinutes(totalLateMinutes)}`}>
                              {formatMinutes(totalLateMinutes)}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center relative group">
                          <input 
                            type="number" 
                            value={record.overtime || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'overtime', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-green-600 dark:text-green-400`}
                            min="0"
                          />
                          {totalOvertimeMinutes > 0 && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm" title={`إجمالي الإضافي: ${formatMinutes(totalOvertimeMinutes)}`}>
                              {formatMinutes(totalOvertimeMinutes)}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="number" 
                            value={record.commission || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'commission', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-blue-600 dark:text-blue-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="number" 
                            value={record.deductions || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'deductions', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-red-600 dark:text-red-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="number" 
                            value={record.bonuses || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'bonuses', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-green-600 dark:text-green-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-4 text-center bg-green-50 dark:bg-green-900/20 font-black text-lg text-green-700 dark:text-green-300">
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
