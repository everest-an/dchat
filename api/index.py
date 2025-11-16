"""
Vercel Serverless Function Entry Point

This module serves as the entry point for Vercel deployments.
It imports the Flask application from src.main and exposes it as 'app'
for Vercel's WSGI adapter to handle requests.

Author: Manus AI
Date: 2024-11-16
"""

import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import Flask application from src.main
from src.main import app

# Vercel will use this 'app' variable as the WSGI application
# No need to call app.run() - Vercel's WSGI adapter handles that

# Health check endpoint (if not already defined in src.main)
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return {
        'status': 'ok',
        'service': 'dchat-backend',
        'environment': os.getenv('VERCEL_ENV', 'unknown'),
        'version': '1.0.0'
    }, 200

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return {
        'message': 'Dchat Backend API',
        'version': '1.0.0',
        'status': 'running',
        'docs': '/api/docs'
    }, 200

# Ensure app is properly configured for Vercel
if __name__ != '__main__':
    # Running in Vercel environment
    print("🚀 Dchat Backend running on Vercel")
