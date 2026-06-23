# Account_Payable_Automation

Enterprise-grade Accounts Payable Automation with OCR, Workflow & Reporting.

## Tech Stack

* Backend: Django 4.2 + DRF + SimpleJWT + PostgreSQL
* Frontend: React 18 + Vite + Recharts
* OCR: Tesseract + OpenCV + pdf2image
* Reports: ReportLab (PDF) + openpyxl (Excel)

## Prerequisites

* Python 3.10+
* Node.js 18+
* PostgreSQL

  * Database: apautomation
  * User: postgres
  * Password: password
* Tesseract OCR

## Database Creation

```sql
CREATE DATABASE apautomation;
```

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations authentication vendors invoices purchase_orders approvals payments reports
python manage.py migrate
python manage.py createsuperuser
```

## Start Backend

```bash
python manage.py runserver
```

Backend: http://localhost:8000

Admin Panel: http://localhost:8000/admin

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Default Login

* Email: [admin@apautomation.com](mailto:admin@apautomation.com)
* Password: Admin@123

## Project Structure

```text
APautomation/
├── backend/
│   ├── apautomation/
│   ├── apps/
│   │   ├── authentication/
│   │   ├── vendors/
│   │   ├── invoices/
│   │   ├── purchase_orders/
│   │   ├── approvals/
│   │   ├── payments/
│   │   └── reports/
│   ├── media/uploads/
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       └── pages/
│
├── setup.bat
├── start_backend.bat
└── start_frontend.bat
```

## API Endpoints

| Method | Endpoint                         |
| ------ | -------------------------------- |
| POST   | /api/auth/login/                 |
| GET    | /api/invoices/                   |
| POST   | /api/invoices/                   |
| POST   | /api/invoices/{id}/run-ocr/      |
| POST   | /api/purchase-orders/{id}/match/ |
| POST   | /api/approvals/{id}/action/      |
| GET    | /api/payments/{id}/advice/       |
| GET    | /api/reports/aging/?export=pdf   |
