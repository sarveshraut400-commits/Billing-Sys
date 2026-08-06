import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, 
  FileBarChart, Settings, Activity, FileText, Menu, X, Store
} from 'lucide-react';

export default function Sidebar({ role }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: `/${role}-dashboard`, icon: <LayoutDashboard size={20} /> },
    ...(role === 'admin' 
      ? [{ name: 'Sales History & Receipts', path: '/sales-history', icon: <FileText size={20} /> }]
      : [{ name: 'Billing (POS)', path: '/billing', icon: <ShoppingCart size={20} /> }]
    ),
    { name: 'Inventory', path: '/inventory', icon: <Package size={20} />, adminOnly: true },
    { name: 'Employees', path: '/employees', icon: <Users size={20} />, adminOnly: true },
    { name: 'Reports & Export', path: '/reports', icon: <FileBarChart size={20} />, adminOnly: true },
    { name: 'Activity Logs', path: '/activity', icon: <Activity size={20} />, adminOnly: true },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} />, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile Top Navbar with Hamburger Toggle */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500 rounded-lg text-slate-950">
            <Store size={18} />
          </div>
          <span className="font-extrabold text-lg text-emerald-400">SuperMart POS</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40"
        />
      )}

      {/* Sidebar Container (Responsive Drawer on Mobile, Fixed Sidebar on Desktop) */}
      <div className={`
        fixed md:static top-0 left-0 bottom-0 z-50
        w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 text-center border-b border-slate-800 hidden md:block">
          <h2 className="text-2xl font-black text-emerald-400">SuperMart POS</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">v1.0 {role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && role !== 'admin') return null;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActive ? 'bg-emerald-600 text-white shadow-md font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                {item.icon}
                <span className="text-sm font-semibold">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
}