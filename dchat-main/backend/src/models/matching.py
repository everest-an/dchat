"""
Opportunity Matching Data Models
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class MatchingRequest(Base):
    """
    Matching request model
    Stores seeker's requirements for finding providers
    """
    __tablename__ = 'matching_requests'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    seeker_address = Column(String(42), nullable=False, index=True)
    
    # Request details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    
    # Requirements (stored as JSON)
    required_skills = Column(JSON, nullable=False)  # [{'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}]
    budget_min = Column(Float)
    budget_max = Column(Float)
    hours_per_week = Column(Integer)
    duration_weeks = Column(Integer)
    start_date = Column(DateTime)
    
    # Status
    status = Column(String(50), default='active')  # active, completed, cancelled
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)
    
    # Relationships
    results = relationship('MatchingResult', back_populates='request', cascade='all, delete-orphan')
    feedback = relationship('MatchingFeedback', back_populates='request', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'seeker_address': self.seeker_address,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'required_skills': self.required_skills,
            'budget': {
                'min': self.budget_min,
                'max': self.budget_max
            } if self.budget_min or self.budget_max else None,
            'hours_per_week': self.hours_per_week,
            'duration_weeks': self.duration_weeks,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }


class MatchingResult(Base):
    """
    Matching result model
    Stores the results of matching algorithm for each provider
    """
    __tablename__ = 'matching_results'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey('matching_requests.id'), nullable=False, index=True)
    provider_address = Column(String(42), nullable=False, index=True)
    
    # Scores
    total_score = Column(Float, nullable=False)
    skill_score = Column(Float)
    availability_score = Column(Float)
    reputation_score = Column(Float)
    price_score = Column(Float)
    network_score = Column(Float)
    responsiveness_score = Column(Float)
    
    # Match details
    match_quality = Column(String(50))  # Excellent, Great, Good, Fair, Low
    matched_skills = Column(JSON)  # Details of matched skills
    recommendations = Column(JSON)  # List of recommendations
    
    # User interaction
    viewed = Column(Boolean, default=False)
    contacted = Column(Boolean, default=False)
    viewed_at = Column(DateTime)
    contacted_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    request = relationship('MatchingRequest', back_populates='results')
    feedback = relationship('MatchingFeedback', back_populates='result')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'request_id': self.request_id,
            'provider_address': self.provider_address,
            'total_score': self.total_score,
            'dimension_scores': {
                'skill_match': self.skill_score,
                'availability': self.availability_score,
                'reputation': self.reputation_score,
                'price': self.price_score,
                'network': self.network_score,
                'responsiveness': self.responsiveness_score
            },
            'match_quality': self.match_quality,
            'matched_skills': self.matched_skills,
            'recommendations': self.recommendations,
            'viewed': self.viewed,
            'contacted': self.contacted,
            'viewed_at': self.viewed_at.isoformat() if self.viewed_at else None,
            'contacted_at': self.contacted_at.isoformat() if self.contacted_at else None,
            'created_at': self.created_at.isoformat()
        }


class MatchingFeedback(Base):
    """
    Matching feedback model
    Stores user feedback on match quality for algorithm improvement
    """
    __tablename__ = 'matching_feedback'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey('matching_requests.id'), nullable=False, index=True)
    result_id = Column(Integer, ForeignKey('matching_results.id'), index=True)
    user_address = Column(String(42), nullable=False, index=True)
    
    # Feedback
    rating = Column(Integer, nullable=False)  # 1-5 stars
    is_successful = Column(Boolean)  # Did they work together?
    feedback_text = Column(Text)
    
    # Detailed ratings
    skill_match_rating = Column(Integer)  # 1-5
    communication_rating = Column(Integer)  # 1-5
    professionalism_rating = Column(Integer)  # 1-5
    value_rating = Column(Integer)  # 1-5
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    request = relationship('MatchingRequest', back_populates='feedback')
    result = relationship('MatchingResult', back_populates='feedback')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'request_id': self.request_id,
            'result_id': self.result_id,
            'user_address': self.user_address,
            'rating': self.rating,
            'is_successful': self.is_successful,
            'feedback_text': self.feedback_text,
            'detailed_ratings': {
                'skill_match': self.skill_match_rating,
                'communication': self.communication_rating,
                'professionalism': self.professionalism_rating,
                'value': self.value_rating
            },
            'created_at': self.created_at.isoformat()
        }


class SkillRelation(Base):
    """
    Skill relationship model
    Stores relationships and similarity scores between skills
    """
    __tablename__ = 'skill_relations'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_1 = Column(String(100), nullable=False, index=True)
    skill_2 = Column(String(100), nullable=False, index=True)
    similarity_score = Column(Float, nullable=False)  # 0.0 - 1.0
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Source of relationship (manual, ml_generated, user_feedback)
    source = Column(String(50), default='manual')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'skill_1': self.skill_1,
            'skill_2': self.skill_2,
            'similarity_score': self.similarity_score,
            'source': self.source,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
