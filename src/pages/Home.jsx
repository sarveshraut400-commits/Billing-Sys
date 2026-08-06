import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, User, Store, Lock, ChevronLeft, AlertCircle, 
  AtSign, KeyRound, Loader2, Database, ArrowRight, CheckCircle2, ShoppingBag
} from 'lucide-react';
import { loginUser, requestPasswordReset, resetPassword } from '../services/api';

export default function Home({ onLogin }) {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(null);
  
  // Login State
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Password Reset State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
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

  const fillQuickCredentials = (role, user, pass) => {
    setActiveRole(role);
    setUsernameOrEmail(user);
    setPassword(pass);
    setError('');
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

      // Offline / Fallback credentials
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
      await resetPassword({ role: activeRole, otp, newPassword });
      setSuccessMessage('Password reset successfully! Log in with your new password.');
      setTimeout(() => resetForms(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
      
      {/* Top Navbar */}
      <header className="p-6 max-w-6xl w-full mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl shadow-sm text-white font-bold">
            <Store size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              SuperMart POS <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">v1.0</span>
            </h1>
            <p className="text-xs text-slate-500">Retail Operations & Billing System</p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600 flex items-center gap-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            System Online
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col items-center justify-center">
        
        {!activeRole ? (
          /* LIGHT & CLEAN ROLE SELECTION */
          <div className="w-full space-y-8 animate-in fade-in duration-200">
            
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Welcome to SuperMart POS
              </h2>
              <p className="text-slate-500 text-sm">
                Select your portal to sign in and manage store sales, inventory, and receipts.
              </p>
            </div>

            {/* Quick Demo Credentials */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl max-w-lg mx-auto text-center space-y-2 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">⚡ Quick Demo Accounts (Click to auto-fill)</span>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => fillQuickCredentials('admin', 'admin', 'admin123')}
                  className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
                >
                  👑 Admin (admin / admin123)
                </button>
                <button 
                  onClick={() => fillQuickCredentials('employee', 'Pars', '1234')}
                  className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-100 transition"
                >
                  💼 Cashier Pars (Pars / 1234)
                </button>
                <button 
                  onClick={() => fillQuickCredentials('employee', 'Kertick', '1234')}
                  className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                >
                  💼 Sales Kertick (Kertick / 1234)
                </button>
              </div>
            </div>

            {/* Role Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              
              {/* Admin Card */}
              <div 
                onClick={() => handleRoleSelect('admin')}
                className="bg-white border border-slate-200 hover:border-emerald-500 p-7 rounded-2xl cursor-pointer transition shadow-sm hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4 group-hover:scale-105 transition">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Admin Dashboard</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Full store management: sales charts, inventory catalog, employee shift status, activity logs, and DB backups.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs font-bold text-emerald-600 pt-3 border-t border-slate-100">
                  <span>Sign In as Admin</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                </div>
              </div>

              {/* Staff POS Card */}
              <div 
                onClick={() => handleRoleSelect('employee')}
                className="bg-white border border-slate-200 hover:border-teal-500 p-7 rounded-2xl cursor-pointer transition shadow-sm hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="p-3.5 bg-teal-50 text-teal-600 rounded-xl w-fit mb-4 group-hover:scale-105 transition">
                    <User size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Staff POS Terminal</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Cashier checkout counter: barcode scanner lookup, price checker, automated WhatsApp receipts, and shift sales.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs font-bold text-teal-600 pt-3 border-t border-slate-100">
                  <span>Open Billing Terminal</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* LIGHT LOGIN FORM */
          <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-md relative animate-in fade-in duration-200">
            
            <button 
              onClick={() => setActiveRole(null)}
              className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Back
            </button>

            <div className="text-center pt-2 pb-6">
              <div className={`p-3 mx-auto w-fit rounded-xl mb-2 ${
                activeRole === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-teal-600'
              }`}>
                {activeRole === 'admin' ? <ShieldCheck size={28} /> : <User size={28} />}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 capitalize">{activeRole} Login</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your username or email and password</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {!isForgotPassword ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Username or Email */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Username or Email</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder={activeRole === 'admin' ? 'admin' : 'Pars, Kertick, or email...'}
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      required
                    />
                    <AtSign size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      required
                    />
                    <KeyRound size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="text-right">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-slate-500 hover:text-emerald-600 transition"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 text-white font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${
                    activeRole === 'admin' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In →'}
                </button>

              </form>
            ) : (
              /* FORGOT PASSWORD FORM */
              <div className="space-y-4">
                {resetStep === 1 ? (
                  <form onSubmit={handleRequestOTP} className="space-y-4">
                    <p className="text-xs text-slate-500">An OTP will be sent to the registered email address for this role.</p>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition"
                    >
                      {isLoading ? <Loader2 className="animate-spin inline" size={18} /> : 'Send OTP to Email'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Enter 6-Digit OTP</label>
                      <input 
                        type="text" 
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-center tracking-widest text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                      <input 
                        type="password" 
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition"
                    >
                      {isLoading ? <Loader2 className="animate-spin inline" size={18} /> : 'Reset Password'}
                    </button>
                  </form>
                )}
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setIsForgotPassword(false)} className="text-xs text-slate-500 hover:text-slate-800">
                    Return to Login
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-400 border-t border-slate-200">
        SuperMart POS System • © {new Date().getFullYear()} SuperMart Corp
      </footer>

    </div>
  );
}