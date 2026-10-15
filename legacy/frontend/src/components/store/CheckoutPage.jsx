import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CheckoutStepper from '../ui/CheckoutStepper';
import RazorpayButton from '../ui/RazorpayButton';

const CheckoutPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [addressForm, setAddressForm] = useState({
    name: '', phone: '', address_line1: '', address_line2: '',
    city: '', state: '', pincode: '', is_default: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const [cartRes, addressRes] = await Promise.all([
        axios.get('/api/checkout/cart', { headers: { Authorization: `Bearer ${token}` }}),
        axios.get('/api/checkout/addresses', { headers: { Authorization: `Bearer ${token}` }})
      ]);

      setCartItems(cartRes.data);
      setAddresses(addressRes.data);
      
      if (addressRes.data.length > 0) {
        setSelectedAddress(addressRes.data.find(addr => addr.is_default) || addressRes.data[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('userToken');
      await axios.post('/api/checkout/addresses', addressForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchData();
      setShowAddressForm(false);
      setAddressForm({
        name: '', phone: '', address_line1: '', address_line2: '',
        city: '', state: '', pincode: '', is_default: false
      });
    } catch (error) {
      console.error('Error adding address:', error);
    }
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePaymentSuccess = (response) => {
    navigate(`/order-confirmation/${response.orderId}`);
  };

  const handlePaymentError = (error) => {
    alert(`Payment failed: ${error}`);
  };

  if (loading) return <div className="p-8 text-center">Loading checkout...</div>;

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button 
          onClick={() => navigate('/products')}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <CheckoutStepper currentStep={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2">
          {/* Step 1: Shipping Address */}
          {currentStep === 1 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              
              {addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {addresses.map(address => (
                    <div 
                      key={address.id}
                      className={`p-4 border rounded-lg cursor-pointer ${
                        selectedAddress?.id === address.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedAddress(address)}
                    >
                      <div className="font-semibold">{address.name}</div>
                      <div className="text-sm text-gray-600">
                        {address.address_line1}, {address.address_line2 && `${address.address_line2}, `}
                        {address.city}, {address.state} - {address.pincode}
                      </div>
                      <div className="text-sm text-gray-600">Phone: {address.phone}</div>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-blue-500 hover:underline mb-4"
              >
                + Add New Address
              </button>

              {showAddressForm && (
                <form onSubmit={addAddress} className="space-y-4 mb-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={addressForm.name}
                      onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
                      className="p-2 border rounded"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                      className="p-2 border rounded"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={addressForm.address_line1}
                    onChange={(e) => setAddressForm({...addressForm, address_line1: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2 (Optional)"
                    value={addressForm.address_line2}
                    onChange={(e) => setAddressForm({...addressForm, address_line2: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                      className="p-2 border rounded"
                      required
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                      className="p-2 border rounded"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({...addressForm, pincode: e.target.value})}
                      className="p-2 border rounded"
                      required
                    />
                  </div>
                  <div className="flex gap-4">
                    <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                      Save Address
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddressForm(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <button 
                onClick={() => setCurrentStep(2)}
                disabled={!selectedAddress}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {currentStep === 2 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              
              <div className="mb-6">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center mb-2">
                    <input type="radio" id="razorpay" name="payment" defaultChecked />
                    <label htmlFor="razorpay" className="ml-2 font-semibold">Razorpay (Cards, UPI, Wallets)</label>
                  </div>
                  <p className="text-sm text-gray-600">Secure payment via Razorpay</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentStep(1)}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button 
                  onClick={() => setCurrentStep(3)}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                >
                  Review Order
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Order Review */}
          {currentStep === 3 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Order Review</h2>
              
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="font-medium">{selectedAddress.name}</div>
                  <div className="text-sm text-gray-600">
                    {selectedAddress.address_line1}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {cartItems.map(item => (
                    <div key={item.product_id} className="flex justify-between items-center p-2 border-b">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-600 ml-2">x{item.quantity}</span>
                      </div>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentStep(2)}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                
                <RazorpayButton
                  amount={getTotalAmount()}
                  orderData={{
                    userId: JSON.parse(localStorage.getItem('user'))?.id,
                    merchantId: 1, // Get from context
                    totalAmount: getTotalAmount(),
                    addressId: selectedAddress.id,
                    items: cartItems.map(item => ({
                      productId: item.product_id,
                      quantity: item.quantity,
                      price: item.price
                    })),
                    customerName: selectedAddress.name,
                    customerEmail: JSON.parse(localStorage.getItem('user'))?.email,
                    customerPhone: selectedAddress.phone
                  }}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md sticky top-4">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-2 mb-4">
              {cartItems.map(item => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <hr className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{getTotalAmount().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{getTotalAmount().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;