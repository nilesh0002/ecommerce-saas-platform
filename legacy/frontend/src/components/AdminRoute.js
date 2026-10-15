import React from 'react';
import { Navigate } from 'react-router-dom';
import Layout from './Layout';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default AdminRoute;