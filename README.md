# EdTech Platform

> A fully functional EdTech platform enabling users to create, consume, and rate educational content. Built with React, Node.js/Express, and Supabase.

---

## 📁 Project Structure

```
Ed tech platform/
│
├── frontend/                 # React frontend (Create React App + Tailwind CSS)
│   ├── public/               # Static HTML, robots.txt
│   ├── src/                  # React source code
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── services/         # API service calls
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # React Context providers
│   │   ├── slices/           # Redux Toolkit slices
│   │   ├── utils/            # Utility functions
│   │   ├── data/             # Mock/static data
│   │   └── config/           # Supabase client config
│   ├── images/               # Project images/screenshots
│   ├── tailwind.config.js    # Tailwind CSS config
│   ├── postcss.config.js     # PostCSS config
│   ├── package.json          # Frontend dependencies
│   ├── .env                  # Frontend env vars (gitignored)
│   └── .env.example          # Frontend env template
│
├── backend/                  # Node.js/Express backend
│   ├── config/               # Supabase, Cloudinary config
│   ├── controllers/          # Route controllers
│   ├── middleware/           # Auth & other middleware
│   ├── routes/               # Express route definitions
│   ├── utils/                # Email, file upload utilities
│   ├── index.js              # Server entry point
│   ├── package.json          # Backend dependencies
│   ├── .env                  # Backend env vars (gitignored)
│   └── .env.example          # Backend env template
│
├── docs/                     # Documentation
│   ├── supabase_schema.sql   # Database schema
│   ├── INTEGRATION_GUIDE.md  # Integration guide
│   └── dashboard-features.md # Dashboard feature docs
│
├── package.json              # Root orchestrator (concurrently)
├── .gitignore                # Root gitignore
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "Ed tech platform"
```

### 2. Configure Environment Variables

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
# Fill in your Supabase URL and anon key
```

**Backend:**
```bash
cp backend/.env.example backend/.env
# Fill in Supabase, Cloudinary, JWT, and email credentials
```

### 3. Install Dependencies

```bash
# Install all (frontend + backend)
cd frontend && npm install
cd ../backend && npm install
cd ..

# OR install root orchestrator only
npm install
```

### 4. Run the Application

#### Run both simultaneously (recommended):
```bash
npm run dev
```

#### Run separately:
```bash
# Frontend only (http://localhost:3000)
npm run frontend

# Backend only (http://localhost:4000)
npm run backend
```

---

## 🛠️ Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, Redux Toolkit, React Router v6        |
| Styling   | Tailwind CSS 3, Framer Motion                   |
| Backend   | Node.js, Express.js                             |
| Database  | Supabase (PostgreSQL)                           |
| Auth      | JWT, Supabase Auth                              |
| Media     | Cloudinary                                      |
| Payments  | Razorpay                                        |
| Email     | Nodemailer (SMTP)                               |

---

## 📡 API Endpoints

The backend runs on `http://localhost:4000` and exposes:

| Route                  | Description           |
|------------------------|-----------------------|
| `GET /`                | Health check          |
| `/api/v1/auth`         | Auth routes           |
| `/api/v1/profile`      | Profile routes        |
| `/api/v1/course`       | Course routes         |
| `/api/v1/payment`      | Payment routes        |
| `/api/v1/admin`        | Admin routes          |

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env`)

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_USE_NODE_BACKEND=false
REACT_APP_BACKEND_URL=http://localhost:4000/api/v1
```

### Backend (`backend/.env`)

```env
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLOUD_NAME=your_cloudinary_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret
MAIL_HOST=smtp.gmail.com
MAIL_USER=your@email.com
MAIL_PASS=your_app_password
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY=your_key
RAZORPAY_SECRET=your_secret
```

---

## 📸 Screenshots

![Main Page](frontend/images/mainpage.png)

![Architecture](frontend/images/architecture.png)

![Database Schema](frontend/images/schema.png)

---

## 📄 Database

The Supabase schema is located at [`docs/supabase_schema.sql`](docs/supabase_schema.sql).