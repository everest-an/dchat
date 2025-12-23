"""
User Profile Extended Models

Provides additional profile information for users:
- Projects: Current projects with status and progress
- Skills: User skills and expertise
- Resources: Available resources to offer
- Seeking: Opportunities user is seeking

@author Manus AI
@date 2025-11-05
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Index

db = SQLAlchemy()


class UserProject(db.Model):
    """User Project Model"""
    __tablename__ = 'user_projects'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Project details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='In Progress')  # In Progress, Completed, On Hold
    progress = db.Column(db.Integer, default=0)  # 0-100
    
    # Dates
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)
    deadline = db.Column(db.DateTime, nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('projects', lazy='dynamic'))
    
    # Indexes
    __table_args__ = (
        Index('idx_user_project_user', 'user_id'),
        Index('idx_user_project_status', 'status'),
    )
    
    def __repr__(self):
        return f'<UserProject {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'progress': self.progress,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class UserSkill(db.Model):
    """User Skill Model"""
    __tablename__ = 'user_skills'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Skill details
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=True)  # Technical, Business, Design, etc.
    level = db.Column(db.String(20), default='Intermediate')  # Beginner, Intermediate, Advanced, Expert
    years_of_experience = db.Column(db.Integer, nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('skills', lazy='dynamic'))
    
    # Indexes
    __table_args__ = (
        Index('idx_user_skill_user', 'user_id'),
        Index('idx_user_skill_category', 'category'),
    )
    
    def __repr__(self):
        return f'<UserSkill {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'category': self.category,
            'level': self.level,
            'years_of_experience': self.years_of_experience,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class UserResource(db.Model):
    """User Available Resource Model"""
    __tablename__ = 'user_resources'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Resource details
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    resource_type = db.Column(db.String(50), nullable=True)  # Team, Service, Product, etc.
    availability = db.Column(db.String(50), default='Available')  # Available, Limited, Not Available
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('resources', lazy='dynamic'))
    
    # Indexes
    __table_args__ = (
        Index('idx_user_resource_user', 'user_id'),
        Index('idx_user_resource_type', 'resource_type'),
    )
    
    def __repr__(self):
        return f'<UserResource {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'resource_type': self.resource_type,
            'availability': self.availability,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class UserSeeking(db.Model):
    """User Seeking Opportunities Model"""
    __tablename__ = 'user_seeking'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Seeking details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=True)  # Partnership, Investment, Talent, etc.
    priority = db.Column(db.String(20), default='Medium')  # Low, Medium, High, Urgent
    is_active = db.Column(db.Boolean, default=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('seeking', lazy='dynamic'))
    
    # Indexes
    __table_args__ = (
        Index('idx_user_seeking_user', 'user_id'),
        Index('idx_user_seeking_category', 'category'),
        Index('idx_user_seeking_active', 'is_active'),
    )
    
    def __repr__(self):
        return f'<UserSeeking {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
