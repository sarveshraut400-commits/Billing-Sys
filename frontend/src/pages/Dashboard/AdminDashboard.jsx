import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, RefreshCw, 
  Clock, ShieldCheck, Activity, ArrowUpRight, CheckCircle2, Loader2, Package, User
} from 'lucide-react';
import { fetchDashboardStats } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthlyRevenue: 0,
    todayBills: 0,
    totalProducts: 0,
    lowStock: 0,
    totalEmployees: 0,
    onlineEmployees: 0
  });
  const [chartData, setChartData] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastSynced, setLastSynced] = useState(new Date());

  const timerRef = useRef(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 5-second automatic polling for live real-time feedback
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
      const response = await fetchDashboardStats();
      if (response.data && response.data.stats) {
        setStats(response.data.stats);
        setChartData(response.data.chartData || []);
        setRecentSales(response.data.recentSales || []);
        setRecentActivity(response.data.recentActivity || []);
      }
    } catch (error) {
      console.warn("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
      setLastSynced(new Date());
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      
      {/* Top Header Bar & Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            Admin Dashboard
            <span className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
              Live DB Stream
            </span>
            <span className="text-xs bg-cyan-100 text-cyan-800 font-bold px-2.5 py-1 rounded-md border border-cyan-200 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span> IoT Scanner Online
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time IoT billing system server medium • Live POS sales, inventory, and hardware logs</p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-xs font-bold">
            <span className="relative flex h-2.5 w-2.5">
              {isAutoRefresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            {isAutoRefresh ? 'Live Feedback Active' : 'Sync Paused'}
          </div>

          <button 
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`text-xs px-3 py-1.5 font-semibold rounded-lg border transition ${
              isAutoRefresh ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            {isAutoRefresh ? 'Pause' : 'Live Sync'}
          </button>

          <button 
            onClick={() => loadDashboardData()}
            title="Refresh Dashboard Data"
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Today's Revenue */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">₹{stats.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
              <TrendingUp size={14} /> Total: ₹{stats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <DollarSign size={28} />
          </div>
        </div>

        {/* Invoices Processed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Invoices</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.todayBills}</h3>
            <span className="text-xs text-blue-600 font-bold mt-1.5 block">Live POS Sales</span>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <ShoppingBag size={28} />
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Inventory</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.totalProducts}</h3>
            <span className="text-xs text-indigo-600 font-bold mt-1.5 block">Catalog Items</span>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Package size={28} />
          </div>
        </div>

        {/* Staff & Low Stock */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Stock & Staff</p>
            <div className="flex items-baseline gap-3 mt-1">
              <h3 className="text-3xl font-black text-rose-600">{stats.lowStock} <span className="text-xs text-gray-400 font-normal">low</span></h3>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.onlineEmployees}/{stats.totalEmployees} <span className="text-xs text-gray-400 font-normal">online</span></h3>
            </div>
            <span className="text-xs text-gray-500 font-semibold mt-1.5 block">Real-time alerts</span>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <AlertTriangle size={28} />
          </div>
        </div>

      </div>

      {/* Revenue Trend Chart & Recent Sales Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Revenue Line Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-600" /> Revenue Trend (₹)
            </h3>
            <span className="text-xs text-gray-400">Past 7 days live revenue</span>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip 
                  formatter={(value) => [`₹${parseFloat(value).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={3} dot={{ r: 5, fill: '#059669' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live System Activity Feed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-indigo-600" /> Live Audit Stream
            </h3>

            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <div className="flex justify-between font-bold text-gray-800 mb-0.5">
                      <span>{log.action}</span>
                      <span className="text-gray-400 font-normal">{log.timestamp}</span>
                    </div>
                    <p className="text-gray-600 truncate">{log.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic py-8 text-center">No recent activity logged yet.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Live SQLite audit connection</span>
            <span>Synced: {lastSynced.toLocaleTimeString()}</span>
          </div>
        </div>

      </div>

      {/* Recent Completed Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={20} className="text-blue-600" /> Live Recent Transactions
          </h3>
          <span className="text-xs text-gray-500 font-medium">Automatic POS Checkout Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-100 text-xs font-bold uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-blue-50/30 transition">
                    <td className="p-4 font-bold text-gray-800">{sale.invoice_number || sale.invoice_no || `INV#${sale.id}`}</td>
                    <td className="p-4 text-gray-600 font-medium">{sale.customer_name || 'Walk-in Customer'}</td>
                    <td className="p-4 text-xs text-gray-500 font-medium">{sale.date} {sale.time}</td>
                    <td className="p-4 font-black text-emerald-700">₹{parseFloat(sale.total_bill || 0).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Paid
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 italic">No sales recorded yet. Start billing in POS tab!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}