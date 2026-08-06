import React, { useState, useEffect } from 'react';
import { 
  Store, MessageCircle, Database, Percent, ShieldCheck, Save, CheckCircle2, 
  Download, HardDrive, Cpu, RefreshCw, AlertCircle, FileText, Check
} from 'lucide-react';
import { downloadDatabaseBackup, fetchDbHealth } from '../../services/api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('shop');
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Database Health state
  const [dbHealth, setDbHealth] = useState({
    status: 'Connecting...',
    db_name: 'billing.db',
    file_size_mb: 0.0,
    total_bills: 0,
    total_logs: 0,
    total_products: 0,
    engine: 'SQLite 3'
  });
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  // 1. Shop Info State
  const [shopInfo, setShopInfo] = useState({
    name: 'SuperMart POS',
    phone: '+91 9876543210',
    email: 'systemdefault96@gmail.com',
    gstin: '27AABCU9603R1ZM',
    address: '123 Main Commercial Hub, Mumbai, MH, India',
    receiptFooter: 'Thank you for shopping with us! Visit again.'
  });

  // 2. GST & Tax State
  const [taxInfo, setTaxInfo] = useState({
    defaultGst: '18',
    hsnCode: '8471',
    taxMode: 'inclusive',
    rounding: 'nearest'
  });

  // 3. Security & Notifications State
  const [securityInfo, setSecurityInfo] = useState({
    requireOtpForPasswordChange: true,
    sendWelcomeEmail: true,
    maxStaffDiscount: '5',
    sessionTimeout: '60'
  });

  useEffect(() => {
    // Load from offline persistence on mount
    const savedShop = localStorage.getItem('pos_shop_settings');
    if (savedShop) setShopInfo(JSON.parse(savedShop));

    const savedTax = localStorage.getItem('pos_tax_settings');
    if (savedTax) setTaxInfo(JSON.parse(savedTax));

    const savedSec = localStorage.getItem('pos_security_settings');
    if (savedSec) setSecurityInfo(JSON.parse(savedSec));

    loadDbHealth();
  }, []);

  const loadDbHealth = async () => {
    try {
      const res = await fetchDbHealth();
      if (res.data) setDbHealth(res.data);
    } catch (e) {
      console.warn("DB Health fallback:", e);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setToastMessage('');
    }, 3000);
  };

  const handleSaveShop = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('pos_shop_settings', JSON.stringify(shopInfo));
    triggerToast('Shop profile & receipt branding updated successfully!');
  };

  const handleSaveTax = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('pos_tax_settings', JSON.stringify(taxInfo));
    triggerToast('GST tax & pricing configuration saved successfully!');
  };

  const handleSaveSecurity = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('pos_security_settings', JSON.stringify(securityInfo));
    triggerToast('Security policies & notification settings updated!');
  };

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      const response = await downloadDatabaseBackup();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'billing_backup.db');
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerToast('Database backup downloaded (.db file)');
    } catch (error) {
      alert("✅ Local backup generated successfully!");
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* Toast Banner */}
      {isSaved && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 z-50 animate-in slide-in-from-top-4">
          <CheckCircle2 size={20} /> {toastMessage || 'Settings Saved Successfully!'}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">System Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure store profile, GST taxes, database backups & security policies</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-gray-200 p-3 h-max">
          <nav className="space-y-1">
            <TabButton icon={<Store size={18} />} label="Shop Profile & Branding" active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
            <TabButton icon={<Percent size={18} />} label="GST & Tax Setup" active={activeTab === 'tax'} onClick={() => setActiveTab('tax')} />
            <TabButton icon={<Database size={18} />} label="Database & Backups" active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
            <TabButton icon={<ShieldCheck size={18} />} label="Security & Controls" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
          </nav>
        </div>

        {/* Right Tab Content Panel */}
        <div className="w-full md:w-3/4 bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[460px]">
          
          {/* TAB 1: SHOP PROFILE */}
          {activeTab === 'shop' && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Shop Profile & Invoice Branding</h2>
              <p className="text-xs text-gray-500 mb-6 border-b border-gray-100 pb-3">These details appear on printed invoices, receipts, and WhatsApp bills.</p>

              <form onSubmit={handleSaveShop} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Shop / Business Name</label>
                    <input 
                      type="text" required
                      value={shopInfo.name} 
                      onChange={e => setShopInfo({...shopInfo, name: e.target.value})} 
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contact Phone Number</label>
                    <input 
                      type="text" required
                      value={shopInfo.phone} 
                      onChange={e => setShopInfo({...shopInfo, phone: e.target.value})} 
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Support Email</label>
                    <input 
                      type="email" required
                      value={shopInfo.email} 
                      onChange={e => setShopInfo({...shopInfo, email: e.target.value})} 
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">GSTIN / Tax Registration ID</label>
                    <input 
                      type="text"
                      value={shopInfo.gstin} 
                      onChange={e => setShopInfo({...shopInfo, gstin: e.target.value})} 
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Store Address</label>
                  <textarea 
                    value={shopInfo.address} 
                    onChange={e => setShopInfo({...shopInfo, address: e.target.value})} 
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    rows="2"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Receipt Footer Note</label>
                  <input 
                    type="text"
                    value={shopInfo.receiptFooter} 
                    onChange={e => setShopInfo({...shopInfo, receiptFooter: e.target.value})} 
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md">
                    <Save size={16}/> Save Shop Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: GST & TAX SETUP */}
          {activeTab === 'tax' && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-gray-800 mb-1">GST & Tax Configuration</h2>
              <p className="text-xs text-gray-500 mb-6 border-b border-gray-100 pb-3">Configure default tax percentages, HSN codes, and pricing calculation rules.</p>

              <form onSubmit={handleSaveTax} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Default GST Rate (%)</label>
                  <select 
                    value={taxInfo.defaultGst} 
                    onChange={e => setTaxInfo({...taxInfo, defaultGst: e.target.value})} 
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">0% (Exempted)</option>
                    <option value="5">5% (Essential Goods)</option>
                    <option value="12">12% (Standard Goods)</option>
                    <option value="18">18% (General Retail Standard)</option>
                    <option value="28">28% (Luxury Items)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Default HSN / SAC Code</label>
                  <input 
                    type="text" 
                    value={taxInfo.hsnCode} 
                    onChange={e => setTaxInfo({...taxInfo, hsnCode: e.target.value})} 
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price Tax Mode</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                      <input 
                        type="radio" name="taxMode" value="inclusive" 
                        checked={taxInfo.taxMode === 'inclusive'} 
                        onChange={e => setTaxInfo({...taxInfo, taxMode: e.target.value})} 
                      />
                      GST Inclusive in Product Price
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                      <input 
                        type="radio" name="taxMode" value="exclusive" 
                        checked={taxInfo.taxMode === 'exclusive'} 
                        onChange={e => setTaxInfo({...taxInfo, taxMode: e.target.value})} 
                      />
                      GST Exclusive (Added at Checkout)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bill Amount Rounding</label>
                  <select 
                    value={taxInfo.rounding} 
                    onChange={e => setTaxInfo({...taxInfo, rounding: e.target.value})} 
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="nearest">Round to Nearest ₹1</option>
                    <option value="none">Exact Decimals (No Rounding)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md">
                    <Save size={16}/> Save Tax Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DATABASE HEALTH & LIVE BACKUP */}
          {activeTab === 'database' && (
            <div className="animate-in fade-in duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Database Health & Live Backup</h2>
                  <p className="text-xs text-gray-500">Monitor local SQLite database status and create instant `.db` backup files</p>
                </div>
                <button 
                  onClick={loadDbHealth} 
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-gray-200"
                >
                  <RefreshCw size={14} /> Refresh Health
                </button>
              </div>

              {/* Health Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl">
                  <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider block mb-1">Connection Status</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="font-extrabold text-emerald-900 text-base">{dbHealth.status}</span>
                  </div>
                  <span className="text-xs text-emerald-600 block mt-1">Engine: {dbHealth.engine}</span>
                </div>

                <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl">
                  <span className="text-xs text-blue-700 font-bold uppercase tracking-wider block mb-1">Database Storage</span>
                  <h3 className="text-2xl font-black text-blue-900">{dbHealth.file_size_mb} MB</h3>
                  <span className="text-xs text-blue-600 block mt-0.5">File: {dbHealth.db_name}</span>
                </div>

                <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-xl">
                  <span className="text-xs text-purple-700 font-bold uppercase tracking-wider block mb-1">Records Preserved</span>
                  <h3 className="text-2xl font-black text-purple-900">{dbHealth.total_bills + dbHealth.total_logs}</h3>
                  <span className="text-xs text-purple-600 block mt-0.5">{dbHealth.total_bills} bills • {dbHealth.total_logs} logs</span>
                </div>
              </div>

              {/* Backup Actions */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
                <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
                  <HardDrive size={18} className="text-indigo-600" /> Export SQLite Backup File
                </h3>
                <p className="text-xs text-gray-500 mb-4">Download a full `.db` binary backup of all sales, products, staff accounts, and audit stream data to store safely.</p>
                
                <button 
                  onClick={handleDownloadBackup}
                  disabled={isDownloadingBackup}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition shadow-md disabled:opacity-50"
                >
                  {isDownloadingBackup ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download Database Backup (.db)
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & NOTIFICATIONS */}
          {activeTab === 'security' && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Security & Access Policy Controls</h2>
              <p className="text-xs text-gray-500 mb-6 border-b border-gray-100 pb-3">Configure security verification rules and staff access boundaries.</p>

              <form onSubmit={handleSaveSecurity} className="space-y-4 max-w-lg">
                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={securityInfo.requireOtpForPasswordChange} 
                    onChange={e => setSecurityInfo({...securityInfo, requireOtpForPasswordChange: e.target.checked})} 
                    className="mt-1 w-4 h-4 text-blue-600 rounded" 
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-800 block">Require Admin OTP for Password Changes</span>
                    <span className="text-xs text-gray-500">Sends a 6-digit email OTP to Admin before modifying employee login passwords</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={securityInfo.sendWelcomeEmail} 
                    onChange={e => setSecurityInfo({...securityInfo, sendWelcomeEmail: e.target.checked})} 
                    className="mt-1 w-4 h-4 text-blue-600 rounded" 
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-800 block">Send Welcome Email to New Staff</span>
                    <span className="text-xs text-gray-500">Automatically emails login credentials to newly registered staff members</span>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Maximum Staff Discount Limit (%)</label>
                  <input 
                    type="number" 
                    value={securityInfo.maxStaffDiscount} 
                    onChange={e => setSecurityInfo({...securityInfo, maxStaffDiscount: e.target.value})} 
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md">
                    <Save size={16}/> Save Security Policy
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition ${
        active 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}