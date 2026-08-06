import React, { useState, useEffect } from 'react';
import { Store, MessageCircle, Database, Printer, Save, CheckCircle } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('shop');
  const [isSaved, setIsSaved] = useState(false);

  // Shop State
  const [shopInfo, setShopInfo] = useState({
    name: 'SuperMart POS',
    phone: '+91 9876543210',
    address: '123 Main Street, Mumbai, India'
  });

  // WhatsApp State
  const [waInfo, setWaInfo] = useState({
    instanceId: '',
    token: '',
    autoSend: true
  });

  // Load from offline storage on mount
  useEffect(() => {
    const savedShop = localStorage.getItem('pos_shop_settings');
    if (savedShop) setShopInfo(JSON.parse(savedShop));

    const savedWA = localStorage.getItem('pos_wa_settings');
    if (savedWA) setWaInfo(JSON.parse(savedWA));
  }, []);

  const handleSaveShop = () => {
    localStorage.setItem('pos_shop_settings', JSON.stringify(shopInfo));
    showSaveSuccess();
  };

  const handleSaveWA = () => {
    localStorage.setItem('pos_wa_settings', JSON.stringify(waInfo));
    showSaveSuccess();
  };

  const showSaveSuccess = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
        {isSaved && (
          <span className="flex items-center gap-2 text-green-600 font-bold bg-green-100 px-4 py-2 rounded-lg transition-opacity duration-300">
            <CheckCircle size={20} /> Settings Saved Successfully!
          </span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Settings Navigation */}
        <div className="w-1/4 bg-white rounded-lg shadow-md p-4 h-max">
          <nav className="space-y-2">
            <TabButton icon={<Store />} label="Shop Information" active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
            <TabButton icon={<MessageCircle />} label="WhatsApp Integration" active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')} />
            <TabButton icon={<Printer />} label="Printer & GST" active={activeTab === 'printer'} onClick={() => setActiveTab('printer')} />
            <TabButton icon={<Database />} label="Backup & Restore" active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
          </nav>
        </div>

        {/* Settings Content */}
        <div className="w-3/4 bg-white rounded-lg shadow-md p-6 min-h-[400px]">
          
          {activeTab === 'shop' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold mb-4">Shop Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                  <input type="text" value={shopInfo.name} onChange={e => setShopInfo({...shopInfo, name: e.target.value})} className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                  <input type="text" value={shopInfo.phone} onChange={e => setShopInfo({...shopInfo, phone: e.target.value})} className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea value={shopInfo.address} onChange={e => setShopInfo({...shopInfo, address: e.target.value})} className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
                </div>
              </div>
              <button onClick={handleSaveShop} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition">
                <Save size={16}/> Save Shop Info
              </button>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold mb-4">WhatsApp API Configuration</h2>
              <p className="text-sm text-gray-500 mb-6 border-b pb-4">Configure your API keys to send invoices directly to customers via WhatsApp.</p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Instance ID</label>
                  <input type="text" value={waInfo.instanceId} onChange={e => setWaInfo({...waInfo, instanceId: e.target.value})} placeholder="Enter Instance ID" className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Token</label>
                  <input type="password" value={waInfo.token} onChange={e => setWaInfo({...waInfo, token: e.target.value})} placeholder="Enter Token" className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-green-500" />
                </div>
                <label className="flex items-center gap-2 mt-4 cursor-pointer">
                  <input type="checkbox" checked={waInfo.autoSend} onChange={e => setWaInfo({...waInfo, autoSend: e.target.checked})} className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                  <span className="text-sm text-gray-700 font-medium">Auto-send WhatsApp message on bill generation</span>
                </label>
              </div>
              <button onClick={handleSaveWA} className="mt-6 bg-green-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-green-700 transition">
                <Save size={16}/> Save API Keys
              </button>
            </div>
          )}

          {/* Database and Printer tabs remain UI placeholders for now */}
          {activeTab === 'database' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold mb-4">Database Management</h2>
              <p className="text-sm text-gray-500 mb-6 border-b pb-4">Manage your local SQLite/PostgreSQL database safely.</p>
              
              <div className="flex gap-4 mt-6">
                <button onClick={() => alert('Local Backup Triggered! (Requires Backend)')} className="bg-indigo-600 text-white px-6 py-3 rounded shadow hover:bg-indigo-700 font-semibold transition">
                  Create Local Backup (.db)
                </button>
                <button onClick={() => alert('Restore Menu Opened! (Requires Backend)')} className="bg-red-600 text-white px-6 py-3 rounded shadow hover:bg-red-700 font-semibold transition">
                  Restore from Backup
                </button>
              </div>
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <h2 className="text-xl font-bold mb-4">Printer & GST Setup</h2>
               <p className="text-sm text-gray-500 mb-6 border-b pb-4">Configure default tax percentages and receipt printing.</p>
               <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                 ⚠️ Printer integration requires the Python desktop backend to be running to connect to local hardware USB ports.
               </div>
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
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${active ? 'bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-100 font-medium'}`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}