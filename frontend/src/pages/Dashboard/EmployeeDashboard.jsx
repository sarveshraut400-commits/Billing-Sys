import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Search, Clock, DollarSign, TrendingUp, RefreshCw, 
  CheckCircle2, AlertTriangle, Eye, Printer, X, Barcode, ShieldCheck, User, Package, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchEmployeeDashboardStats, scanBarcodeApi, fetchInventory } from '../../services/api';

export default function EmployeeDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: 0.0,
    todayBills: 0,
    avgSale: 0.0,
    iotStatus: 'Online'
  });
  const [recentBills, setRecentBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [lastSynced, setLastSynced] = useState(new Date());

  // Price Checker Modal States
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);

  const timerRef = useRef(null);
  const staffName = currentUser?.name || 'Staff Member';

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 5-second live auto-refresh polling
  useEffect(() => {
    if (isAutoRefresh) {
      timerRef.current = setInterval(() => {
        loadDashboardData(true);
      }, 5000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoRefresh]);

  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetchEmployeeDashboardStats(staffName);
      if (res.data && res.data.stats) {
        setStats(res.data.stats);
        setRecentBills(res.data.recentBills || []);
      }
    } catch (e) {
      console.warn("Employee dashboard stats error:", e);
    } finally {
      setIsLoading(false);
      setLastSynced(new Date());
    }
  };

  const openPriceCheckerModal = async () => {
    setIsSearchModalOpen(true);
    setScannedBarcode('');
    setMatchedProduct(null);
    setIsSearchingCatalog(true);
    try {
      const res = await fetchInventory();
      if (res.data && Array.isArray(res.data.items)) {
        setCatalogItems(res.data.items);
      }
    } catch (err) {
      console.warn("Catalog fetch error:", err);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const handleBarcodeLookup = async (e) => {
    if (e) e.preventDefault();
    if (!scannedBarcode) return;
    try {
      const res = await scanBarcodeApi(scannedBarcode);
      if (res.data && res.data.product) {
        setMatchedProduct(res.data.product);
      }
    } catch (err) {
      alert(`Barcode ${scannedBarcode} not found in catalog.`);
    }
  };

  const filteredCatalog = catalogItems.filter(item => {
    const name = (item.name || '').toLowerCase();
    const code = (item.barcode || '').toString();
    const q = catalogSearch.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      
      {/* Top Header Bar & Live Sync Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            Welcome back, {staffName}!
            <span className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
              Staff Terminal
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Live POS counter terminal • Shift performance analytics and receipt management</p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-xs font-bold">
            <span className="relative flex h-2.5 w-2.5">
              {isAutoRefresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            {isAutoRefresh ? 'Live Shift Sync' : 'Sync Paused'}
          </div>

          <button 
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`text-xs px-3 py-1.5 font-semibold rounded-lg border transition ${
              isAutoRefresh ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isAutoRefresh ? 'Pause' : 'Live Sync'}
          </button>

          <button 
            onClick={() => loadDashboardData()}
            title="Refresh Shift Data"
            className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Action Shortcut Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => navigate('/billing')}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-2xl shadow-md hover:shadow-xl transition transform hover:-translate-y-0.5 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm group-hover:scale-105 transition">
              <ShoppingCart size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Open POS Billing Terminal</h2>
              <p className="text-emerald-100 text-xs mt-1">Scan IoT barcodes, add items & complete customer sales</p>
            </div>
          </div>
          <span className="text-xs bg-white text-emerald-800 font-extrabold px-3 py-1.5 rounded-lg shadow-sm">
            Launch POS →
          </span>
        </button>

        <button 
          onClick={openPriceCheckerModal}
          className="bg-white border-2 border-emerald-600 p-6 rounded-2xl shadow-md hover:shadow-xl transition transform hover:-translate-y-0.5 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition">
              <Search size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Product & Price Checker</h2>
              <p className="text-gray-500 text-xs mt-1">Instant barcode price lookup & stock count verification</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-3 py-1.5 rounded-lg">
            Open Checker →
          </span>
        </button>
      </div>

      {/* Real-Time Shift Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Today's Shift Sales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shift Sales Total</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">₹{stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <span className="text-xs text-gray-500 font-semibold mt-1.5 block">Live SQLite sync</span>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <DollarSign size={28} />
          </div>
        </div>

        {/* Bills Processed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invoices Generated</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.todayBills}</h3>
            <span className="text-xs text-blue-600 font-bold mt-1.5 block">Shift POS sales</span>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <ShoppingCart size={28} />
          </div>
        </div>

        {/* Average Transaction */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Transaction</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">₹{stats.avgSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <span className="text-xs text-indigo-600 font-bold mt-1.5 block">Per customer bill</span>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <TrendingUp size={28} />
          </div>
        </div>

        {/* IoT Scanner Hardware Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">IoT Barcode Scanner</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <h3 className="text-2xl font-extrabold text-cyan-900">{stats.iotStatus}</h3>
            </div>
            <span className="text-xs text-cyan-700 font-semibold mt-1.5 block">Ready for barcode scans</span>
          </div>
          <div className="p-4 bg-cyan-50 text-cyan-600 rounded-2xl border border-cyan-100">
            <Barcode size={28} />
          </div>
        </div>

      </div>

      {/* Live Recent Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Clock size={20} className="text-emerald-600" /> Recent Shift Invoices
          </h3>
          <span className="text-xs text-gray-500 font-medium">Automatic DB Sales Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-100 text-xs font-bold uppercase text-gray-500 border-b border-gray-200">
                <th className="p-4">Invoice #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Time</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBills.length > 0 ? (
                recentBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-emerald-50/20 transition">
                    <td className="p-4 font-bold text-gray-800">{bill.invoice_no || bill.invoice_number}</td>
                    <td className="p-4 text-gray-600 font-medium">{bill.customer_name || 'Walk-in Customer'}</td>
                    <td className="p-4 text-xs text-gray-500 font-medium">{bill.datetime_formatted || bill.date}</td>
                    <td className="p-4 font-black text-emerald-700">₹{parseFloat(bill.total_bill || 0).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Paid
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedReceipt(bill)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm transition"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 italic">No shift sales recorded yet. Click 'Open POS Billing Terminal' to create a bill!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Live SQLite database connection active</span>
          <span>Last synced: {lastSynced.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* RECEIPT VIEW MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100">
            <button 
              onClick={() => setSelectedReceipt(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <div className="text-center pb-4 border-b border-dashed border-gray-300">
              <h2 className="text-2xl font-black text-gray-800">SuperMart POS</h2>
              <p className="text-xs text-gray-500">Official Sales Receipt & Invoice</p>
              <div className="mt-3 inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-mono font-bold rounded-md border border-emerald-200 text-xs">
                {selectedReceipt.invoice_no || selectedReceipt.invoice_number}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div>
                <span className="text-gray-400 block font-semibold">Date & Time</span>
                <span className="font-bold text-gray-800">{selectedReceipt.datetime_formatted || `${selectedReceipt.date} ${selectedReceipt.time}`}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Cashier</span>
                <span className="font-bold text-gray-800">{selectedReceipt.cashier || staffName}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Customer</span>
                <span className="font-bold text-gray-800">{selectedReceipt.customer_name || 'Walk-in'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Status</span>
                <span className="font-bold text-emerald-600">Paid (Cash/Card)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-dashed border-gray-300 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-200">
                <span>Grand Total Paid:</span>
                <span className="text-emerald-600">₹{parseFloat(selectedReceipt.total_bill || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRICE & STOCK CHECKER MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-gray-100">
            <button 
              onClick={() => setIsSearchModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black text-gray-800 mb-1 flex items-center gap-2">
              <Search className="text-emerald-600" size={24} /> Product & Price Checker
            </h2>
            <p className="text-xs text-gray-500 mb-4">Scan or search any product to verify price, stock count, and catalog details</p>

            {/* Barcode Form */}
            <form onSubmit={handleBarcodeLookup} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Scan IoT barcode or type number (e.g. 8901030700010)..."
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
                <Barcode size={18} className="absolute left-3 top-3 text-gray-400" />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition">
                Check Barcode
              </button>
            </form>

            {/* Scanned Highlight Card */}
            {matchedProduct && (
              <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-xl mb-4 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase">Barcode Match Found</span>
                  <h3 className="text-xl font-black text-gray-900">{matchedProduct.name}</h3>
                  <span className="text-xs text-gray-500 block font-mono">Barcode: {matchedProduct.barcode}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-600">₹{matchedProduct.price}</span>
                  <span className="text-xs font-bold block text-gray-700">Stock: {matchedProduct.stock} units</span>
                </div>
              </div>
            )}

            {/* Text Search Catalog Filter */}
            <div className="mb-3">
              <input 
                type="text" 
                placeholder="Or type product name to search..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Barcode</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">Price</th>
                    <th className="p-2.5 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCatalog.length > 0 ? (
                    filteredCatalog.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/30">
                        <td className="p-2.5 font-mono text-gray-600">{item.barcode}</td>
                        <td className="p-2.5 font-bold text-gray-800">{item.name}</td>
                        <td className="p-2.5 font-black text-emerald-700">₹{item.price}</td>
                        <td className="p-2.5 text-right font-bold text-gray-700">{item.stock}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="p-4 text-center text-gray-400">No items found matching your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => setIsSearchModalOpen(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 font-bold text-xs rounded-xl">
                Close Checker
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}