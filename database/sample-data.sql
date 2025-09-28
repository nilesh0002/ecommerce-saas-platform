-- Sample data for testing and demonstration
-- Run this after the main schema and admin setup

-- Insert sample users (customers)
INSERT INTO users (email, password_hash, first_name, last_name, phone, address, city, state, zip_code, merchant_id) VALUES 
-- Store 1 customers
('john.doe@email.com', '$2b$10$rQZ8kHWKtGY5uJQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5e', 'John', 'Doe', '(555) 123-4567', '123 Main St', 'New York', 'NY', '10001', 1),
('jane.smith@email.com', '$2b$10$rQZ8kHWKtGY5uJQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5e', 'Jane', 'Smith', '(555) 234-5678', '456 Oak Ave', 'Los Angeles', 'CA', '90210', 1),
('mike.johnson@email.com', '$2b$10$rQZ8kHWKtGY5uJQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5e', 'Mike', 'Johnson', '(555) 345-6789', '789 Pine St', 'Chicago', 'IL', '60601', 1),

-- Store 2 customers
('sarah.wilson@email.com', '$2b$10$rQZ8kHWKtGY5uJQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5e', 'Sarah', 'Wilson', '(555) 456-7890', '321 Elm St', 'Houston', 'TX', '77001', 2),
('david.brown@email.com', '$2b$10$rQZ8kHWKtGY5uJQJ5vQJ5eKQJ5eKQJ5vQJ5eKQJ5vQJ5eKQJ5eKQJ5e', 'David', 'Brown', '(555) 567-8901', '654 Maple Ave', 'Phoenix', 'AZ', '85001', 2);

-- Insert sample products for Store 1 (Electronics & Clothing)
INSERT INTO products (name, description, price, stock, category, sku, merchant_id) VALUES 
-- Electronics
('iPhone 15 Pro', 'Latest Apple iPhone with advanced camera system', 999.99, 25, 'Electronics', 'IPH15PRO001', 1),
('Samsung Galaxy S24', 'Premium Android smartphone with AI features', 899.99, 30, 'Electronics', 'SGS24001', 1),
('MacBook Air M3', 'Lightweight laptop with M3 chip', 1299.99, 15, 'Electronics', 'MBA15M3001', 1),
('AirPods Pro 2', 'Wireless earbuds with noise cancellation', 249.99, 50, 'Electronics', 'APP2001', 1),
('iPad Air', 'Versatile tablet for work and creativity', 599.99, 20, 'Electronics', 'IPADAIR001', 1),

-- Low stock items for testing alerts
('Wireless Charger', 'Fast wireless charging pad', 39.99, 3, 'Electronics', 'WC001', 1),
('Phone Case', 'Protective case for smartphones', 19.99, 2, 'Electronics', 'PC001', 1),
('Screen Protector', 'Tempered glass screen protector', 12.99, 1, 'Electronics', 'SP001', 1),

-- Clothing
('Classic T-Shirt', 'Comfortable cotton t-shirt', 24.99, 100, 'Clothing', 'CT001', 1),
('Denim Jeans', 'Premium denim jeans', 79.99, 45, 'Clothing', 'DJ001', 1),
('Sneakers', 'Comfortable running sneakers', 129.99, 35, 'Clothing', 'SN001', 1),
('Hoodie', 'Warm and cozy hoodie', 59.99, 25, 'Clothing', 'HD001', 1);

-- Insert sample products for Store 2 (Books & Sports)
INSERT INTO products (name, description, price, stock, category, sku, merchant_id) VALUES 
-- Books
('The Great Gatsby', 'Classic American novel', 14.99, 50, 'Books', 'TGG001', 2),
('To Kill a Mockingbird', 'Pulitzer Prize winning novel', 16.99, 40, 'Books', 'TKAM001', 2),
('1984', 'Dystopian social science fiction novel', 15.99, 35, 'Books', '1984001', 2),
('Programming Guide', 'Complete guide to modern programming', 49.99, 20, 'Books', 'PG001', 2),

