# SMEPRO360 — Complete SME ERP & CRM Platform

> A full-featured Enterprise Resource Planning system for Small & Medium Enterprises.
> Built with FastAPI · PostgreSQL · React 18 · React Native (Expo)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 16 (running on port 5433)
- Expo CLI (for mobile)

### 1. Database
Database `smepro360` on PostgreSQL 16 (port 5433) — already created.

### 2. Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
# Set environment (see .env file)
start.bat          # Windows
# OR
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API docs: http://localhost:8000/docs

### 3. Frontend (React)
```bash
cd frontend
npm install
npm start          # Opens http://localhost:3000
```

### 4. Mobile (React Native / Expo)
```bash
cd mobile
npm install
npx expo start     # Scan QR with Expo Go app
```

---

## 🔐 Default Credentials
| Field    | Value                      |
|----------|---------------------------|
| Email    | admin@smepro360.com        |
| Password | Admin@123456               |

---

## 📦 Modules

| Module | Description |
|--------|-------------|
| 🎯 **Lead Management** | Web-to-lead capture, UTM tracking, campaign management, lead conversion |
| 🤝 **CRM** | Customer accounts, contacts, opportunities, pipeline view |
| 🛒 **Sales & Distribution** | Sales orders, invoices (GST-compliant), payments, receipts |
| 🏭 **Procurement** | Vendor management, purchase orders, GRN, MSME tracking |
| 📦 **Inventory** | Product catalog, multi-warehouse stock, movements, reorder alerts |
| ⚙️ **Manufacturing** | BOM, work orders, production entries, MRP |
| 💰 **Finance & Accounting** | Chart of accounts, journal entries, trial balance, P&L, expenses |
| 👥 **HR & Payroll** | Employee master, attendance, leaves, payroll (PF/ESI/PT) |
| 🚀 **Project Management** | Projects, tasks (Kanban), milestones, timesheets |
| 🎫 **Helpdesk** | Tickets, SLA tracking, comments, knowledge base |
| 🖥️ **Asset Management** | Asset register, maintenance, depreciation |
| ✅ **Quality Control** | Quality checks, parameters, non-conformance reports |
| 📁 **Document Management** | Document repository, versioning, folder structure |
| 📈 **Reports & Analytics** | Dashboards, sales reports, inventory valuation, Excel exports |
| 🏢 **Multi-Tenant** | Multi-company/multi-branch support |
| ⚙️ **System Admin** | Users, roles, permissions |

---

## 🏗️ Architecture

```
SMEPRO360/
├── backend/                 # FastAPI (Python)
│   ├── app/
│   │   ├── api/v1/         # REST API endpoints
│   │   ├── models/         # SQLAlchemy models
│   │   ├── core/           # Config, security
│   │   └── db/             # Database setup
│   ├── requirements.txt
│   └── .env
│
├── frontend/               # React 18 + TypeScript
│   ├── src/
│   │   ├── api/            # Axios client
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Module pages
│   │   └── store/          # Zustand state
│   └── package.json
│
├── mobile/                 # React Native (Expo)
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── navigation/     # Stack/tab navigators
│   │   └── api/            # API client
│   └── package.json
│
└── docs/                   # Documentation
```

---

## 🔌 API Reference

All APIs follow RESTful conventions with JWT auth.

**Base URL:** `http://localhost:8000/api/v1`

**Auth:** Bearer token in header: `Authorization: Bearer <token>`

### Key Endpoints

