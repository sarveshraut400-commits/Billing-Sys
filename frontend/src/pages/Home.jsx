import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, User, Store, Lock, ChevronLeft, AlertCircle, 
  AtSign, KeyRound, Loader2, Database, ArrowRight, CheckCircle2, ShoppingBag,
  QrCode, Smartphone, BarChart3, Receipt, Zap, Sparkles
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await loginUser({ username: usernameOrEmail, password, role: activeRole });
      if (response.data && response.data.success) {
        const userObj = response.data.user;
        onLogin(userObj);
        setTimeout(() => navigate(activeRole === 'admin' ? '/admin-dashboard' : '/employee-dashboard'), 10);
        return;
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Invalid username or password. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await requestPasswordReset({ 
        role: activeRole,
        email: usernameOrEmail,
        username: usernameOrEmail
      });
      setSuccessMessage(response.data.message || 'OTP dispatched to registered email!');
      setResetStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await resetPassword({ 
        role: activeRole, 
        email: usernameOrEmail,
        username: usernameOrEmail,
        otp, 
        newPassword 
      });
      setSuccessMessage('Password reset successfully! Log in with your new password.');
      setTimeout(() => resetForms(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
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

            {/* Informative Highlights & Capabilities Banner */}
            <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl max-w-3xl mx-auto shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-3 px-1">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" />
                  Enterprise POS Capabilities
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Ready for Retail Shift
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between hover:bg-emerald-50/50 hover:border-emerald-200/80 transition group">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg w-fit mb-2 group-hover:scale-105 transition">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Barcode Checkout</div>
                    <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Instant hardware & camera scanning</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between hover:bg-teal-50/50 hover:border-teal-200/80 transition group">
                  <div className="p-2 bg-teal-100 text-teal-700 rounded-lg w-fit mb-2 group-hover:scale-105 transition">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">WhatsApp Invoicing</div>
                    <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Automated PDF receipts via link</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between hover:bg-indigo-50/50 hover:border-indigo-200/80 transition group">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg w-fit mb-2 group-hover:scale-105 transition">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Fiscal Analytics</div>
                    <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Live store revenue & profit tracking</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between hover:bg-amber-50/50 hover:border-amber-200/80 transition group">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg w-fit mb-2 group-hover:scale-105 transition">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Role Security</div>
                    <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Admin governance & shift audits</div>
                  </div>
                </div>
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
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {activeRole === 'admin' ? 'Admin Username or Registered Email' : 'Staff Username or Registered Email'}
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder={activeRole === 'admin' ? 'admin or yourname@gmail.com' : 'Pars, Kertick, or email...'}
                          value={usernameOrEmail}
                          onChange={(e) => setUsernameOrEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        />
                        <AtSign size={16} className="absolute left-3 top-3.5 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">A 6-digit security OTP will be dispatched to your registered email address.</p>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"
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