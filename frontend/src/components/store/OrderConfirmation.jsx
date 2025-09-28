import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading order details...</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">Thank you for your purchase. Your order has been successfully placed.</p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Details</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-gray-600">Order ID</p>
              <p className="font-semibold">#{order.id}</p>
            </div>
            <div>
              <p className="text-gray-600">Order Date</p>
              <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Amount</p>
              <p className="font-semibold text-green-600">₹{order.total_amount}</p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                {order.status}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-2">Estimated Delivery</p>
            <p className="font-semibold">
              {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} 
              (7-10 business days)
            </p>
          </div>

          <div>
            <p className="text-gray-600 mb-2">Shipping Address</p>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium">{order.shipping_address?.name}</p>
              <p className="text-sm text-gray-600">
                {order.shipping_address?.address_line1}, {order.shipping_address?.city}, 
                {order.shipping_address?.state} - {order.shipping_address?.pincode}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Items Ordered</h2>
          <div className="space-y-4">
            {order.items?.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-3 border rounded">
                <img 
                  src={item.image_url || '/placeholder.jpg'} 
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link 
            to="/orders" 
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-semibold"
          >
            View All Orders
          </Link>
          <Link 
            to="/products" 
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-semibold"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Support Info */}
        <div className="text-center mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Need help with your order? Contact us at{' '}
            <a href="mailto:support@hardwarestore.com" className="text-blue-600 hover:underline">
              support@hardwarestore.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;