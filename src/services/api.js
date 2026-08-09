import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL.trim();
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    return url;
  }
  // Default to live Render cloud API for all clients (mobile, Vercel, localhost) to prevent 127.0.0.1 connection errors
  return 'https://supermart-api-xkjt.onrender.com/api';
};


export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// 1. AUTHENTICATION & SECURITY
// ==========================================
export const loginUser = (data) => api.post('/auth/login', data);
export const logoutUser = (data) => api.post('/auth/logout', data);
export const sendHeartbeat = (data) => api.post('/auth/heartbeat', data);
export const requestPasswordReset = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);


// ==========================================
// 2. EMPLOYEE MANAGEMENT
// ==========================================
export const fetchEmployees = () => api.get('/auth/employees');
export const addEmployee = (data) => api.post('/auth/employees', data);
export const updateEmployee = (id, data) => api.put(`/auth/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/auth/employees/${id}`);
export const sendAdminOtp = (data = {}) => api.post('/auth/send-admin-otp', data);
// ==========================================
// 3. INVENTORY MANAGEMENT
// ==========================================
export const fetchProducts = () => api.get('/inventory');
export const fetchInventory = fetchProducts;
export const addProductToDB = (data) => api.post('/inventory', data);
export const updateProductInDB = (id, data) => api.put(`/inventory/${id}`, data);
export const deleteProductFromDB = (id) => api.delete(`/inventory/${id}`);

// ==========================================
// 4. BILLING & DASHBOARD
// ==========================================
export const generateBill = (data) => api.post('/checkout', data);
export const scanBarcodeApi = (barcode) => api.post('/barcode/scan', { barcode });
export const sendWhatsAppBillApi = (data) => api.post('/notifications/whatsapp', data);
export const fetchSalesHistory = () => api.get('/sales/history');
export const fetchDashboardStats = () => api.get('/integration/dashboard');
export const fetchEmployeeDashboardStats = (cashier = '') => api.get('/employee/dashboard-stats', { params: { cashier } });
export const fetchRecentInvoices = () => api.get('/invoices/recent');

// ==========================================
// 5. FILE DOWNLOADS, REPORTS & SETTINGS
// ==========================================
export const fetchReportsLogs = (category = 'All', search = '') => 
  api.get(`/reports/logs`, { params: { category, search } });

export const generateReportApi = (reportName) => 
  api.post('/reports/generate', { reportName });

export const downloadInvoiceFile = (filename) => api.get(`/downloads/${filename}`, { responseType: 'blob' });
export const exportReportFile = (type) => api.get(`/reports/export/${type}`, { responseType: 'blob' });
export const downloadDatabaseBackup = () => api.get('/settings/backup', { responseType: 'blob' });
export const fetchDbHealth = () => api.get('/settings/db-health');
export const fetchShopSettings = () => api.get('/settings/shop');
export const saveShopSettingsApi = (data) => api.post('/settings/shop', data);

// Alias to satisfy Reports.jsx naming convention
export const downloadReport = exportReportFile;

export default api;