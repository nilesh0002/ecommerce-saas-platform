import React from 'react';
import axios from 'axios';

const RazorpayButton = ({ amount, orderData, onSuccess, onError, disabled = false }) => {
  const handlePayment = async () => {
    try {
      // Create Razorpay order
      const token = localStorage.getItem('userToken');
      const orderResponse = await axios.post('/api/checkout/create-order', {
        amount,
        currency: 'INR',
        receipt: `order_${Date.now()}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { orderId } = orderResponse.data;

      // Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: 'INR',
        name: 'Hardware Store',
        description: 'Purchase from Hardware Store',
        order_id: orderId,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await axios.post('/api/checkout/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (verifyResponse.data.success) {
              onSuccess(verifyResponse.data);
            } else {
              onError('Payment verification failed');
            }
          } catch (error) {
            onError('Payment verification failed');
          }
        },
        prefill: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone
        },
        theme: {
          color: '#3B82F6'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      onError('Failed to initiate payment');
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled}
      className={`w-full py-3 px-6 rounded-lg font-semibold text-white ${
        disabled 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-green-600 hover:bg-green-700'
      }`}
    >
      Pay ₹{amount}
    </button>
  );
};

export default RazorpayButton;