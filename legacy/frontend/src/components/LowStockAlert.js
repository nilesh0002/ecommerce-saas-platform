import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

const LowStockAlert = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  const fetchLowStockProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/products/low-stock`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setLowStockProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch low stock products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dismissed || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <FiAlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Low Stock Alert
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              You have {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} with low stock (less than 5 units):
            </p>
            <ul className="mt-2 space-y-1">
              {lowStockProducts.slice(0, 3).map((product) => (
                <li key={product.id} className="flex justify-between">
                  <span>{product.name}</span>
                  <span className="font-medium">
                    {product.stock} unit{product.stock !== 1 ? 's' : ''} left
                  </span>
                </li>
              ))}
              {lowStockProducts.length > 3 && (
                <li className="text-yellow-600">
                  ...and {lowStockProducts.length - 3} more
                </li>
              )}
            </ul>
            <div className="mt-3">
              <a 
                href="/admin/products" 
                className="font-medium text-yellow-800 underline hover:text-yellow-600"
              >
                Review inventory →
              </a>
            </div>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setDismissed(true)}
            className="text-yellow-400 hover:text-yellow-600"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LowStockAlert;