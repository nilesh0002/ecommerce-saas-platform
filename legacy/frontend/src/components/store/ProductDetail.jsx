import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import HardwareSpecsTable from '../ui/HardwareSpecsTable';
import RatingStars from '../ui/RatingStars';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`/api/store/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        alert('Please login to add items to cart');
        return;
      }

      await axios.post('/api/checkout/cart', 
        { productId: id, quantity },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('Added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading product...</div>;
  if (!product) return <div className="p-8 text-center">Product not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div>
          <img 
            src={product.image_url || '/placeholder.jpg'} 
            alt={product.name}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.brand} | Model: {product.model}</p>
          
          <div className="flex items-center mb-4">
            <RatingStars rating={product.avg_rating || 0} />
            <span className="ml-2 text-gray-600">({product.review_count} reviews)</span>
          </div>

          <div className="text-4xl font-bold text-green-600 mb-6">₹{product.price}</div>

          <div className="mb-6">
            <p className="text-gray-700">{product.description}</p>
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {product.stock > 0 ? (
              <span className="text-green-600 font-semibold">In Stock ({product.stock} available)</span>
            ) : (
              <span className="text-red-600 font-semibold">Out of Stock</span>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          {product.stock > 0 && (
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center border rounded">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="px-4 py-2 border-x">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3 py-2 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
              
              <button 
                onClick={addToCart}
                className="bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-600 font-semibold"
              >
                Add to Cart
              </button>
              
              <button className="bg-yellow-500 text-white px-8 py-3 rounded-lg hover:bg-yellow-600 font-semibold">
                Buy Now
              </button>
            </div>
          )}

          {/* Warranty Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Warranty & Support</h3>
            <p className="text-sm text-gray-600">{product.warranty_months} months manufacturer warranty</p>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="mt-12">
        <HardwareSpecsTable specifications={product.specifications} />
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
        <div className="space-y-4">
          {product.reviews.map(review => (
            <div key={review.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="font-semibold">{review.first_name} {review.last_name}</span>
                  <RatingStars rating={review.rating} size="sm" className="ml-2" />
                </div>
                <span className="text-gray-500 text-sm">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700">{review.review_text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;