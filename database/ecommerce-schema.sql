-- Additional tables for e-commerce functionality

-- User addresses for shipping
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping cart
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Payment records
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
);

-- Product specifications for hardware
CREATE TABLE product_specs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    spec_name VARCHAR(100) NOT NULL, -- Brand, Model, Warranty, etc.
    spec_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update orders table for shipping address
ALTER TABLE orders ADD COLUMN shipping_address_id INTEGER REFERENCES addresses(id);
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'razorpay';

-- Update products table for hardware focus
ALTER TABLE products ADD COLUMN brand VARCHAR(100);
ALTER TABLE products ADD COLUMN model VARCHAR(100);
ALTER TABLE products ADD COLUMN warranty_months INTEGER DEFAULT 12;
ALTER TABLE products ADD COLUMN rating DECIMAL(2,1) DEFAULT 0.0;
ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_cart_product ON cart_items(product_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_razorpay ON payments(razorpay_order_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_specs_product ON product_specs(product_id);

-- Sample hardware categories
INSERT INTO categories (name, description, merchant_id) VALUES 
('Power Tools', 'Drills, saws, grinders and more', 1),
('Hand Tools', 'Screwdrivers, wrenches, hammers', 1),
('Electronics', 'Gadgets, components, accessories', 1),
('Measuring Tools', 'Rulers, calipers, multimeters', 1),
('Safety Equipment', 'Helmets, gloves, safety gear', 1);