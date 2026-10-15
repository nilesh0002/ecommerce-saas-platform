-- E-commerce SaaS Platform Database Schema
-- Run this file first to create the basic structure

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create merchants table (for multi-tenant support)
CREATE TABLE merchants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    plan VARCHAR(50) DEFAULT 'basic', -- basic, premium, enterprise
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table (customers)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category VARCHAR(100),
    image_url TEXT,
    sku VARCHAR(100),
    weight DECIMAL(8,2), -- in pounds
    dimensions VARCHAR(100), -- e.g., "10x8x2 inches"
    is_active BOOLEAN DEFAULT true,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    shipping_address TEXT NOT NULL,
    billing_address TEXT,
    payment_method VARCHAR(50), -- credit_card, paypal, etc.
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table (products in each order)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0), -- price at time of order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table (for better product organization)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_merchants_subdomain ON merchants(subdomain);
CREATE INDEX idx_merchants_active ON merchants(is_active);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_merchant ON admins(merchant_id);
CREATE INDEX idx_admins_role ON admins(role);

CREATE INDEX idx_users_email_merchant ON users(email, merchant_id);
CREATE INDEX idx_users_merchant ON users(merchant_id);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE INDEX idx_categories_merchant ON categories(merchant_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample merchants
INSERT INTO merchants (name, subdomain, email, phone, plan) VALUES 
('Demo Store 1', 'store1', 'admin@store1.com', '(555) 123-4567', 'premium'),
('Demo Store 2', 'store2', 'admin@store2.com', '(555) 987-6543', 'basic'),
('Enterprise Store', 'enterprise', 'admin@enterprise.com', '(555) 555-5555', 'enterprise');

-- Insert sample categories
INSERT INTO categories (name, description, merchant_id) VALUES 
('Electronics', 'Electronic devices and accessories', 1),
('Clothing', 'Apparel and fashion items', 1),
('Home & Garden', 'Home improvement and garden supplies', 1),
('Books', 'Books and educational materials', 2),
('Sports', 'Sports equipment and accessories', 2);

-- Note: Admin users will be created using the generate-hash.js script
-- This ensures secure password hashing

-- Create a view for order summaries
CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.status,
    o.total_amount,
    o.created_at,
    u.first_name || ' ' || u.last_name as customer_name,
    u.email as customer_email,
    m.name as merchant_name,
    COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN merchants m ON o.merchant_id = m.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.status, o.total_amount, o.created_at, u.first_name, u.last_name, u.email, m.name;

-- Create a view for product inventory
CREATE VIEW product_inventory AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock,
    p.category,
    m.name as merchant_name,
    m.subdomain,
    CASE 
        WHEN p.stock = 0 THEN 'out_of_stock'
        WHEN p.stock < 5 THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status
FROM products p
LEFT JOIN merchants m ON p.merchant_id = m.id
WHERE p.is_active = true;

COMMENT ON TABLE merchants IS 'Stores/businesses using the platform';
COMMENT ON TABLE admins IS 'Admin users who manage stores';
COMMENT ON TABLE users IS 'Customers who place orders';
COMMENT ON TABLE products IS 'Products available for sale';
COMMENT ON TABLE orders IS 'Customer orders';
COMMENT ON TABLE order_items IS 'Individual items within orders';
COMMENT ON TABLE categories IS 'Product categories for organization';