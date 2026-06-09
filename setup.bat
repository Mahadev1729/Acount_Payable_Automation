@echo off
echo ============================================================
echo   AP Automation System - Setup Script
echo ============================================================

echo.
echo [1/4] Creating Python virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate

echo.
echo [2/4] Installing Python packages...
pip install -r requirements.txt

echo.
echo [3/4] Running database migrations...
python manage.py makemigrations authentication vendors invoices purchase_orders approvals payments reports
python manage.py migrate

echo.
echo [4/4] Creating superuser (admin@apautomation.com / Admin@123)...
python manage.py shell -c "from apps.authentication.models import User; User.objects.filter(email='admin@apautomation.com').exists() or User.objects.create_superuser('admin@apautomation.com', 'Admin@123', first_name='Admin', last_name='User', role='admin')"

echo.
echo ============================================================
echo   Setup Complete! 
echo   Run: start_backend.bat and start_frontend.bat
echo ============================================================
pause
