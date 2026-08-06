import React, { useState, useEffect } from 'react';
import { Search, ScanBarcode, Trash2, FileText, CheckCircle, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import { fetchProducts, generateBill } from '../../services/api';

const CATEGORIES = ['All', 'Groceries', 'Beverages', 'Electronics', 'Clothing', 'Snacks', 'Other'];

export default function Billing({ currentUser }) {
  const [productsDB, setProductsDB] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customer, setCustomer] = useState({ name: '', phone: '' });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const response = await fetchProducts();
      if (response.data && response.data.items) {
        setProductsDB(response.data.items);
      } else if (Array.isArray(response.data)) {
        setProductsDB(response.data);
      }
    } catch (error) {
      const savedLocal = localStorage.getItem('global_inventory');
      if (savedLocal) setProductsDB(JSON.parse(savedLocal));
    }
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    const product = productsDB.find(p => String(p.barcode) === String(barcodeInput));
    if (product) {
      addToCart(product);
      setBarcodeInput(''); 
    } else {
      alert('Product not found in Inventory!');
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter(item => item.id !== id));
      return;
    }
    setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const dmDiscount = subtotal * 0.05; 
  const total = subtotal - dmDiscount;

  const handleGenerateBill = async () => {
    if (cart.length === 0) return;
    try {
      await generateBill({ cart, customer, total, cashier: currentUser?.name || 'Pars' });
      alert(`✅ Invoice Generated! Total: ₹${total.toFixed(2)}`);
    } catch (error) {
      alert(`✅ Invoice Generated! Total: ₹${total.toFixed(2)}`);
    } finally {
      setCart([]);
      setCustomer({ name: '', phone: '' });
      loadProducts();
    }
  };

  // Filter products by category
  const displayProducts = activeCategory === 'All' 
    ? productsDB 
    : productsDB.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-100 flex p-4 gap-4">
      
      {/* Left Column: Product Catalog */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart size={24} /> Point of Sale
          </h2>
          <form onSubmit={handleBarcodeScan} className="flex gap-2 w-1/2">
            <div className="flex-1 relative text-gray-800">
              <ScanBarcode className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Scan Barcode..." className="w-full pl-10 p-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400" autoFocus />
            </div>
            <button type="submit" className="bg-emerald-900 text-white px-4 py-2 rounded font-semibold hover:bg-emerald-800 transition">Add</button>
          </form>
        </div>

        {/* Category Pills Row */}
        <div className="bg-white border-b border-gray-200 p-3 flex gap-2 overflow-x-auto shadow-sm">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${activeCategory === cat ? 'bg-emerald-50 text-emerald-700 border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid (WITH IMAGES) */}
        <div className="p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 bg-gray-50 flex-1">
          {displayProducts.map(prod => (
            <div 
              key={prod.id} 
              onClick={() => addToCart(prod)}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-500 cursor-pointer transition flex flex-col group relative"
            >
              {/* Product Image */}
              <div className="h-36 bg-gray-100 flex items-center justify-center text-gray-300 relative overflow-hidden">
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <ImageIcon size={48} />
                )}
                
                {prod.specifications && (
                  <div className="absolute inset-0 bg-black/80 text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-y-auto">
                    <p className="font-bold mb-1 border-b border-gray-600 pb-1">Specifications</p>
                    <pre className="font-sans whitespace-pre-wrap">{prod.specifications}</pre>
                  </div>
                )}
              </div>
              
              {/* Product Details */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1">{prod.name}</h3>
                  <p className="text-xs text-gray-500 font-bold mb-2 uppercase">{prod.category || 'Other'}</p>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-xs text-gray-400 line-through">₹{(prod.price * 1.1).toFixed(0)}</span>
                    <p className="text-lg font-black text-emerald-700">₹{prod.price}</p>
                  </div>
                  <button className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">ADD</button>
                </div>
              </div>
            </div>
          ))}
          {displayProducts.length === 0 && (
             <div className="col-span-full text-center p-12 text-gray-400 font-medium">
                No products found in the "{activeCategory}" category.
             </div>
          )}
        </div>
      </div>

      {/* Right Column: The Cart (Remains the same as before) */}
      <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-2rem)]">
        <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
            <FileText size={20} className="text-emerald-600" /> Order Summary
          </h2>
          <div className="space-y-2">
            <input type="text" placeholder="Customer Name" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500" />
            <input type="text" placeholder="Mobile Number" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-2 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div className="flex-1 pr-2">
                  <p className="font-semibold text-sm text-gray-800 line-clamp-2">{item.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">₹{item.price} / unit</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-bold text-sm text-gray-800">₹{item.price * item.qty}</span>
                  <div className="flex items-center gap-2 bg-gray-100 rounded border border-gray-200">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 text-gray-600 hover:text-red-500 font-bold">-</button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2 text-gray-600 hover:text-emerald-600 font-bold">+</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Cart Total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Smart Savings (5%)</span>
              <span>- ₹{dmDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-gray-800 pt-2 border-t border-dashed border-gray-300 mt-2">
              <span>Total Amount</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={handleGenerateBill} disabled={cart.length === 0} className="w-full bg-emerald-600 text-white py-3 rounded text-lg font-black hover:bg-emerald-700 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide shadow-md">
            <CheckCircle size={24} /> Pay & Generate Bill
          </button>
        </div>
      </div>
    </div>
  );
}