import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Wand2, Loader2, Image as ImageIcon, Filter } from 'lucide-react';
import { fetchProducts, addProductToDB, deleteProductFromDB, updateProductInDB } from '../../services/api';

const CATEGORIES = ['All', 'Groceries', 'Beverages', 'Electronics', 'Clothing', 'Snacks', 'Other'];

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    barcode: '', name: '', category: 'Groceries', price: '', stock: '', lowStockAlert: '', imageUrl: '', specifications: ''
  });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const response = await fetchProducts();
      // FIX: Check for response.data.items from the Python backend
      if (response.data && response.data.items) {
        setProducts(response.data.items);
      } else if (Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (error) {
      const savedLocal = localStorage.getItem('global_inventory');
      if (savedLocal) setProducts(JSON.parse(savedLocal));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Delete this product?")) {
      const filtered = products.filter(p => p.id !== id);
      setProducts(filtered);
      localStorage.setItem('global_inventory', JSON.stringify(filtered));
      try { await deleteProductFromDB(id); } catch (e) {}
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ barcode: '', name: '', category: 'Groceries', price: '', stock: '', lowStockAlert: '', imageUrl: '', specifications: '' });
    }
    setIsModalOpen(true);
  };

  // --- FIXED IMAGE GENERATOR ---
  // --- SMARTER WEB SEARCH SIMULATION ---
  const handleAutoFill = () => {
    if (!formData.name) return alert("Please enter a Product Name first!");
    
    setIsSearchingWeb(true);
    
    setTimeout(() => {
      const searchTerm = formData.name.toLowerCase();
      // Extract the first descriptive word for a highly accurate image search
      const keyword = searchTerm.split(' ')[0]; 
      
      // LoremFlickr allows us to target specific keywords (e.g., 'electronics', 'coffee')
      let generatedImage = `https://loremflickr.com/400/400/${keyword},product/all`;
      let generatedSpecs = "• Standard Retail Packaging\n• High Quality Material\n• 1 Year Warranty";

      // Smart category and spec mapping based on text
      if (searchTerm.includes("mouse") || searchTerm.includes("keyboard") || searchTerm.includes("cable")) {
        generatedSpecs = "• Wireless / Plug & Play\n• Ergonomic Design\n• Compatible with Windows/Mac";
        setFormData(prev => ({...prev, category: 'Electronics'}));
      } else if (searchTerm.includes("coffee") || searchTerm.includes("tea") || searchTerm.includes("juice")) {
        generatedSpecs = "• 100% Natural\n• Store in a cool, dry place\n• Best before 12 months";
        setFormData(prev => ({...prev, category: 'Beverages'}));
      } else if (searchTerm.includes("shirt") || searchTerm.includes("jeans") || searchTerm.includes("apparel")) {
        generatedSpecs = "• 100% Cotton\n• Machine Washable\n• Available in multiple sizes";
        setFormData(prev => ({...prev, category: 'Clothing'}));
      } else if (searchTerm.includes("chips") || searchTerm.includes("biscuit") || searchTerm.includes("snack")) {
        generatedSpecs = "• Crispy & Fresh\n• Perfect for sharing\n• Contains artificial flavors";
        setFormData(prev => ({...prev, category: 'Snacks'}));
      }

      setFormData(prev => ({ ...prev, imageUrl: generatedImage, specifications: generatedSpecs }));
      setIsSearchingWeb(false);
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalData = { ...formData, id: editingProduct ? editingProduct.id : Date.now().toString() };
    
    const newProductList = editingProduct 
      ? products.map(p => p.id === editingProduct.id ? finalData : p)
      : [...products, finalData];
    
    setProducts(newProductList);
    localStorage.setItem('global_inventory', JSON.stringify(newProductList));
    
    try {
      if (editingProduct) await updateProductInDB(editingProduct.id, finalData);
      else await addProductToDB(finalData);
    } catch (e) {}
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.toString().includes(searchQuery);
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
        <button onClick={() => openModal()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition font-bold">
          <Plus size={20} /> Add New Product
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* FILTERS AREA */}
        <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <input 
            type="text" 
            placeholder="Search by name or barcode..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="p-2 border rounded w-full sm:w-1/3 focus:outline-none focus:border-emerald-500" 
          />
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <Filter size={18} className="text-gray-400 min-w-max" />
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm border-b">
              <th className="p-4">Image</th>
              <th className="p-4">Product Details</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price (₹)</th>
              <th className="p-4">Stock</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex items-center justify-center text-gray-400">
                    {product.imageUrl ? <img src={product.imageUrl} alt="img" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} /> : <ImageIcon size={20} />}
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-bold text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{product.barcode}</p>
                </td>
                <td className="p-4 font-semibold text-gray-600">{product.category || 'Other'}</td>
                <td className="p-4 font-bold text-emerald-700">₹{product.price}</td>
                <td className="p-4 font-semibold">{product.stock}</td>
                <td className="p-4 flex justify-center gap-3">
                  <button onClick={() => openModal(product)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Product Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded focus:border-emerald-500 focus:outline-none" />
                </div>
                
                <button type="button" onClick={handleAutoFill} disabled={isSearchingWeb} className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 transition flex items-center gap-2">
                  {isSearchingWeb ? <><Loader2 size={18} className="animate-spin"/> Searching Web...</> : <><Wand2 size={18} /> Auto-Fill Data</>}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label><input required type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full p-2 border rounded" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded focus:border-emerald-500">
                    {CATEGORIES.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock</label><input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label><input required type="number" value={formData.lowStockAlert} onChange={e => setFormData({...formData, lowStockAlert: Number(e.target.value)})} className="w-full p-2 border rounded" /></div>
              </div>

              <div className="border-t pt-4 mt-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Image URL</label>
                <input type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full p-2 border rounded text-sm text-gray-500" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Specifications</label>
                <textarea value={formData.specifications} onChange={e => setFormData({...formData, specifications: e.target.value})} className="w-full p-2 border rounded text-sm" rows="3"></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">{editingProduct ? 'Save' : 'Add to Inventory'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}