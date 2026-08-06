import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, UserMinus, Shield, X, Loader2, CheckCircle, User, Mail, Lock } from 'lucide-react';
import { fetchEmployees, addEmployee, updateEmployee, deleteEmployee, sendAdminOtp } from '../../services/api';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');
  
  // Modal & OTP States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'employee', password: ''
  });

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    try {
      const response = await fetchEmployees();
      if (response.data) setEmployees(response.data);
    } catch (error) {
      console.error("Failed to load employees", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to remove this employee?")) {
      try {
        await deleteEmployee(id);
        await loadEmployees();
        showToast('Employee deleted successfully.');
      } catch (error) {
        console.warn("Failed to delete.");
      }
    }
  };

  const openModal = (employee = null) => {
    setError('');
    setIsVerifyingOtp(false);
    setOtp('');
    
    if (employee) {
      setEditingEmployee(employee);
      setFormData({ name: employee.name, email: employee.email, role: employee.role, password: '' });
    } else {
      setEditingEmployee(null);
      setFormData({ name: '', email: '', role: 'employee', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (editingEmployee) {
        if (formData.password && !isVerifyingOtp) {
          await sendAdminOtp();
          setIsVerifyingOtp(true);
          setIsSubmitting(false);
          return; 
        }

        await updateEmployee(editingEmployee.id, { ...formData, otp });
        await loadEmployees();
        showToast('Employee updated successfully. Login page updated!');
      } else {
        await addEmployee(formData);
        await loadEmployees();
        showToast(`✅ Employee created and welcome email sent to ${formData.email}!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save. Check backend connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      
      {toastMessage && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl font-bold flex items-center gap-2 z-50 animate-in slide-in-from-top-4">
          <CheckCircle size={20} /> {toastMessage}
        </div>
      )}

      {/* HEADER WITH ADD BUTTON RESTORED */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition font-bold shadow-md">
          <UserPlus size={20} /> Add Employee
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm border-b">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Last Login</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading employees...</td></tr>
            ) : employees.length > 0 ? employees.map((emp) => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{emp.name}</td>
                <td className="p-4 text-gray-600">{emp.email}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 text-xs rounded-full font-bold flex items-center gap-1 w-max ${emp.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                    {emp.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                    {emp.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500">{emp.lastLogin || 'Never'}</td>
                <td className="p-4 flex justify-center gap-3">
                  <button onClick={() => openModal(emp)} className="text-blue-500 hover:text-blue-700"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:text-red-700"><UserMinus size={18} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">
                {isVerifyingOtp ? 'Security Verification' : editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
            </div>
            
            {/* VIEW 2: OTP Verification Screen */}
            {isVerifyingOtp ? (
              <div className="p-6 space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-indigo-50 p-4 rounded-lg text-indigo-700 text-sm mb-4 border border-indigo-100">
                  <p className="font-bold flex items-center gap-2 mb-1"><Lock size={16} /> Admin Authorization Required</p>
                  <p>An OTP has been sent to the Admin's registered email. Please enter it to authorize this password change.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Enter 6-Digit Admin OTP</label>
                  <input 
                    type="text" 
                    maxLength="6" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value)} 
                    className="w-full p-3 border rounded focus:border-indigo-500 outline-none text-center tracking-[0.5em] font-bold text-lg bg-gray-50" 
                    placeholder="000000"
                    required 
                    autoFocus
                  />
                </div>

                {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-bold">{error}</p>}

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" disabled={isSubmitting} onClick={() => setIsVerifyingOtp(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 font-medium">Cancel Change</button>
                  <button type="button" disabled={isSubmitting} onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 flex items-center gap-2">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Save'}
                  </button>
                </div>
              </div>
            ) : (
              
              /* VIEW 1: Standard Add/Edit Form */
              <form onSubmit={handleSubmit} className="p-6 space-y-4 animate-in slide-in-from-left-4 duration-300">
                {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-bold">{error}</p>}
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded focus:border-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2 border rounded focus:border-indigo-500 outline-none">
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      {editingEmployee ? 'Change Password' : 'Password'}
                    </label>
                    <input 
                      required={!editingEmployee} 
                      type="password" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      className="w-full p-2 border rounded focus:border-indigo-500 outline-none" 
                      placeholder={editingEmployee ? "Leave blank to keep current" : ""}
                    />
                  </div>
                </div>

                {!editingEmployee && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                    <Mail size={14} /> An email with these credentials will be sent automatically.
                  </p>
                )}

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 flex items-center gap-2">
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : editingEmployee ? 'Save Changes' : 'Create & Email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}