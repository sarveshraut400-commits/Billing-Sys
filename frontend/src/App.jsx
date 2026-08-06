import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';

import Sidebar from './components/layout/Sidebar';
import Home from './pages/Home';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import EmployeeDashboard from './pages/Dashboard/EmployeeDashboard';
import Billing from './pages/Billing/Billing';
import Inventory from './pages/Inventory/Inventory';
import EmployeeManagement from './pages/Employees/EmployeeManagement';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import Activity from './pages/Activity/Activity';
import { logoutUser } from './services/api';

export default function App() {
  const [currentUserRole, setCurrentUserRole] = useState(''); // Empty = Not logged in

  const handleLogout = async () => {
    try {
      if (currentUserRole) {
        await logoutUser({ role: currentUserRole });
      }
    } catch (e) {
      console.warn("Logout log warning:", e);
    } finally {
      setCurrentUserRole('');
    }
  };

  return (
    <StoreProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/" element={<Home onLogin={setCurrentUserRole} />} />

          {/* Protected App Routes */}
          <Route
            path="/*"
            element={
              !currentUserRole ? (
                <Navigate to="/" replace />
              ) : (
                <div className="flex min-h-screen bg-gray-100">
                  <Sidebar role={currentUserRole} />
                  
                  <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <header className="bg-white p-4 shadow-sm flex justify-between items-center z-10 border-b">
                      <div className="text-gray-600 font-medium">
                        Logged in as: <span className="font-bold text-gray-800">{currentUserRole.toUpperCase()}</span>
                      </div>
                      <button 
                        onClick={handleLogout} 
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition border border-red-200"
                      >
                        Log Out
                      </button>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-gray-50">
                      <Routes>
                        <Route path="/admin-dashboard" element={currentUserRole === 'admin' ? <AdminDashboard /> : <Navigate to="/employee-dashboard" />} />
                        <Route path="/employee-dashboard" element={currentUserRole === 'employee' ? <EmployeeDashboard /> : <Navigate to="/admin-dashboard" />} />
                        <Route path="/billing" element={<Billing />} />
                        
                        {/* Admin-Only */}
                        {currentUserRole === 'admin' && (
                          <>
                            <Route path="/inventory" element={<Inventory />} />
                            <Route path="/employees" element={<EmployeeManagement />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/activity" element={<Activity />} />
                            <Route path="/settings" element={<Settings />} />
                          </>
                        )}

                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to={currentUserRole === 'admin' ? "/admin-dashboard" : "/employee-dashboard"} replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              )
            }
          />
        </Routes>
      </Router>
    </StoreProvider>
  );
}