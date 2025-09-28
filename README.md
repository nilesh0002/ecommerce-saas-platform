# 🚀 Multi-Tenant E-commerce SaaS Platform

**A complete, scalable e-commerce SaaS solution for small businesses**

## 🌟 Features

### 🏪 Multi-Tenant Architecture
- **Subdomain-based isolation**: `store1.yourplatform.com`, `store2.yourplatform.com`
- **Complete data separation** by merchant
- **Super Admin** can manage all merchants
- **Merchant Admin** can only manage their store

### 🛡️ Security & Authentication
- JWT-based authentication with role-based access
- bcrypt password hashing (10 salt rounds)
- Protected routes and API endpoints
- File upload security (image validation, size limits)
- CORS protection

### 📦 Product Management
- Full CRUD operations for products
- Image upload to Cloudflare R2 (zero egress fees)
- Stock management with low stock alerts
- Category organization
- Automatic out-of-stock detection

### 🛍️ Order Management
- Order status tracking (pending/shipped/delivered)
- Customer information display
- Status filtering and bulk updates
- Order history per customer

### 👥 User Management
- Customer account management
- Block/unblock functionality
- Order history viewing
- Registration tracking

### 📊 Analytics Dashboard
- Real-time metrics (sales, orders, users, stock)
- Visual charts and statistics
- Low stock alerts with email notifications
- Performance indicators

### 📧 Email Notifications
- Automated out-of-stock alerts
- Daily low stock summaries
- Order status updates
- Professional HTML templates

## 🛠️ Tech Stack

**Frontend:**
- React 18 with Hooks
- Tailwind CSS for styling
- Axios for API calls
- React Router for navigation
- JWT decode for authentication

**Backend:**
- Node.js with Express
- PostgreSQL (Supabase)
- JWT for authentication
- Multer for file uploads
- Nodemailer for emails
- node-cron for scheduled tasks

**Storage & Services:**
- Cloudflare R2 for image storage
- Gmail SMTP for email delivery
- Supabase for PostgreSQL hosting

**Deployment:**
- Vercel (Frontend)
- Render (Backend)
- GitHub auto-deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL database (Supabase recommended)
- Cloudflare R2 account
- Gmail account with App Password

### 1. Clone & Install
```bash
git clone <your-repo>
cd ecommerce-saas-platform
npm run install-all
```

### 2. Environment Setup

**Backend (.env):**
```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=ecommerce-images
R2_PUBLIC_URL=https://your-custom-domain.com

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
ADMIN_EMAIL=admin@yourplatform.com
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:5000
```

### 3. Database Setup
```bash
# Run SQL files in order:
# 1. database/schema.sql
# 2. database/products-schema.sql
# 3. database/orders-schema.sql
# 4. database/users-schema.sql
# 5. database/multi-tenant-schema.sql

# Generate admin password hash
node database/generate-hash.js
```

### 4. Start Development
```bash
npm run dev  # Starts both frontend and backend
```

## 🌐 Multi-Tenant Access

- **Super Admin:** `admin.yourplatform.com/admin/login`
- **Store 1:** `store1.yourplatform.com/admin/login`
- **Store 2:** `store2.yourplatform.com/admin/login`

## 🔑 Default Accounts

**Super Admin:**
- Email: `superadmin@platform.com`
- Password: `admin123`
- Access: All merchants and platform management

**Merchant Admin:**
- Email: `admin@store1.com`
- Password: `admin123`
- Access: Store 1 data only

⚠️ **Change default passwords in production!**

## 📡 API Endpoints

### Authentication
- `POST /admin/login` - Admin login

### Products
- `GET /admin/products` - List products
- `POST /admin/products` - Create product
- `PUT /admin/products/:id` - Update product
- `DELETE /admin/products/:id` - Delete product
- `GET /admin/products/low-stock` - Low stock products

### Orders
- `GET /admin/orders` - List orders
- `PUT /admin/orders/:id` - Update order status

### Users
- `GET /admin/users` - List users
- `PUT /admin/users/:id/toggle-active` - Toggle user status
- `GET /admin/users/:id/orders` - User order history

### Dashboard
- `GET /admin/dashboard/stats` - Dashboard statistics

### Merchants (Super Admin only)
- `GET /admin/merchants` - List merchants
- `POST /admin/merchants` - Create merchant
- `PUT /admin/merchants/:id/toggle-active` - Toggle merchant status

## 🚀 Deployment

### Frontend (Vercel)
1. Connect GitHub repository
2. Set root directory to `/frontend`
3. Add environment variable: `REACT_APP_API_URL`
4. Deploy

### Backend (Render)
1. Connect GitHub repository
2. Set root directory to `/backend`
3. Add all environment variables
4. Deploy

### Database (Supabase)
1. Create new project
2. Run SQL migration files
3. Copy connection string to `DATABASE_URL`

### Storage (Cloudflare R2)
1. Create R2 bucket
2. Generate API credentials
3. Set up custom domain for public access

## 💰 Business Model

This platform is designed to be sold as a SaaS solution to small businesses:

- **Monthly subscriptions** per merchant
- **Transaction fees** on orders
- **Premium features** (advanced analytics, custom domains)
- **Setup services** for new merchants

## 🔒 Security Features

- **Data Isolation:** Complete tenant separation
- **Role-Based Access:** Super admin vs merchant admin
- **Input Validation:** Server-side validation
- **File Upload Security:** Type and size validation
- **CORS Protection:** Domain whitelisting
- **JWT Security:** Token expiration and validation

## 📈 Scalability

- **Multi-tenant architecture** supports unlimited merchants
- **Database indexing** for performance
- **CDN integration** for global content delivery
- **Horizontal scaling** ready
- **Caching strategies** implemented

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - Perfect for commercial use

## 🆘 Support

For setup help and customization:
- Check the `/docs` folder for detailed guides
- Create GitHub issues for bugs
- Contact for enterprise support

---

**Built for entrepreneurs who want to dominate the e-commerce SaaS market** 🚀