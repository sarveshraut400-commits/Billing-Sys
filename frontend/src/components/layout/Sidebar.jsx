import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, 
  FileBarChart, Settings, Activity, FileText
} from 'lucide-react';

export default function Sidebar({ role }) {
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
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 text-center border-b border-gray-800">
        <h2 className="text-2xl font-bold text-emerald-400">SuperMart POS</h2>
        <p className="text-xs text-gray-400 mt-1">v1.0 {role.toUpperCase()}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          if (item.adminOnly && role !== 'admin') return null;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive ? 'bg-emerald-600 text-white shadow-md font-bold' : 'text-gray-300 hover:bg-gray-800'
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
  );
}