-- Sports
('Basketball', 'Official size basketball', 29.99, 25, 'Sports', 'BB001', 2),
('Tennis Racket', 'Professional tennis racket', 149.99, 15, 'Sports', 'TR001', 2),
('Yoga Mat', 'Non-slip exercise mat', 39.99, 30, 'Sports', 'YM001', 2),

-- Low stock items for Store 2
('Water Bottle', 'Insulated water bottle', 24.99, 4, 'Sports', 'WB001', 2),
('Resistance Bands', 'Set of exercise resistance bands', 19.99, 2, 'Sports', 'RB001', 2);

-- Insert sample orders
INSERT INTO orders (user_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status) VALUES 
-- Store 1 orders
(1, 1, 'delivered', 1049.98, '123 Main St, New York, NY 10001', 'credit_card', 'paid'),
(2, 1, 'shipped', 249.99, '456 Oak Ave, Los Angeles, CA 90210', 'paypal', 'paid'),
(3, 1, 'pending', 159.98, '789 Pine St, Chicago, IL 60601', 'credit_card', 'pending'),
(1, 1, 'processing', 79.99, '123 Main St, New York, NY 10001', 'credit_card', 'paid'),

-- Store 2 orders
(4, 2, 'delivered', 64.98, '321 Elm St, Houston, TX 77001', 'credit_card', 'paid'),
(5, 2, 'shipped', 149.99, '654 Maple Ave, Phoenix, AZ 85001', 'paypal', 'paid'),
(4, 2, 'pending', 89.97, '321 Elm St, Houston, TX 77001', 'credit_card', 'paid');

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES 
-- Order 1 items (Store 1)
(1, 1, 1, 999.99), -- iPhone 15 Pro
(1, 6, 1, 39.99),  -- Wireless Charger
(1, 7, 1, 19.99),  -- Phone Case

-- Order 2 items (Store 1)
(2, 4, 1, 249.99), -- AirPods Pro 2

-- Order 3 items (Store 1)
(3, 10, 2, 79.99), -- Denim Jeans

-- Order 4 items (Store 1)
(4, 10, 1, 79.99), -- Denim Jeans

-- Order 5 items (Store 2)
(5, 13, 2, 14.99), -- The Great Gatsby
(5, 14, 2, 16.99), -- To Kill a Mockingbird
(5, 17, 1, 29.99), -- Basketball

-- Order 6 items (Store 2)
(6, 18, 1, 149.99), -- Tennis Racket

-- Order 7 items (Store 2)
(7, 15, 1, 15.99), -- 1984
(7, 19, 1, 39.99), -- Yoga Mat
(7, 20, 1, 24.99), -- Water Bottle
(7, 21, 1, 19.99); -- Resistance Bands

-- Update some product stock to reflect orders
UPDATE products SET stock = stock - 1 WHERE id IN (1, 4, 6, 7); -- Store 1 products
UPDATE products SET stock = stock - 2 WHERE id IN (10, 13, 14); -- Store 1 & 2 products
UPDATE products SET stock = stock - 1 WHERE id IN (17, 18, 15, 19, 20, 21); -- Store 2 products

-- Insert some additional categories
INSERT INTO categories (name, description, merchant_id) VALUES 
('Accessories', 'Phone and electronic accessories', 1),
('Footwear', 'Shoes and sneakers', 1),
('Fiction', 'Fiction books and novels', 2),
('Non-Fiction', 'Educational and reference books', 2),
('Fitness', 'Fitness and exercise equipment', 2);

-- Create some out of stock products for testing
INSERT INTO products (name, description, price, stock, category, sku, merchant_id) VALUES 
('Limited Edition Watch', 'Exclusive smartwatch - sold out', 399.99, 0, 'Electronics', 'LEW001', 1),
('Vintage Book Set', 'Rare book collection - out of stock', 199.99, 0, 'Books', 'VBS001', 2);

COMMENT ON TABLE users IS 'Sample customer accounts for testing';
COMMENT ON TABLE products IS 'Sample products with various stock levels for testing alerts';
COMMENT ON TABLE orders IS 'Sample orders in different statuses';
COMMENT ON TABLE order_items IS 'Individual items within sample orders';