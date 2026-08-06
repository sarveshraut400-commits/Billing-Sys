import React, { useState, useEffect } from 'react';
import { Search, ScanBarcode, Trash2, FileText, CheckCircle, Image as ImageIcon, ShoppingCart, MessageSquare, Printer, X, CheckCircle2 } from 'lucide-react';
import { fetchProducts, generateBill, sendWhatsAppBillApi } from '../../services/api';

const CATEGORIES = ['All', 'Groceries', 'Beverages', 'Electronics', 'Clothing', 'Snacks', 'Other'];

export default function Billing({ currentUser }) {
  const [productsDB, setProductsDB] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customer, setCustomer] = useState({ name: '', phone: '' });

  // WhatsApp & Invoice Modal State
  const [completedInvoice, setCompletedInvoice] = useState(null);

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
      await generateBill({ 
        cart, 
        customer, 
        total, 
        cashier: cashierName,
        invoice_number: invoiceNo
      });

      const invoiceData = {
        invoice_no: invoiceNo,
        customer_name: customer.name || 'Walk-in Customer',
        phone: customer.phone || '',
        total: total.toFixed(2),
        items: [...cart],
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        cashier: cashierName
      };

      setCompletedInvoice(invoiceData);

      // Auto-trigger WhatsApp dispatch if phone provided
      if (customer.phone) {
        dispatchWhatsApp(invoiceData);
      }
    } catch (error) {
      console.warn("Bill generation warning:", error);
    } finally {
      setCart([]);
      setCustomer({ name: '', phone: '' });
      loadProducts();
    }
  };

  const dispatchWhatsApp = async (inv) => {
    let cleanPhone = inv.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const itemsList = inv.items.map(i => `• ${i.name} (x${i.qty}) - ₹${(i.price * i.qty).toFixed(2)}`).join('\n');
    
    const message = 
      `🧾 *SuperMart POS - Official Digital Receipt* 🧾\n` +
      `----------------------------------------\n` +
      `Invoice #: ${inv.invoice_no}\n` +
      `Date & Time: ${inv.date} ${inv.time}\n` +
      `Customer: ${inv.customer_name}\n` +
      `Cashier: ${inv.cashier}\n` +
      `----------------------------------------\n` +
      `Items Purchased:\n${itemsList}\n` +
      `----------------------------------------\n` +
      `Subtotal: ₹${subtotal.toFixed(2)}\n` +
      `Store Discount (5%): -₹${dmDiscount.toFixed(2)}\n` +
      `*Grand Total Paid: ₹${inv.total}*\n` +
      `----------------------------------------\n` +
      `Thank you for shopping at SuperMart! 🛍️✨\n` +
      `Have a wonderful day ahead!`;

    const encodedText = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    
    try {
      await sendWhatsAppBillApi({
        phone: inv.phone,
        invoice_no: inv.invoice_no,
        customer_name: inv.customer_name,
        total: inv.total
      });
    } catch (e) {}

    window.open(waUrl, '_blank');
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
          {CATEGORIES.map((cat) => (
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
            <MessageSquare size={14} className="text-emerald-600" /> Customer WhatsApp Billing
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

      {/* COMPLETED INVOICE & WHATSAPP DISPATCH MODAL */}
      {completedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100">
            <button 
              onClick={() => setCompletedInvoice(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="text-center pb-4 border-b border-dashed border-gray-300">
              <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Sale Complete!</h2>
              <p className="text-xs text-gray-500">Invoice #{completedInvoice.invoice_no} generated successfully</p>
            </div>

            <div className="my-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs space-y-1.5">
              <div className="flex justify-between text-gray-700">
                <span>Customer:</span>
                <strong className="text-gray-900">{completedInvoice.customer_name}</strong>
              </div>
              {completedInvoice.phone && (
                <div className="flex justify-between text-gray-700">
                  <span>WhatsApp Mobile:</span>
                  <strong className="text-emerald-700 font-mono">{completedInvoice.phone}</strong>
                </div>
              )}
              <div className="flex justify-between text-gray-700 border-t border-emerald-200 pt-1 font-bold text-sm">
                <span>Total Paid:</span>
                <strong className="text-emerald-600 text-base">₹{completedInvoice.total}</strong>
              </div>
            </div>

            <div className="space-y-2">
              {completedInvoice.phone ? (
                <button 
                  onClick={() => dispatchWhatsApp(completedInvoice)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  <MessageSquare size={16} /> Send / Re-send Digital Bill on WhatsApp 💬
                </button>
              ) : (
                <p className="text-center text-xs text-gray-400 italic">No phone number was entered for WhatsApp dispatch.</p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={() => window.print()}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <button 
                  onClick={() => setCompletedInvoice(null)}
                  className="py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs"
                >
                  New Order
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}