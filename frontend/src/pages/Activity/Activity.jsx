import React, { useState, useEffect } from 'react';
import { Activity as ActivityIcon, ShoppingCart, Package, User, Clock } from 'lucide-react';

export default function Activity() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // In a real app, this would fetch from your Python backend. 
    // For now, we will generate some realistic mock activity logs!
    const mockLogs = [
      { id: 1, type: 'sale', message: 'Invoice INV-0089 generated for ₹1,250', time: 'Just now', user: 'Staff Member' },
      { id: 2, type: 'inventory', message: 'Added "Logitech Wireless Mouse" to Electronics', time: '10 mins ago', user: 'Administrator' },
      { id: 3, type: 'login', message: 'Administrator logged into the system', time: '1 hour ago', user: 'Administrator' },
      { id: 4, type: 'inventory', message: 'Low stock alert triggered for "USB-C Hub"', time: '2 hours ago', user: 'System' },
      { id: 5, type: 'sale', message: 'Invoice INV-0088 generated for ₹4,500', time: '3 hours ago', user: 'Staff Member' },
    ];
    setLogs(mockLogs);
  }, []);

  const getIcon = (type) => {
    switch(type) {
      case 'sale': return <ShoppingCart size={20} className="text-emerald-600" />;
      case 'inventory': return <Package size={20} className="text-indigo-600" />;
      case 'login': return <User size={20} className="text-blue-600" />;
      default: return <ActivityIcon size={20} className="text-gray-600" />;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700">
          <ActivityIcon size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Activity Logs</h1>
          <p className="text-gray-500">Track all operations across the POS system</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl">
        <div className="relative border-l-2 border-gray-100 ml-4 space-y-8">
          {logs.map((log) => (
            <div key={log.id} className="relative pl-8">
              {/* Timeline Dot with Icon */}
              <div className="absolute -left-5 bg-white p-1 rounded-full border-2 border-gray-100 shadow-sm">
                <div className={`p-1.5 rounded-full ${log.type === 'sale' ? 'bg-emerald-50' : log.type === 'inventory' ? 'bg-indigo-50' : 'bg-blue-50'}`}>
                  {getIcon(log.type)}
                </div>
              </div>
              
              {/* Log Content */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-md transition">
                <p className="font-semibold text-gray-800 text-lg mb-1">{log.message}</p>
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Clock size={14}/> {log.time}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><User size={14}/> By {log.user}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}