import axios from 'axios';

// Ensure this matches your Python backend address exactly
const API_BASE_URL = 'http://127.0.0.1:5000/api';

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
export const requestPasswordReset = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);

// ==========================================
// 2. EMPLOYEE MANAGEMENT
// ==========================================
export const fetchEmployees = () => api.get('/auth/employees');
export const addEmployee = (data) => api.post('/auth/employees', data);
export const updateEmployee = (id, data) => api.put(`/auth/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/auth/employees/${id}`);
export const sendAdminOtp = () => api.post('/auth/send-admin-otp');
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
// 5. FILE DOWNLOADS & REPORTS (LIVE DATABASE)
// ==========================================
export const fetchReportsLogs = (category = 'All', search = '') => 
  api.get(`/reports/logs`, { params: { category, search } });

export const generateReportApi = (reportName) => 
  api.post('/reports/generate', { reportName });

export const downloadInvoiceFile = (filename) => api.get(`/downloads/${filename}`, { responseType: 'blob' });
export const exportReportFile = (type) => api.get(`/reports/export/${type}`, { responseType: 'blob' });
export const downloadDatabaseBackup = () => api.get('/settings/backup', { responseType: 'blob' });
export const fetchDbHealth = () => api.get('/settings/db-health');

// Alias to satisfy Reports.jsx naming convention
export const downloadReport = exportReportFile;

export default api;