# AP Automation System

Enterprise-grade Accounts Payable Automation with OCR, Workflow & Reporting.

## Tech Stack
- **Backend**: Django 4.2 + DRF + SimpleJWT + PostgreSQL
- **Frontend**: React 18 + Vite + Recharts
- **OCR**: Tesseract + OpenCV + pdf2image
- **Reports**: ReportLab (PDF) + openpyxl (Excel)

## Prerequisites

1. **Python 3.10+** installed
2. **Node.js 18+** installed
3. **PostgreSQL** running with:
   - Database: `apautomation`
   - User: `postgres`, Password: `password`
4. **Tesseract OCR** installed at `C:\Program Files\Tesseract-OCR\tesseract.exe`
   - Download: https://github.com/UB-Mannheim/tesseract/wiki

## Quick Start

### Step 1: Create PostgreSQL Database
```sql
CREATE DATABASE apautomation;
```

### Step 2: Setup & Migrate Backend
```bash
# Run the automated setup script:
setup.bat
```
Or manually:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations authentication vendors invoices purchase_orders approvals payments reports
python manage.py migrate
python manage.py createsuperuser
```

### Step 3: Start Backend
```bash
start_backend.bat
# OR: cd backend && venv\Scripts\activate && python manage.py runserver
```
Backend runs at: http://localhost:8000
Admin panel: http://localhost:8000/admin

### Step 4: Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 5: Start Frontend
```bash
start_frontend.bat
# OR: cd frontend && npm run dev
```
Frontend runs at: http://localhost:5173

## Default Login
- **Email**: admin@apautomation.com
- **Password**: Admin@123

## Project Structure
```
APautomation/
├── backend/
│   ├── apautomation/          # Django settings, urls, wsgi
│   ├── apps/
│   │   ├── authentication/    # JWT auth, roles
│   │   ├── vendors/           # Vendor management
│   │   ├── invoices/          # Invoice + OCR engine
│   │   ├── purchase_orders/   # PO + GRN + matching
│   │   ├── approvals/         # Workflow + audit logs
│   │   ├── payments/          # Payments + PDF
│   │   └── reports/           # All reports + export
│   ├── media/uploads/         # Invoice files stored here
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── api/               # Axios API modules
│       ├── components/        # Layout + UI components
│       ├── context/           # Auth context
│       └── pages/             # 12 application pages
│
├── setup.bat                  # One-click setup
├── start_backend.bat          # Start Django
└── start_frontend.bat         # Start React
```

## API Endpoints
| Endpoint | Description |
|----------|-------------|
| POST /api/auth/login/ | JWT Login |
| GET /api/invoices/ | List invoices |
| POST /api/invoices/ | Upload invoice |
| POST /api/invoices/{id}/run-ocr/ | Run OCR |
| POST /api/purchase-orders/{id}/match/ | 2/3-way match |
| POST /api/approvals/{id}/action/ | Approve/Reject |
| GET /api/payments/{id}/advice/ | Download PDF |
| GET /api/reports/aging/?export=pdf | Export report |

## Tesseract OCR Note
Update `TESSERACT_CMD` in `backend/apautomation/settings.py` if installed at a different path.
"# Acount_Payable_Automation" 
