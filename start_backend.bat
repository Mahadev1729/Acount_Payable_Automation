@echo off
echo Starting Django Backend on http://localhost:8000
cd backend
call venv\Scripts\activate
python manage.py runserver
