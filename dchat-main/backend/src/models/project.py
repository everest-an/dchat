from src.models.user import db
from datetime import datetime

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    project_type = db.Column(db.String(20), nullable=False)  # current, seeking, resource
    status = db.Column(db.String(20), default='active')  # active, completed, paused
    progress = db.Column(db.Integer, default=0)  # 0-100
    budget = db.Column(db.String(50), nullable=True)
    deadline = db.Column(db.String(50), nullable=True)
    team_size = db.Column(db.Integer, nullable=True)
    requirements = db.Column(db.Text, nullable=True)  # JSON string
    tags = db.Column(db.Text, nullable=True)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user = db.relationship('User', backref='projects')

    def __repr__(self):
        return f'<Project {self.title}>'

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'project_type': self.project_type,
            'status': self.status,
            'progress': self.progress,
            'budget': self.budget,
            'deadline': self.deadline,
            'team_size': self.team_size,
            'requirements': json.loads(self.requirements) if self.requirements else [],
            'tags': json.loads(self.tags) if self.tags else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Moment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    moment_type = db.Column(db.String(20), nullable=False)  # project_update, industry_insights, networking
    media_url = db.Column(db.String(500), nullable=True)
    likes_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 关系
    user = db.relationship('User', backref='moments')

    def __repr__(self):
        return f'<Moment {self.id} by {self.user_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content,
            'moment_type': self.moment_type,
            'media_url': self.media_url,
            'likes_count': self.likes_count,
            'comments_count': self.comments_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': self.user.to_dict() if self.user else None
        }

