import React, { useState, useEffect } from 'react';
import { Search, ScanBarcode, Trash2, FileText, CheckCircle, Image as ImageIcon, ShoppingCart, MessageSquare, Printer, X, CheckCircle2, FileCheck, Download } from 'lucide-react';
import { fetchProducts, generateBill } from '../../services/api';

const CATEGORIES = ['All', 'Groceries', 'Beverages', 'Electronics', 'Clothing', 'Snacks', 'Other'];

export default function Billing({ currentUser }) {
  const [productsDB, setProductsDB] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customer, setCustomer] = useState({ name: '', phone: '' });

  // Completed Checkout Notification State
  const [checkoutNotice, setCheckoutNotice] = useState(null);

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
    const currentQty = existing ? existing.qty : 0;
    if (product.stock <= 0) {
      alert(`⚠️ ${product.name} is Out of Stock!`);
      return;
    }
    if (currentQty + 1 > product.stock) {
      alert(`⚠️ Cannot add more. Available stock for ${product.name} is ${product.stock} units.`);
      return;
    }
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
    const product = productsDB.find(p => p.id === id);
    if (product && newQty > product.stock) {
      alert(`⚠️ Maximum available stock for ${product.name} is ${product.stock} units.`);
      return;
    }
    setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const dmDiscount = subtotal * 0.05; 
  const total = subtotal - dmDiscount;

  const handleGenerateBill = async () => {
    if (cart.length === 0) return;
    const invoiceNo = `INV${Math.floor(1000 + Math.random() * 9000)}`;
    const cashierName = currentUser?.name || 'Pars';
    
    try {
      const res = await generateBill({ 
        cart, 
        customer, 
        total, 
        cashier: cashierName,
        invoice_number: invoiceNo
      });

      const invNo = res?.data?.invoice_number || invoiceNo;
      const pdfUrl = res?.data?.pdf_url || `http://127.0.0.1:5000/api/invoices/download/${invNo}`;

      setCheckoutNotice({
        invoice_no: invNo,
        customer_name: customer.name || 'Walk-in Customer',
        phone: customer.phone,
        total: total.toFixed(2),
        pdf_url: pdfUrl
      });

    } catch (error) {
      console.warn("Bill generation warning:", error);
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
        
        {/* Header & Barcode Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="text-emerald-600" /> POS Billing Terminal
            </h1>
            <p className="text-xs text-gray-500">Scan barcodes or click items to add to checkout bill</p>
          </div>

          <form onSubmit={handleBarcodeScan} className="flex gap-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Scan IoT Barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
              <ScanBarcode className="absolute left-2.5 top-2 text-gray-400" size={18} />
            </div>
            <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
              Add
            </button>
          </form>
        </div>

        {/* Categories Bar */}
        <div className="p-3 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto">
          {Array.from(new Set(['All', 'Groceries', 'Beverages', 'Dairy & Bakery', 'Snacks', 'Personal Care', 'Household', 'Electronics', 'Clothing', 'Jerseys', 'Gaming', ...productsDB.map(p => p.category).filter(Boolean)])).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === cat ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayProducts.map((product) => (
            <div 
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition cursor-pointer flex flex-col justify-between group hover:border-emerald-400"
            >
              <div>
                <div className="h-28 bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden border">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <ImageIcon className="text-gray-300" size={32} />
                  )}
                </div>
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{product.barcode || 'N/A'}</p>
              </div>

              <div className="mt-2 flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="font-extrabold text-emerald-600 text-sm">₹{parseFloat(product.price).toFixed(2)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${product.stock > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  Stock: {product.stock}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Right Column: Checkout Cart */}
      <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-base">Current Customer Order</h2>
          <span className="text-xs font-bold text-gray-400">{cart.length} Items</span>
        </div>

        {/* Customer Mobile Input */}
        <div className="p-3 bg-emerald-50 border-b border-emerald-100 space-y-2">
          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <MessageSquare size={14} className="text-emerald-600" /> Customer WhatsApp Mobile
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="text"
              placeholder="Customer Name..."
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="p-2 bg-white border border-emerald-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <input 
              type="text"
              placeholder="Mobile # (+91...)"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="p-2 bg-white border border-emerald-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <span className="text-[10px] text-emerald-700 block italic">⚡ Automated PDF Invoice Document will be sent directly to customer WhatsApp</span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 divide-y divide-gray-100">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.id} className="pt-2 flex justify-between items-center text-xs">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                  <span className="text-gray-400">₹{item.price} x {item.qty}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 py-0.5 bg-gray-100 font-bold">-</button>
                    <span className="px-2 font-bold text-gray-700">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2 py-0.5 bg-gray-100 font-bold">+</button>
                  </div>
                  <button onClick={() => updateQty(item.id, 0)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs italic">Cart is empty. Click catalog items or scan barcode!</div>
          )}
        </div>

        {/* Bill Summary & Complete Checkout Button */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Subtotal</span>
            <span className="font-bold">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-emerald-600 font-medium">
            <span>SuperMart Discount (5%)</span>
            <span>-₹{dmDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-gray-900 border-t pt-2">
            <span>Grand Total</span>
            <span className="text-emerald-600">₹{total.toFixed(2)}</span>
          </div>

          <button 
            onClick={handleGenerateBill}
            disabled={cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 mt-2"
          >
            <CheckCircle size={18} /> Complete Sale & Send Bill
          </button>
        </div>

      </div>

      {/* AUTOMATED CHECKOUT SUCCESS NOTICE MODAL */}
      {checkoutNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 text-center">
            <button 
              onClick={() => setCheckoutNotice(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full mb-3">
              <FileCheck size={36} />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900">Sale Completed!</h2>
            <p className="text-xs text-gray-500 mt-1">Invoice #{checkoutNotice.invoice_no} • Total Paid: <strong className="text-emerald-600 text-sm">₹{checkoutNotice.total}</strong></p>

            {checkoutNotice.phone ? (
              <div className="my-4 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-left space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Automated WhatsApp PDF Bill Dispatched!
                </div>
                <p className="text-[11px] text-emerald-700">
                  PDF document receipt sent to customer <strong>{checkoutNotice.customer_name}</strong> (+{checkoutNotice.phone}). No manual cashier messaging required!
                </p>
              </div>
            ) : (
              <div className="my-4 bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs text-gray-500 italic">
                Walk-in transaction saved to SQLite database.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <a 
                href={checkoutNotice.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Download size={14} /> PDF Document
              </a>
              <button 
                onClick={() => setCheckoutNotice(null)}
                className="py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition"
              >
                Next Customer →
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}