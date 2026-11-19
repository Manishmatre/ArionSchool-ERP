# EduTest Pro Backend

Backend API for EduTest Pro - Online Learning & MCQ Testing Platform

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/edutest-pro
JWT_SECRET=your_secure_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
ENABLE_FRANCHISE_SCHEDULER=false
DISABLE_SERVER_PDF=true
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
# Optional: absolute path to a Unicode TTF used for Hindi and other non-Latin certificate text
CERTIFICATE_FONT_PATH=/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf
```

For production certificate rendering, install a Devanagari-capable TTF on the server (Ubuntu/Debian: `sudo apt-get install fonts-noto-core`) or set `CERTIFICATE_FONT_PATH` to an installed TTF. Without this font, `node-canvas` may render Hindi characters as square placeholder glyphs.

> All uploads (photos, documents, course materials, gallery, certificates, etc.) are stored in **Cloudinary**. Set the three `CLOUDINARY_*` variables before starting the server.

> For low-resource VPS deployments, set `ENABLE_FRANCHISE_SCHEDULER=false` and `DISABLE_SERVER_PDF=true` to avoid costly scheduled and PDF generation work on the server.

4. Start the server:

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Database Setup

Make sure MongoDB is running locally or use MongoDB Atlas:

**Local MongoDB:**

```bash
mongod
```

**MongoDB Atlas:**
Update `MONGODB_URI` in `.env` with your Atlas connection string.

## Financial Ledger Migration

After deploying the unified transaction system, migrate legacy payment/payroll data:

```bash
# Preview what will be migrated (no database writes)
npm run migrate-transactions:dry-run

# Full migration: Payments, StaffSalary, AdvancePayment → Transaction ledger
npm run migrate-transactions

# Only fee policies from courses
npm run migrate-transactions:fee-policies

# Only student fee obligations
npm run migrate-transactions:obligations
```

**What gets migrated:**
- All `Payment` records → `Transaction` (inflow)
- Paid `StaffSalary` → `Transaction` (outflow: staff_salary)
- Paid `AdvancePayment` → `Transaction` (outflow: staff_advance)
- Course fees → `FeePolicy`
- Student enrollments → `FeeObligation`

Legacy `Payment` records are **kept** for backward compatibility. New payments auto-sync to the ledger.

**New API endpoints:**
- `GET /api/transactions` — unified ledger
- `GET /api/transactions/stats` — income, expenses, net revenue
- `GET /api/fee-policies` — fee configuration
- `GET /api/fee-obligations` — outstanding receivables


Use Postman or any API client to test endpoints:

Base URL: `http://localhost:5000/api`

### Sample Requests

**Register User:**

```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "9876543210",
  "password": "password123",
  "role": "student"
}
```

**Login:**

```json
POST /api/auth/login
{
  "identifier": "john@example.com",
  "password": "password123"
}
```

**Create Chapter (Admin):**

```json
POST /api/chapters
Headers: { "Authorization": "Bearer <token>" }
{
  "title": "Introduction to Programming",
  "description": "Learn the basics of programming",
  "order": 1
}
```

## VPS / Production checklist (prevent 100% CPU)

### 1. Backend `.env` on VPS
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=long_random_secret
ENABLE_FRANCHISE_SCHEDULER=false
DISABLE_SERVER_PDF=true
FRONTEND_URL=https://myapp.seseducare.com
```

### 2. Start with PM2 (single instance only)
```bash
cd backend
mkdir -p logs
npm install
npm run start:pm2
pm2 save
pm2 startup
```

### 3. Frontend production build
```bash
cd frontend
cp .env.example .env.production
# Edit VITE_API_URL=https://your-api-domain.com
npm install
npm run build
```

### 4. Run migration ONCE (not on boot)
```bash
npm run migrate-transactions:dry-run
npm run migrate-transactions
```

### 5. Fix 413 “Request Entity Too Large” (templates / uploads)

Certificate template saves send the background image as JSON. **Nginx defaults to 1MB** and blocks the request before Node sees it.

**On the VPS**, edit your nginx site config (e.g. `/etc/nginx/sites-available/myapp.seseducare.com`):

```nginx
server {
    client_max_body_size 50M;

    location /api {
        client_max_body_size 50M;
        proxy_pass http://127.0.0.1:5000;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Backend `.env`** (optional, default is 50MB):

```env
MAX_UPLOAD_MB=50
```

Then `pm2 restart lms-api`. See `deploy/nginx-upload-limits.conf.snippet`.

### Protections built into this codebase

| Issue | Fix |
|-------|-----|
| Socket infinite reconnect loop | `SocketContext.jsx` — fixed dependency array |
| PM2 crash-restart CPU storm | `server.js` — no `process.exit` on unhandled errors |
| html-pdf / PhantomJS CPU spike | Auto-disabled in production (`productionSafety.js`) |
| Cron scheduler on by default | Now opt-in: `ENABLE_FRANCHISE_SCHEDULER=true` only |
| MongoDB reconnect storm | Retry with 5s delay before exit |
| Socket connection flood | Rate limit 30/min per IP |
| Multiple PM2 instances | `ecosystem.config.js` forces `instances: 1` |

### If CPU spikes again
```bash
pm2 logs lms-api --lines 100
pm2 monit
```

Look for: repeated restarts, `Socket connected` spam, MongoDB errors, PDF generation logs.

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Dependencies

- express - Web framework
- mongoose - MongoDB ODM
- bcryptjs - Password hashing
- jsonwebtoken - JWT authentication
- dotenv - Environment variables
- cors - CORS middleware
- express-validator - Input validation
- multer - File upload handling
