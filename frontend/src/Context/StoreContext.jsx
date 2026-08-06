import React, { createContext, useState, useEffect } from 'react';
import { fetchProducts } from '../services/api'; // Ensure this path matches

// Create the context
export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  // Load everything when the app starts
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. Try to fetch from your Flask Python server
      const invResponse = await fetchProducts();
      if (invResponse.data) {
        setInventory(invResponse.data);
        setIsBackendOnline(true);
      }
    } catch (error) {
      console.warn("Backend offline. Switching to Global Offline Mode.");
      setIsBackendOnline(false);
      
      // 2. Fallback to browser storage
      const savedInv = localStorage.getItem('global_inventory');
      if (savedInv) {
        setInventory(JSON.parse(savedInv));
      } else {
        // Default Mock Data
        const defaultData = [
          { id: "101", barcode: "12345", name: "Mechanical Keyboard", price: 1500, stock: 12 },
          { id: "102", barcode: "67890", name: "Wireless Mouse", price: 800, stock: 5 }
        ];
        setInventory(defaultData);
        localStorage.setItem('global_inventory', JSON.stringify(defaultData));
      }
    }
  };

  // --- Global Functions ---
  // When you call this from ANY tab, it updates EVERY tab instantly.
  const addProductToGlobalState = (newProduct) => {
    const updatedInventory = [...inventory, newProduct];
    setInventory(updatedInventory);
    
    if (!isBackendOnline) {
      localStorage.setItem('global_inventory', JSON.stringify(updatedInventory));
    }
  };

  const removeProductFromGlobalState = (id) => {
    const updatedInventory = inventory.filter(p => p.id !== id);
    setInventory(updatedInventory);
    
    if (!isBackendOnline) {
      localStorage.setItem('global_inventory', JSON.stringify(updatedInventory));
    }
  };

  return (
    <StoreContext.Provider value={{ 
      inventory, 
      employees, 
      isBackendOnline,
      addProductToGlobalState,
      removeProductFromGlobalState
    }}>
      {children}
    </StoreContext.Provider>
  );
};