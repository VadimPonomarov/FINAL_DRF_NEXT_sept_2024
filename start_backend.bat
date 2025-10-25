@echo off
chcp 65001 >nul
cd backend
set PYTHONIOENCODING=utf-8
python manage.py runserver 8000

