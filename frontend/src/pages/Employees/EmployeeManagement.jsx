import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, Edit2, UserMinus, Shield, X, Loader2, CheckCircle, User, Mail, Lock, 
  RefreshCw, Clock, Activity, ShieldCheck, Wifi, WifiOff, KeyRound, LogIn, LogOut
} from 'lucide-react';
import { fetchEmployees, addEmployee, updateEmployee, deleteEmployee, sendAdminOtp, fetchReportsLogs } from '../../services/api';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [authLogs, setAuthLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastSynced, setLastSynced] = useState(new Date());
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

  const timerRef = useRef(null);

  useEffect(() => { 
    loadLiveEmployeeData(); 
  }, []);

  // 5-second automatic polling for real-time online/offline status & login logs
  useEffect(() => {
    if (isAutoRefresh) {
      timerRef.current = setInterval(() => {
        loadLiveEmployeeData(true);
      }, 5000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoRefresh]);

  const loadLiveEmployeeData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      // Fetch employees with live status
      const empRes = await fetchEmployees();
      if (empRes.data) setEmployees(empRes.data);

      // Fetch live auth & login database logs
      const logRes = await fetchReportsLogs('Login/Checkout', '');
      if (logRes.data && Array.isArray(logRes.data)) setAuthLogs(logRes.data);

    } catch (error) {
      console.error("Failed to load employee data", error);
    } finally {
      setIsLoading(false);
      setLastSynced(new Date());
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this employee?")) {
      try {
        await deleteEmployee(id);
        await loadLiveEmployeeData();
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
        await loadLiveEmployeeData();
        showToast('Employee updated successfully. Login page updated!');
      } else {
        await addEmployee(formData);
        await loadLiveEmployeeData();
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
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 z-50 animate-in slide-in-from-top-4">
          <CheckCircle size={20} /> {toastMessage}
        </div>
      )}

      {/* HEADER WITH LIVE STATUS & ADD BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            Employee & User Management
            <span className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-2.5 py-1 rounded-md tracking-wider uppercase shadow-sm">
              Live DB
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Live tracking of active employee sessions, login history, and role credentials</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Sync Badge */}
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 text-xs font-bold">
              <span className="relative flex h-2.5 w-2.5">
                {isAutoRefresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              {isAutoRefresh ? 'Live Sync Active' : 'Sync Paused'}
            </div>

            <button 
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`text-xs px-3 py-1.5 font-semibold rounded-lg border transition ${
                isAutoRefresh ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}
            >
              {isAutoRefresh ? 'Pause' : 'Live Sync'}
            </button>

            <button 
              onClick={() => loadLiveEmployeeData()}
              title="Refresh Live Data"
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <button 
            onClick={() => openModal()} 
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition font-bold shadow-md"
          >
            <UserPlus size={20} /> Add Employee
          </button>
        </div>
      </div>

      {/* EMPLOYEE TABLE WITH LIVE ONLINE/OFFLINE BADGES */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs font-bold uppercase border-b border-gray-200">
              <th className="p-4">Status</th>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Last Login (Live DB)</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {isLoading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline-block mr-2" size={18}/> Loading employee database...</td></tr>
            ) : employees.length > 0 ? employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-blue-50/30 transition">
                
                {/* Live Online / Offline Status Badge */}
                <td className="p-4 whitespace-nowrap">
                  {emp.isOnline || emp.status === 'online' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                      Offline
                    </span>
                  )}
                </td>

                <td className="p-4 font-bold text-gray-800">{emp.name}</td>
                <td className="p-4 text-gray-600">{emp.email}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 text-xs rounded-full font-bold inline-flex items-center gap-1.5 border ${
                    emp.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                    {emp.role === 'admin' ? <Shield size={13} /> : <User size={13} />}
                    {emp.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={13} className="text-gray-400"/> {emp.lastLogin || 'Never'}</span>
                </td>
                <td className="p-4 flex justify-center gap-3">
                  <button onClick={() => openModal(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Employee"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Remove Employee"><UserMinus size={18} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No employees found.</td></tr>
            )}
          </tbody>
        </table>
        
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Tracking {employees.length} employee accounts</span>
          <span>Last synced: {lastSynced.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* LIVE AUTHENTICATION & LOGIN AUDIT STREAM */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-indigo-600" /> Live Login & Security Audit Stream
        </h2>

        {authLogs.length > 0 ? (
          <div className="relative border-l-2 border-gray-100 ml-4 space-y-6">
            {authLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="relative pl-8">
                <div className="absolute -left-5 bg-white p-1 rounded-full border-2 border-gray-200 shadow-sm">
                  <div className="p-1.5 rounded-full bg-blue-50 text-blue-600">
                    {log.action.includes('Login') ? <LogIn size={16} className="text-emerald-600" /> : log.action.includes('Logout') ? <LogOut size={16} className="text-gray-500" /> : <KeyRound size={16} className="text-indigo-600" />}
                  </div>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-100/70 transition">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-800 text-sm">{log.action}</span>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1"><Clock size={12} /> {log.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No login stream records available yet.</p>
        )}
      </div>

      {/* MODAL FOR ADD/EDIT EMPLOYEE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              {editingEmployee ? <Edit2 size={20} className="text-indigo-600"/> : <UserPlus size={20} className="text-indigo-600"/>}
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <input 
                    type="email" required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="staff@store.com"
                    className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role Permission</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="employee">Employee / Counter Staff</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {editingEmployee ? 'New Password (Leave blank to keep existing)' : 'Password'}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <input 
                    type="password"
                    required={!editingEmployee}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* OTP Verification Input if changing password */}
              {isVerifyingOtp && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <ShieldCheck size={16} /> Admin Security Verification Required
                  </p>
                  <p className="text-xs text-amber-700">An OTP has been sent to Admin email. Enter it below to authorize this password change:</p>
                  <input 
                    type="text" required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-sm font-mono tracking-widest text-center font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md">
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin"/> Saving...</> : (editingEmployee ? 'Update Employee' : 'Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}