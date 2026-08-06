import React, { useState, useEffect } from 'react';
import { Search, Barcode, Package, CheckCircle2, AlertTriangle, RefreshCw, Loader2, Tag, DollarSign } from 'lucide-react';
import { scanBarcodeApi, fetchInventory } from '../../services/api';

export default function ProductLookup() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setIsLoading(true);
    try {
      const res = await fetchInventory();
      if (res.data && Array.isArray(res.data.items)) {
        setProducts(res.data.items);
      }
    } catch (e) {
      console.warn("Catalog load warning:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeLookup = async (e) => {
    if (e) e.preventDefault();
    if (!scannedBarcode) return;
    try {
      const res = await scanBarcodeApi(scannedBarcode);
      if (res.data && res.data.product) {
        setSelectedProduct(res.data.product);
      }
    } catch (err) {
      alert(`Barcode ${scannedBarcode} not found in store catalog.`);
    }
  };

  const filteredProducts = products.filter(p => {
    const name = (p.name || '').toLowerCase();
    const barcode = (p.barcode || '').toString();
    const cat = (p.category || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || barcode.includes(q) || cat.includes(q);
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            Product & Stock Search
            <span className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-md uppercase">
              Staff Terminal
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Instant price check, stock verification, and barcode lookup for floor staff</p>
        </div>

        <button 
          onClick={loadCatalog}
          className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh Catalog
        </button>
      </div>

      {/* Barcode Scanner & Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Fast IoT Barcode Scanner Input */}
        <form onSubmit={handleBarcodeLookup} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Barcode size={18} className="text-emerald-600" /> IoT Barcode Price Checker
          </h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Scan or type barcode (e.g. 8901030700010)..."
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              className="flex-1 p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              autoFocus
            />
            <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition">
              Check
            </button>
          </div>
        </form>

        {/* Text Filter Search */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center">
          <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Search size={18} className="text-blue-600" /> Search Catalog by Name / Category
          </h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search product name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>

      </div>

      {/* Scanned Result Banner */}
      {selectedProduct && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 mb-6 shadow-md flex items-center justify-between animate-in fade-in">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Scanned Product Result</span>
            <h2 className="text-2xl font-black text-gray-900 mt-1">{selectedProduct.name}</h2>
            <div className="flex items-center gap-4 text-sm mt-2">
              <span className="font-mono bg-white px-2.5 py-1 rounded border text-gray-700">Barcode: {selectedProduct.barcode}</span>
              <span className="font-bold text-emerald-700">Category: {selectedProduct.category}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 font-bold block">Selling Price</span>
            <span className="text-3xl font-black text-emerald-600">₹{selectedProduct.price}</span>
            <span className={`text-xs font-bold block mt-1 ${selectedProduct.stock <= 5 ? 'text-rose-600' : 'text-emerald-700'}`}>
              Stock Remaining: {selectedProduct.stock} units
            </span>
          </div>
        </div>
      )}

      {/* Catalog Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs text-gray-500">
          <span>Active Inventory Catalog ({filteredProducts.length} items)</span>
          <span>Live SQLite sync</span>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-100 text-xs font-bold uppercase text-gray-500 border-b border-gray-200">
              <th className="p-4">Barcode</th>
              <th className="p-4">Product Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline-block mr-2" size={18}/> Fetching product catalog...</td></tr>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition">
                  <td className="p-4 font-mono font-semibold text-gray-700">{p.barcode || 'N/A'}</td>
                  <td className="p-4 font-bold text-gray-900">{p.name}</td>
                  <td className="p-4 text-xs font-semibold text-gray-600">{p.category}</td>
                  <td className="p-4 font-black text-gray-900">₹{parseFloat(p.price || 0).toFixed(2)}</td>
                  <td className="p-4">
                    {p.stock <= (p.lowStockAlert || 5) ? (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                        <AlertTriangle size={12} /> Low ({p.stock})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> In Stock ({p.stock})
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
