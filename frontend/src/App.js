import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/AdminLogin';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './components/AdminDashboard';
import ProductManagement from './components/ProductManagement';
import OrderManagement from './components/OrderManagement';
import UserManagement from './components/UserManagement';
import SuperAdminMerchants from './components/SuperAdminMerchants';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/products" 
            element={
              <AdminRoute>
                <ProductManagement />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/orders" 
            element={
              <AdminRoute>
                <OrderManagement />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/merchants" 
            element={
              <AdminRoute>
                <SuperAdminMerchants />
              </AdminRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;