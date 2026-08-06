import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, User, Store, Lock, ChevronLeft, AlertCircle, 
  AtSign, KeyRound, Loader2, Sparkles, Cpu, MessageSquare, Database, ArrowRight, CheckCircle2
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

      setError('Invalid username or password credentials.');
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden font-sans">
      
      {/* Dynamic Ambient Background Glow Effect */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="p-6 max-w-7xl w-full mx-auto flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl shadow-lg text-slate-950 font-black text-xl">
            <Store size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              SuperMart POS <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Enterprise v1.0</span>
            </h1>
            <p className="text-xs text-slate-400">IoT Retail Operations & Automated Billing System</p>
          </div>
        </div>

        {/* Live System Badges */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-300 flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            IoT Scanner API Active
          </span>
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-300 flex items-center gap-1.5 font-medium">
            <Database size={14} className="text-teal-400" />
            SQLite Database Connected
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col items-center justify-center z-10">
        
        {!activeRole ? (
          /* HERO LANDING PAGE - ROLE SELECTION */
          <div className="w-full space-y-10 animate-in fade-in duration-300">
            
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider rounded-full inline-flex items-center gap-2">
                <Sparkles size={14} /> Retail Operations Terminal
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight leading-tight">
                Empowering Smart Retail & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">IoT Billing</span>
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Select your portal to log in. Access live sales tracking, automated WhatsApp digital invoices, hardware barcode scanning, and catalog management.
              </p>
            </div>

            {/* Quick-Fill One-Click Demo Credentials Pills */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl max-w-xl mx-auto text-center space-y-2">
              <span className="text-xs text-slate-400 font-semibold block">⚡ Quick Demo Login Accounts (Click to auto-fill)</span>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => fillQuickCredentials('admin', 'admin', 'admin123')}
                  className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} /> Admin (admin / admin123)
                </button>
                <button 
                  onClick={() => fillQuickCredentials('employee', 'Pars', '1234')}
                  className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold hover:bg-cyan-500/30 transition flex items-center gap-1.5"
                >
                  <User size={14} /> Cashier Pars (Pars / 1234)
                </button>
                <button 
                  onClick={() => fillQuickCredentials('employee', 'Kertick', '1234')}
                  className="px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-xl text-xs font-bold hover:bg-teal-500/30 transition flex items-center gap-1.5"
                >
                  <User size={14} /> Sales Kertick (Kertick / 1234)
                </button>
              </div>
            </div>

            {/* Portal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              
              {/* Admin Portal Card */}
              <div 
                onClick={() => handleRoleSelect('admin')}
                className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-2xl relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition text-emerald-400">
                  <ShieldCheck size={120} />
                </div>
                <div>
                  <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit rounded-2xl mb-6 group-hover:scale-110 transition">
                    <ShieldCheck size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Full store control: live 5s revenue charts, employee shift management, GST tax setup, activity audit logs, and database backup downloads.
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-emerald-400 pt-4 border-t border-slate-800">
                  <span>Enter Executive Portal</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                </div>
              </div>

              {/* Staff POS Terminal Card */}
              <div 
                onClick={() => handleRoleSelect('employee')}
                className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 p-8 rounded-3xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-2xl relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition text-teal-400">
                  <User size={120} />
                </div>
                <div>
                  <div className="p-4 bg-teal-500/10 text-teal-400 border border-teal-500/20 w-fit rounded-2xl mb-6 group-hover:scale-110 transition">
                    <User size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Staff POS Terminal</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Counter terminal for cashiers: IoT barcode scanning, instant product price checker, automated WhatsApp PDF receipts, and shift sales tracking.
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-teal-400 pt-4 border-t border-slate-800">
                  <span>Open Billing Terminal</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                </div>
              </div>

            </div>

            {/* Feature Highlights Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 text-xs text-slate-400">
              <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                <Cpu className="text-emerald-400" size={18} />
                <span>IoT Hardware Scanner API</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                <MessageSquare className="text-teal-400" size={18} />
                <span>Automated WhatsApp Bills</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                <Database className="text-cyan-400" size={18} />
                <span>Permanent SQLite Storage</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="text-emerald-400" size={18} />
                <span>PDF Tax Invoices</span>
              </div>
            </div>

          </div>
        ) : (
          /* LOGIN / PASSWORD RESET FORM */
          <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 p-8 rounded-3xl shadow-2xl animate-in fade-in duration-200 relative">
            
            <button 
              onClick={() => setActiveRole(null)}
              className="absolute top-6 left-6 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Back
            </button>

            <div className="text-center pt-4 pb-6">
              <div className={`p-3.5 mx-auto w-fit rounded-2xl mb-3 ${
                activeRole === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              }`}>
                {activeRole === 'admin' ? <ShieldCheck size={32} /> : <User size={32} />}
              </div>
              <h3 className="text-2xl font-black text-white capitalize">{activeRole} Portal Login</h3>
              <p className="text-xs text-slate-400 mt-1">Enter your assigned username or email and password</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {!isForgotPassword ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Username or Email Input */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Username or Email</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder={activeRole === 'admin' ? 'admin or systemdefault96@gmail.com' : 'Pars, Kertick, or email...'}
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                      required
                    />
                    <AtSign size={18} className="absolute left-3 top-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                      required
                    />
                    <KeyRound size={18} className="absolute left-3 top-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 text-slate-950 font-extrabold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 ${
                    activeRole === 'admin' ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-teal-400 hover:bg-teal-300'
                  }`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Authenticate & Sign In →'}
                </button>

              </form>
            ) : (
              /* FORGOT PASSWORD FORM */
              <div className="space-y-4">
                {resetStep === 1 ? (
                  <form onSubmit={handleRequestOTP} className="space-y-4">
                    <p className="text-xs text-slate-400">An OTP will be sent to the registered email address for this role.</p>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full py-3.5 bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm hover:bg-emerald-300 transition"
                    >
                      {isLoading ? <Loader2 className="animate-spin inline" size={18} /> : 'Send OTP to Email'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Enter 6-Digit OTP</label>
                      <input 
                        type="text" 
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-center tracking-widest text-slate-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">New Password</label>
                      <input 
                        type="password" 
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full py-3.5 bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm hover:bg-emerald-300 transition"
                    >
                      {isLoading ? <Loader2 className="animate-spin inline" size={18} /> : 'Reset Password'}
                    </button>
                  </form>
                )}
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setIsForgotPassword(false)} className="text-xs text-slate-400 hover:text-white">
                    Return to Login
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 border-t border-slate-900 z-10">
        SuperMart POS Enterprise System • Built for Hardware & Retail Integration • © {new Date().getFullYear()} SuperMart Corp
      </footer>

    </div>
  );
}