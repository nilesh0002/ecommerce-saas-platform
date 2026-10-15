import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiDollarSign, FiShoppingCart, FiUsers, FiPackage, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import LowStockAlert from './LowStockAlert';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
  const isSuperAdmin = adminData.role === 'super_admin';

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/dashboard/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStats(response.data);
      
      // Mock chart data - replace with real data from API
      setChartData([
        { name: 'Jan', sales: 4000, orders: 24 },
        { name: 'Feb', sales: 3000, orders: 18 },
        { name: 'Mar', sales: 5000, orders: 32 },
        { name: 'Apr', sales: 4500, orders: 28 },
        { name: 'May', sales: 6000, orders: 38 },
        { name: 'Jun', sales: 5500, orders: 35 },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? (
              <div className="loading-skeleton h-8 w-20"></div>
            ) : (
              value
            )}
          </p>
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <FiTrendingUp className="h-4 w-4 mr-1" />
              {change > 0 ? '+' : ''}{change}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isSuperAdmin ? 'Super Admin Dashboard' : 'Dashboard'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isSuperAdmin 
            ? 'Platform-wide overview and merchant management'
            : 'Overview of your e-commerce store performance'
          }
        </p>
      </div>

      {/* Low Stock Alert */}
      <LowStockAlert />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`$${stats.totalSales?.toLocaleString() || '0'}`}
          icon={FiDollarSign}
          color="bg-green-500"
          change={12.5}
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders || '0'}
          icon={FiShoppingCart}
          color="bg-blue-500"
          change={-2.3}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers || '0'}
          icon={FiUsers}
          color="bg-purple-500"
          change={8.1}
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockProducts || '0'}
          icon={FiPackage}
          color={stats.lowStockProducts > 0 ? "bg-red-500" : "bg-gray-500"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className={`grid grid-cols-1 gap-4 ${isSuperAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {isSuperAdmin && (
            <a 
              href="/admin/merchants" 
              className="block p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <h4 className="text-lg font-semibold text-red-900 mb-2">Merchant Management</h4>
              <p className="text-red-700">Manage all merchants, create new stores, and monitor platform activity.</p>
            </a>
          )}
          
          <a 
            href="/admin/products" 
            className="block p-6 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <h4 className="text-lg font-semibold text-indigo-900 mb-2">Product Management</h4>
            <p className="text-indigo-700">
              {isSuperAdmin ? 'View all products across merchants' : 'Manage your product catalog and inventory'}.
            </p>
          </a>
          
          <a 
            href="/admin/orders" 
            className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <h4 className="text-lg font-semibold text-green-900 mb-2">Order Management</h4>
            <p className="text-green-700">
              {isSuperAdmin ? 'Monitor all orders across the platform' : 'View and manage customer orders'}.
            </p>
          </a>
          
          <a 
            href="/admin/users" 
            className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <h4 className="text-lg font-semibold text-purple-900 mb-2">User Management</h4>
            <p className="text-purple-700">
              {isSuperAdmin ? 'View all users across all merchants' : 'Manage customer accounts and order history'}.
            </p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;