import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Store, Receipt, Lock, ChevronLeft, AlertCircle, Mail, KeyRound, Loader2, AtSign } from 'lucide-react';
import { loginUser, requestPasswordReset, resetPassword } from '../services/api';

export default function Home({ onLogin }) {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(null);
  
  // States
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Password Reset States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = Request OTP, 2 = Enter OTP & New Password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    resetForms();
  };

  const resetForms = () => {
    setUsernameOrEmail('');
    setPassword('');
    setOtp('');
    setNewPassword('');
    setError('');
    setSuccessMessage('');
    setIsForgotPassword(false);
    setResetStep(1);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await loginUser({ username: usernameOrEmail, password, role: activeRole });
      if (response.data && response.data.success) {
        const userObj = response.data.user || {
          role: activeRole,
          name: usernameOrEmail ? usernameOrEmail.split('@')[0] : (activeRole === 'admin' ? 'System' : 'Employee'),
          email: usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail || activeRole}@store.com`
        };
        onLogin(userObj);
        setTimeout(() => navigate(activeRole === 'admin' ? '/admin-dashboard' : '/employee-dashboard'), 10);
        return;
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
        setIsLoading(false);
        return;
      }

      // Offline / Local fallback if backend is starting
      let matchedName = activeRole === 'admin' ? 'System' : (usernameOrEmail || 'Staff');
      if (activeRole === 'admin' && (password === 'admin123' || password === 'admin')) {
        onLogin({ role: 'admin', name: matchedName, email: 'systemdefault96@gmail.com' });
        setTimeout(() => navigate('/admin-dashboard'), 10);
        return;
      } else if (activeRole === 'employee' && (password === '1234' || password === 'emp123' || password === '123')) {
        onLogin({ role: 'employee', name: matchedName, email: `${matchedName.toLowerCase()}@gmail.com` });
        setTimeout(() => navigate('/employee-dashboard'), 10);
        return;
      }

      setError('Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await requestPasswordReset({ role: activeRole });
      setSuccessMessage(response.data.message);
      setResetStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await resetPassword({ role: activeRole, otp, newPassword });
      setSuccessMessage(response.data.message);
      setTimeout(() => {
        setIsForgotPassword(false);
        setResetStep(1);
        setPassword('');
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Side: Branding */}
      <div className="md:w-1/2 bg-green-700 text-white flex flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="z-10 text-center">
          <Store size={64} className="mx-auto mb-6 text-green-100" />
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">SuperMart POS</h1>
          <p className="text-green-200 text-xl font-medium">Fast, Reliable, and Smart Billing.</p>
        </div>
        <div className="mt-16 bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-sm w-72 flex flex-col items-center shadow-2xl z-10">
          <Receipt size={48} className="mb-4 text-green-100" />
          <div className="w-full bg-white text-green-900 rounded p-4 shadow-inner animate-pulse">
            <div className="w-full h-2 bg-gray-200 rounded mb-3"></div>
            <div className="w-3/4 h-2 bg-gray-200 rounded mb-3"></div>
            <div className="w-1/2 h-2 bg-gray-200 rounded mb-5"></div>
            <div className="w-full h-8 bg-green-600 rounded"></div>
          </div>
        </div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-green-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      {/* Right Side: Auth Flow */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative overflow-hidden">
        <div className="w-full max-w-md space-y-8 relative">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-500 mt-2">
              {!activeRole ? 'Please select your role to continue' : isForgotPassword ? 'Secure Password Reset' : 'Enter your credentials to access the terminal'}
            </p>
          </div>

          {/* VIEW 1: Role Selection */}
          {!activeRole && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={() => handleRoleSelect('admin')} className="w-full group relative flex items-center justify-between p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-600 hover:shadow-lg transition-all text-left">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-4 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><ShieldCheck size={32} /></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Administrator</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage store, inventory, employees & reports</p>
                  </div>
                </div>
              </button>

              <button onClick={() => handleRoleSelect('employee')} className="w-full group relative flex items-center justify-between p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-green-600 hover:shadow-lg transition-all text-left">
                <div className="flex items-center gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors"><User size={32} /></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Staff Member</h3>
                    <p className="text-sm text-gray-500 mt-1">Access POS, barcode billing & terminal</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* VIEW 2: Standard Login with Username & Password */}
          {activeRole && !isForgotPassword && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300 bg-white p-8 border-2 border-gray-200 rounded-xl shadow-lg">
              <div className="flex items-center gap-4 mb-6 border-b pb-4">
                <div className={`p-3 rounded-lg text-white ${activeRole === 'admin' ? 'bg-indigo-600' : 'bg-green-600'}`}>
                  {activeRole === 'admin' ? <ShieldCheck size={24} /> : <User size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 capitalize">{activeRole} Login</h3>
                  <p className="text-xs text-gray-500">Authentication Required</p>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Username / Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
                  <div className="relative">
                    <AtSign size={20} className="absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      value={usernameOrEmail} 
                      onChange={(e) => setUsernameOrEmail(e.target.value)} 
                      placeholder={activeRole === 'admin' ? "admin or systemdefault96@gmail.com" : "e.g. Kertick or kertick@gmail.com"} 
                      className={`w-full pl-10 p-3 border rounded-lg focus:outline-none focus:ring-2 ${activeRole === 'admin' ? 'focus:ring-indigo-500 border-indigo-200' : 'focus:ring-green-500 border-green-200'}`} 
                      autoFocus 
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Enter password..." 
                      className={`w-full pl-10 p-3 border rounded-lg focus:outline-none focus:ring-2 ${activeRole === 'admin' ? 'focus:ring-indigo-500 border-indigo-200' : 'focus:ring-green-500 border-green-200'}`} 
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className={`w-full text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 ${activeRole === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Unlock Terminal'}
                </button>
              </form>
              
              <button 
                onClick={() => setActiveRole(null)} 
                className="mt-4 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
              >
                <ChevronLeft size={16} /> Back to roles
              </button>
            </div>
          )}

          {/* VIEW 3: Forgot Password Flow */}
          {activeRole && isForgotPassword && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 bg-white p-8 border-2 border-gray-200 rounded-xl shadow-lg">
              {resetStep === 1 ? (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">Click below to send a One-Time Password (OTP) to the registered email for the <strong>{activeRole}</strong> account.</p>
                  
                  {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium flex gap-2 items-center"><AlertCircle size={16}/> {error}</div>}
                  {successMessage && <div className="text-emerald-600 bg-emerald-50 p-3 rounded-lg text-sm font-medium">{successMessage}</div>}
                  
                  <button type="submit" disabled={isLoading} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-900 transition flex justify-center items-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Mail size={18}/> Send OTP to Email</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {successMessage && <div className="text-emerald-600 bg-emerald-50 p-3 rounded-lg text-sm font-medium mb-4">{successMessage}</div>}
                  {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium mb-4">{error}</div>}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-Digit OTP</label>
                    <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-center tracking-[0.5em] font-bold text-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <KeyRound size={20} className="absolute left-3 top-3 text-gray-400" />
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password..." className="w-full pl-10 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" required />
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition flex justify-center items-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
                  </button>
                </form>
              )}

              <button onClick={() => setIsForgotPassword(false)} className="mt-4 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"><ChevronLeft size={16} /> Back to login</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}