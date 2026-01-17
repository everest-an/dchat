"""
Database Migration Script - Add Profile Tables

Adds new tables for user profile extensions:
- user_projects
- user_skills
- user_resources
- user_seeking
- custodial_wallets
- custodial_transactions

Run this script to update the database schema.

Usage:
    python3 backend/migrations/add_profile_tables.py
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.user import db
from src.models.user_profile import UserProject, UserSkill, UserResource, UserSeeking
from src.models.custodial_wallet import CustodialWallet, CustodialTransaction
from src.main import app

def run_migration():
    """Run database migration"""
    print("🔄 Running database migration...")
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            # Verify tables
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            expected_tables = [
                'user_projects',
                'user_skills',
                'user_resources',
                'user_seeking',
                'custodial_wallets',
                'custodial_transactions'
            ]
            
            for table in expected_tables:
                if table in tables:
                    print(f"   ✓ {table}")
                else:
                    print(f"   ✗ {table} - NOT FOUND")
            
            print("\n✅ Migration completed successfully")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            sys.exit(1)

if __name__ == '__main__':
    run_migration()
