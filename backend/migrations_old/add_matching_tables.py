"""
Database migration: Add matching tables
"""

from sqlalchemy import create_engine, text
import os

def run_migration():
    """Run the migration to add matching tables"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL', 'sqlite:///dchat.db')
    
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        # Create matching_requests table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS matching_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seeker_address VARCHAR(42) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                required_skills JSON NOT NULL,
                budget_min FLOAT,
                budget_max FLOAT,
                hours_per_week INTEGER,
                duration_weeks INTEGER,
                start_date DATETIME,
                status VARCHAR(50) DEFAULT 'active',
                created_at DATETIME NOT NULL,
                updated_at DATETIME,
                expires_at DATETIME
            )
        """))
        
        # Create indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_matching_requests_seeker 
            ON matching_requests(seeker_address)
        """))
        
        # Create matching_results table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS matching_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                provider_address VARCHAR(42) NOT NULL,
                total_score FLOAT NOT NULL,
                skill_score FLOAT,
                availability_score FLOAT,
                reputation_score FLOAT,
                price_score FLOAT,
                network_score FLOAT,
                responsiveness_score FLOAT,
                match_quality VARCHAR(50),
                matched_skills JSON,
                recommendations JSON,
                viewed BOOLEAN DEFAULT 0,
                contacted BOOLEAN DEFAULT 0,
                viewed_at DATETIME,
                contacted_at DATETIME,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (request_id) REFERENCES matching_requests(id)
            )
        """))
        
        # Create indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_matching_results_request 
            ON matching_results(request_id)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_matching_results_provider 
            ON matching_results(provider_address)
        """))
        
        # Create matching_feedback table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS matching_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                result_id INTEGER,
                user_address VARCHAR(42) NOT NULL,
                rating INTEGER NOT NULL,
                is_successful BOOLEAN,
                feedback_text TEXT,
                skill_match_rating INTEGER,
                communication_rating INTEGER,
                professionalism_rating INTEGER,
                value_rating INTEGER,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (request_id) REFERENCES matching_requests(id),
                FOREIGN KEY (result_id) REFERENCES matching_results(id)
            )
        """))
        
        # Create indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_matching_feedback_request 
            ON matching_feedback(request_id)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_matching_feedback_user 
            ON matching_feedback(user_address)
        """))
        
        # Create skill_relations table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS skill_relations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_1 VARCHAR(100) NOT NULL,
                skill_2 VARCHAR(100) NOT NULL,
                similarity_score FLOAT NOT NULL,
                source VARCHAR(50) DEFAULT 'manual',
                created_at DATETIME NOT NULL,
                updated_at DATETIME
            )
        """))
        
        # Create indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_skill_relations_skill1 
            ON skill_relations(skill_1)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_skill_relations_skill2 
            ON skill_relations(skill_2)
        """))
        
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print("Created tables:")
        print("  - matching_requests")
        print("  - matching_results")
        print("  - matching_feedback")
        print("  - skill_relations")

if __name__ == '__main__':
    run_migration()
