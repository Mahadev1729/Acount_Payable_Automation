"""
WSGI config for AP Automation System
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'apautomation.settings')
application = get_wsgi_application()
