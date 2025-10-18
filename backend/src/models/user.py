from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    wallet_address = db.Column(db.String(42), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    company = db.Column(db.String(200), nullable=True)
    position = db.Column(db.String(200), nullable=True)
    linkedin_id = db.Column(db.String(100), nullable=True)
    public_key = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<User {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'wallet_address': self.wallet_address,
            'name': self.name,
            'company': self.company,
            'position': self.position,
            'linkedin_id': self.linkedin_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