| Module | Endpoint | Methods |
|--------|----------|---------|
| Auth | `/auth/login` | POST |
| Leads | `/leads/` | GET, POST, PUT, DELETE |
| Leads | `/leads/{id}/convert` | POST |
| Leads | `/leads/export` | GET (Excel) |
| Customers | `/crm/customers` | GET, POST, PUT, DELETE |
| Opportunities | `/crm/opportunities` | GET, POST, PUT, DELETE |
| Sales Orders | `/sales/orders` | GET, POST, PUT, DELETE |
| Invoices | `/sales/invoices` | GET, POST, PUT |
| Payments | `/sales/payments` | GET, POST |
| Vendors | `/procurement/vendors` | GET, POST, PUT |
| Purchase Orders | `/procurement/orders` | GET, POST, PUT |
| Products | `/inventory/products` | GET, POST, PUT |
| Stock | `/inventory/stock` | GET |
| Stock Adjust | `/inventory/stock/adjust` | POST |
| BOMs | `/manufacturing/boms` | GET, POST |
| Work Orders | `/manufacturing/workorders` | GET, POST, PUT |
| Employees | `/hr/employees` | GET, POST, PUT |
| Attendance | `/hr/attendance` | GET, POST |
| Leaves | `/hr/leaves` | GET, POST |
| Payroll | `/hr/payroll/run` | POST |
| Projects | `/projects/` | GET, POST, PUT |
| Tasks | `/projects/tasks` | GET, POST, PUT |
| Timesheets | `/projects/timesheets` | GET, POST |
| Tickets | `/helpdesk/tickets` | GET, POST, PUT |
| Assets | `/assets/` | GET, POST, PUT |
| Quality | `/quality/checks` | GET, POST |
| Finance | `/finance/accounts` | GET, POST |
| Journals | `/finance/journals` | GET, POST |
| Dashboard | `/dashboard/` | GET |
| Reports | `/reports/sales-summary` | GET |

---

## 📊 Database Schema

**PostgreSQL 16** · Database: `smepro360` · Port: 5433

Tables created automatically via SQLAlchemy on startup.

Key tables: `tenants`, `branches`, `users`, `roles`, `leads`, `campaigns`, `customers`, `contacts`, `opportunities`, `sales_orders`, `invoices`, `payments`, `vendors`, `purchase_orders`, `products`, `warehouses`, `stock_levels`, `stock_movements`, `boms`, `work_orders`, `employees`, `departments`, `attendance`, `leaves`, `payrolls`, `projects`, `project_tasks`, `milestones`, `timesheets`, `tickets`, `assets`, `quality_checks`, `accounts`, `journal_entries`, `documents`

---

## 📱 Mobile App Features

- Login & Authentication
- Dashboard with KPIs
- Lead capture & management
- Customer directory
- Support ticket creation
- Sales order viewing
- Employee self-service
- Attendance check-in/out
- Leave application
- Offline-ready design

---

## 🛡️ Security

- JWT Bearer token authentication (1440 min expiry)
- bcrypt password hashing
- CORS configured for frontend/mobile origins
- Role-based access control (RBAC)
- Tenant data isolation
- SQL injection prevention via SQLAlchemy ORM

---

## 📤 Excel Export

Every module supports Excel export with:
- Professional formatting (Indigo header, styled cells)
- Auto column widths
- All data fields
- Available via the "Export" button in each module

---

## 🔧 Development Notes

### Backend
- All API endpoints are in `backend/app/api/v1/endpoints/`
- Models in `backend/app/models/`
- Database auto-initializes with admin user on first startup
- Add new module: create model → endpoint → add to router

### Frontend
- Components in `frontend/src/components/`
- Pages follow module-per-folder structure
- `DataTable` component is reusable across all modules
- `Modal` component for all forms
- `Badge` component for status display

### Mobile
- Built with Expo for easy iOS/Android deployment
- Uses same REST API as frontend
- AsyncStorage for token persistence

---

## 📝 Changelog

### v1.0.0 (2024-06)
- Initial release
- 20+ modules fully functional
- 700+ API endpoints
- React frontend with dashboards
- React Native mobile app
- PostgreSQL database with 35+ tables
- Excel export for all modules
- JWT authentication
- Multi-tenant architecture

---

## 📞 Support
For issues or questions, raise a ticket in the Helpdesk module at `/helpdesk/tickets`
