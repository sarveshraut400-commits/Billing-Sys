import React, { useState, useEffect } from 'react';
import { Eye, Search, RefreshCw, Loader2, X, Printer, CheckCircle2, ShoppingBag } from 'lucide-react';
import { fetchSalesHistory } from '../../services/api';

export default function EmployeeSales({ currentUser }) {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const staffName = currentUser?.name || 'Staff';

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const res = await fetchSalesHistory();
      if (res.data && Array.isArray(res.data)) {
        setSales(res.data);
      }
    } catch (e) {
      console.warn("Sales load warning:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSales = sales.filter(s => {
    const inv = (s.invoice_no || s.invoice_number || '').toLowerCase();
    const cust = (s.customer_name || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return inv.includes(q) || cust.includes(q);
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            My Shift Sales
            <span className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-md uppercase">
              Staff Terminal
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Live record of invoices generated during your active shift ({staffName})</p>
        </div>

        <button 
          onClick={loadSales}
          className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh Invoices
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <input 
            type="text"
            placeholder="Search by Invoice # or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search size={18} className="absolute left-3.5 top-2.5 text-gray-400" />
        </div>
        <span className="text-xs font-bold text-gray-500">Showing {filteredSales.length} shift sales</span>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-emerald-50 text-emerald-900 text-xs font-bold uppercase border-b border-emerald-100">
              <th className="p-4">Invoice #</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Time</th>
              <th className="p-4">Total Amount</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline-block mr-2" size={18}/> Fetching shift transactions...</td></tr>
            ) : filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-emerald-50/20 transition">
                  <td className="p-4 font-bold text-gray-800">{sale.invoice_no || sale.invoice_number}</td>
                  <td className="p-4 text-gray-600 font-medium">{sale.customer_name || 'Walk-in Customer'}</td>
                  <td className="p-4 text-xs text-gray-500">{sale.datetime_formatted || `${sale.date || ''} ${sale.time || ''}`}</td>
                  <td className="p-4 font-black text-emerald-700">₹{parseFloat(sale.total_bill || 0).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setSelectedReceipt(sale)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Eye size={14} /> Receipt
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">No shift invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100">
            <button onClick={() => setSelectedReceipt(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <div className="text-center pb-4 border-b border-dashed border-gray-300">
              <h2 className="text-2xl font-black text-gray-800">SuperMart POS</h2>
              <p className="text-xs text-gray-500">Sales Invoice</p>
              <div className="mt-2 inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-mono font-bold rounded text-xs">
                {selectedReceipt.invoice_no || selectedReceipt.invoice_number}
              </div>
            </div>
            <div className="my-4 text-xs space-y-1 text-gray-600 bg-gray-50 p-3 rounded-xl">
              <div>Customer: <strong className="text-gray-800">{selectedReceipt.customer_name || 'Walk-in'}</strong></div>
              <div>Date & Time: <strong className="text-gray-800">{selectedReceipt.datetime_formatted || selectedReceipt.date}</strong></div>
              <div>Cashier: <strong className="text-gray-800">{selectedReceipt.cashier || staffName}</strong></div>
            </div>
            <div className="pt-3 border-t border-dashed border-gray-300 flex justify-between font-bold text-base text-gray-900">
              <span>Grand Total:</span>
              <span className="text-emerald-600">₹{parseFloat(selectedReceipt.total_bill || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1">
                <Printer size={16} /> Print
              </button>
              <button onClick={() => setSelectedReceipt(null)} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
