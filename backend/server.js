const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const adminRoutes = require('./routes/admin');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const usersRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const merchantsRoutes = require('./routes/merchants');
const storeRoutes = require('./routes/store');
const checkoutRoutes = require('./routes/checkout');
const authRoutes = require('./routes/auth');
const userOrdersRoutes = require('./routes/userOrders');
const reviewsRoutes = require('./routes/reviews');
const webhookRoutes = require('./routes/webhook');

// Import utilities
const { startStockMonitoring } = require('./utils/stockMonitor');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/admin', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://localhost:3000'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Check for subdomain pattern (multi-tenant)
    const isSubdomain = /^https?:\/\/[\w-]+\.[\w-]+\.(com|net|org|io)$/.test(origin);
    
    if (allowedOrigins.includes(origin) || isSubdomain) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/admin', adminRoutes);
app.use('/admin/products', productsRoutes);
app.use('/admin/orders', ordersRoutes);
app.use('/admin/users', usersRoutes);
app.use('/admin/dashboard', dashboardRoutes);
app.use('/admin/merchants', merchantsRoutes);

// Store Routes (Public)
app.use('/api/store', storeRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', userOrdersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/webhook', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'E-commerce SaaS Platform API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start stock monitoring cron job in production
  if (process.env.NODE_ENV !== 'test') {
    startStockMonitoring();
    console.log('📧 Stock monitoring started');
  }
});

module.exports = app;