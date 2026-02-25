
import React, { useState } from 'react';
import { ConfirmationModal, EditIcon, DeleteIcon, ViewIcon } from './Shared';
import type { Unit, Item, NotificationType, MgmtUser } from '../types';

interface UnitManagementProps {
    units: Unit[];
    setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
}

const UnitManagement: React.FC<UnitManagementProps> = ({ units, setUnits, items, setItems, showNotification, currentUser }) => {
    const [formData, setFormData] = useState<Omit<Unit, 'id' | 'createdBy' | 'createdAt'> & { id: number | null }>({ id: null, name: '', description: '' });
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

    const canEdit = currentUser.permissions.includes('unitManagement_edit');
    const canDelete = currentUser.permissions.includes('unitManagement_delete');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name) {
            alert("اسم الوحدة مطلوب");
            return;
        }

        if (isEditing && formData.id) {
             if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            setUnits(units.map(u => u.id === formData.id ? { 
                ...u, 
                ...formData, 
                id: formData.id!,
                lastModifiedBy: currentUser.username,
                lastModifiedAt: new Date().toISOString()
            } : u));
            showNotification('edit');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل بيانات الوحدة ${formData.name}` }));
        } else {
            const newUnit: Unit = {
                id: Date.now(),
                name: formData.name,
                description: formData.description,
                createdBy: currentUser.username,
                createdAt: new Date().toISOString()
            };
            setUnits([...units, newUnit]);
            showNotification('add');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة وحدة جديدة ${formData.name}` }));
        }
        resetForm();
    };

    const handleEdit = (unit: Unit, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(unit);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (unit: Unit) => {
        // Protection: Check if unit is used in items
        const isUsed = items.some(item => item.unitId === unit.id);
        
        if (isUsed) {
            const usageCount = items.filter(item => item.unitId === unit.id).length;
            alert(`لا يمكن حذف الوحدة "${unit.name}" لأنها مستخدمة في ${usageCount} صنف.\n\nيرجى تعديل الأصناف المرتبطة أولاً لاختيار وحدة أخرى.`);
            return;
        }

        setUnitToDelete(unit);
        setIsDeleteModalOpen(true);
    };
    
    const performDelete = () => {
        if (unitToDelete) {
            setUnits(units.filter(u => u.id !== unitToDelete.id));
            showNotification('delete');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بحذف الوحدة ${unitToDelete.name}` }));
        }
        setIsDeleteModalOpen(false);
        setUnitToDelete(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData({ id: null, name: '', description: '' });
    }

    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <>
            {isDeleteModalOpen && unitToDelete && (
                <ConfirmationModal
                    title="تأكيد حذف الوحدة"
                    message={`هل أنت متأكد من حذف الوحدة "${unitToDelete.name}"؟`}
                    onConfirm={performDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    confirmText="حذف"
                    confirmColor="bg-red-600"
                />
            )}
            <div className="space-y-8">
                 <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تكويد الوحدات</h1>
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-6">{isViewing ? 'عرض بيانات الوحدة' : isEditing ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass} htmlFor="name">
                                    اسم الوحدة
                                    <span className="text-red-500 dark:text-red-400 font-normal text-sm mr-1">(مطلوب)</span>
                                </label>
                                <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="description">الوصف</label>
                                <input id="description" name="description" type="text" value={formData.description} onChange={handleInputChange} className={inputClass} disabled={isViewing} />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-4 space-x-reverse pt-4">
                           {isEditing && (<button type="button" onClick={resetForm} className="bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 transform hover:-translate-y-1 transition-all duration-300">إلغاء</button>)}
                           {!isViewing && <button type="submit" className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:-translate-y-1 transition-all duration-300">{isEditing ? 'تحديث الوحدة' : 'إضافة وحدة'}</button>}
                        </div>
                    </form>
                </div>
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                     <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">قائمة الوحدات</h2>
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="border-b-2 border-gray-300 dark:border-gray-600">
                                <tr>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">اسم الوحدة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الوصف</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">تم بواسطة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map((unit) => (
                                <tr key={unit.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                    <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{unit.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{unit.description}</td>
                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex flex-col">
                                            <span>{unit.createdBy || 'غير معروف'}</span>
                                            {unit.lastModifiedBy && <span className="text-xs text-gray-500">تعديل: {unit.lastModifiedBy}</span>}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button onClick={() => handleEdit(unit, !canEdit)} className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors duration-200" title={canEdit ? 'تعديل' : 'عرض'}>
                                                {canEdit ? <EditIcon /> : <ViewIcon />}
                                            </button>
                                            {canDelete && <button onClick={() => handleDelete(unit)} className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors duration-200" title="حذف"><DeleteIcon /></button>}
                                        </div>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>
        </>
    );
};

export default UnitManagement;
