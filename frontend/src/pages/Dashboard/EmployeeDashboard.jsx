import React from 'react';
import { ShoppingCart, Search, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Staff Dashboard</h1>
      
      {/* Quick Actions for Employees - NOW FUNCTIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button 
          onClick={() => navigate('/billing')}
          className="bg-blue-600 text-white p-8 rounded-lg shadow-md hover:bg-blue-700 transition transform hover:-translate-y-1 flex flex-col items-center justify-center gap-4"
        >
          <ShoppingCart size={48} />
          <span className="text-2xl font-semibold">Generate New Bill</span>
        </button>

        <button 
          onClick={() => navigate('/billing')}
          className="bg-white text-blue-600 border-2 border-blue-600 p-8 rounded-lg shadow-md hover:bg-blue-50 transition transform hover:-translate-y-1 flex flex-col items-center justify-center gap-4"
        >
          <Search size={48} />
          <span className="text-2xl font-semibold">Search Product / Price Check</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Stats for the specific employee */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-gray-500" />
            Your Shift Summary
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Bills Generated Today</span>
              <span className="font-bold text-gray-800">12</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Total Sales Generated</span>
              <span className="font-bold text-gray-800">₹4,250</span>
            </div>
          </div>
        </div>

        {/* Recent Bills List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Recent Bills</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 text-blue-600 font-medium cursor-pointer hover:underline">INV0006</td>
                  <td className="p-3">10:45 AM</td>
                  <td className="p-3">₹1,200</td>
                  <td className="p-3 text-green-600 font-semibold">Paid</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3 text-blue-600 font-medium cursor-pointer hover:underline">INV0005</td>
                  <td className="p-3">09:30 AM</td>
                  <td className="p-3">₹450</td>
                  <td className="p-3 text-green-600 font-semibold">Paid</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}