"""
Machine Learning Integration - Matching Engine

Implements:
- User matching based on interests and profiles
- Call quality prediction
- Recommendation system
- Fraud detection

Author: Manus AI
Date: 2024-11-16
"""

from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime
import logging
import numpy as np
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)


@dataclass
class UserProfile:
    """User profile for matching"""
    user_id: int
    name: str
    interests: List[str]
    skills: List[str]
    languages: List[str]
    timezone: str
    availability: Dict[str, bool]
    rating: float
    match_history: List[int]


@dataclass
class MatchScore:
    """Match score result"""
    user_id: int
    score: float
    reasons: List[str]
    compatibility: Dict[str, float]


class InterestMatcher:
    """Match users based on interests"""
    
    @staticmethod
    def calculate_interest_similarity(
        interests_a: List[str],
        interests_b: List[str]
    ) -> float:
        """Calculate similarity between interest lists"""
        if not interests_a or not interests_b:
            return 0.0
        
        # Convert to sets
        set_a = set(interests_a)
        set_b = set(interests_b)
        
        # Jaccard similarity
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        
        return intersection / union if union > 0 else 0.0
    
    @staticmethod
    def calculate_skill_compatibility(
        skills_a: List[str],
        skills_b: List[str]
    ) -> float:
        """Calculate skill compatibility"""
        if not skills_a or not skills_b:
            return 0.0
        
        set_a = set(skills_a)
        set_b = set(skills_b)
        
        # Skills can complement each other
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        
        return intersection / union if union > 0 else 0.0
    
    @staticmethod
    def calculate_language_compatibility(
        languages_a: List[str],
        languages_b: List[str]
    ) -> float:
        """Calculate language compatibility"""
        if not languages_a or not languages_b:
            return 0.0
        
        set_a = set(languages_a)
        set_b = set(languages_b)
        
        # Must have at least one common language
        intersection = len(set_a & set_b)
        
        return 1.0 if intersection > 0 else 0.0


class AvailabilityMatcher:
    """Match users based on availability"""
    
    @staticmethod
    def calculate_availability_overlap(
        availability_a: Dict[str, bool],
        availability_b: Dict[str, bool]
    ) -> float:
        """Calculate availability overlap"""
        if not availability_a or not availability_b:
            return 0.5
        
        # Count overlapping available times
        overlap = 0
        total = 0
        
        for day in availability_a:
            if day in availability_b:
                total += 1
                if availability_a[day] and availability_b[day]:
                    overlap += 1
        
        return overlap / total if total > 0 else 0.5
    
    @staticmethod
    def check_timezone_compatibility(
        timezone_a: str,
        timezone_b: str
    ) -> float:
        """Check timezone compatibility"""
        # Simple implementation: same timezone is better
        if timezone_a == timezone_b:
            return 1.0
        
        # Parse timezone offsets (simplified)
        try:
            offset_a = int(timezone_a.split(':')[0])
            offset_b = int(timezone_b.split(':')[0])
            
            # Calculate difference
            diff = abs(offset_a - offset_b)
            
            # Penalize large differences
            if diff <= 2:
                return 1.0
            elif diff <= 6:
                return 0.7
            elif diff <= 12:
                return 0.4
            else:
                return 0.1
        except:
            return 0.5


class ReputationMatcher:
    """Match users based on reputation"""
    
    @staticmethod
    def calculate_rating_compatibility(
        rating_a: float,
        rating_b: float,
        threshold: float = 3.0
    ) -> float:
        """Calculate rating compatibility"""
        # Both should have minimum rating
        if rating_a < threshold or rating_b < threshold:
            return 0.5
        
        # Similar ratings are better
        diff = abs(rating_a - rating_b)
        
        if diff <= 0.5:
            return 1.0
        elif diff <= 1.0:
            return 0.8
        elif diff <= 2.0:
            return 0.6
        else:
            return 0.3
    
    @staticmethod
    def calculate_match_history_penalty(
        user_a_id: int,
        user_b_id: int,
        match_history_a: List[int],
        match_history_b: List[int]
    ) -> float:
        """Calculate penalty for previous matches"""
        # If they've matched before, reduce score
        if user_a_id in match_history_b or user_b_id in match_history_a:
            return 0.5  # 50% penalty
        
        return 1.0


class MatchingEngine:
    """Main matching engine"""
    
    def __init__(self):
        self.interest_matcher = InterestMatcher()
        self.availability_matcher = AvailabilityMatcher()
        self.reputation_matcher = ReputationMatcher()
    
    def calculate_match_score(
        self,
        user_a: UserProfile,
        user_b: UserProfile,
        weights: Optional[Dict[str, float]] = None
    ) -> MatchScore:
        """Calculate match score between two users"""
        
        # Default weights
        if weights is None:
            weights = {
                'interest': 0.25,
                'skill': 0.15,
                'language': 0.15,
                'availability': 0.15,
                'timezone': 0.10,
                'rating': 0.15,
                'history': 0.05
            }
        
        # Calculate component scores
        interest_score = self.interest_matcher.calculate_interest_similarity(
            user_a.interests, user_b.interests
        )
        
        skill_score = self.interest_matcher.calculate_skill_compatibility(
            user_a.skills, user_b.skills
        )
        
        language_score = self.interest_matcher.calculate_language_compatibility(
            user_a.languages, user_b.languages
        )
        
        availability_score = self.availability_matcher.calculate_availability_overlap(
            user_a.availability, user_b.availability
        )
        
        timezone_score = self.availability_matcher.check_timezone_compatibility(
            user_a.timezone, user_b.timezone
        )
        
        rating_score = self.reputation_matcher.calculate_rating_compatibility(
            user_a.rating, user_b.rating
        )
        
        history_penalty = self.reputation_matcher.calculate_match_history_penalty(
            user_a.user_id, user_b.user_id,
            user_a.match_history, user_b.match_history
        )
        
        # Calculate weighted score
        total_score = (
            interest_score * weights['interest'] +
            skill_score * weights['skill'] +
            language_score * weights['language'] +
            availability_score * weights['availability'] +
            timezone_score * weights['timezone'] +
            rating_score * weights['rating']
        ) * history_penalty
        
        # Generate reasons
        reasons = []
        if interest_score > 0.7:
            reasons.append("Strong interest alignment")
        if skill_score > 0.7:
            reasons.append("Complementary skills")
        if language_score > 0.9:
            reasons.append("Common language")
        if availability_score > 0.7:
            reasons.append("Good availability overlap")
        if timezone_score > 0.7:
            reasons.append("Compatible timezone")
        if rating_score > 0.7:
            reasons.append("Similar reputation")
        
        return MatchScore(
            user_id=user_b.user_id,
            score=total_score,
            reasons=reasons,
            compatibility={
                'interest': interest_score,
                'skill': skill_score,
                'language': language_score,
                'availability': availability_score,
                'timezone': timezone_score,
                'rating': rating_score
            }
        )
    
    def find_best_matches(
        self,
        user: UserProfile,
        candidates: List[UserProfile],
        top_k: int = 5
    ) -> List[MatchScore]:
        """Find best matches for a user"""
        
        scores = []
        for candidate in candidates:
            if candidate.user_id == user.user_id:
                continue
            
            score = self.calculate_match_score(user, candidate)
            scores.append(score)
        
        # Sort by score descending
        scores.sort(key=lambda x: x.score, reverse=True)
        
        return scores[:top_k]


class CallQualityPredictor:
    """Predict call quality based on metrics"""
    
    @staticmethod
    def predict_quality_level(
        rtt_ms: float,
        jitter_ms: float,
        packet_loss_percent: float,
        bandwidth_kbps: float
    ) -> str:
        """Predict call quality level"""
        
        # Calculate quality score
        # RTT: 0-150ms is good, 150-300ms is fair, >300ms is poor
        rtt_score = max(0, 1 - (rtt_ms / 300))
        
        # Jitter: 0-30ms is good, 30-100ms is fair, >100ms is poor
        jitter_score = max(0, 1 - (jitter_ms / 100))
        
        # Packet loss: 0-1% is good, 1-5% is fair, >5% is poor
        loss_score = max(0, 1 - (packet_loss_percent / 5))
        
        # Bandwidth: >100kbps is good
        bandwidth_score = min(1, bandwidth_kbps / 100)
        
        # Weighted average
        quality_score = (
            rtt_score * 0.3 +
            jitter_score * 0.3 +
            loss_score * 0.2 +
            bandwidth_score * 0.2
        )
        
        # Determine quality level
        if quality_score > 0.8:
            return 'excellent'
        elif quality_score > 0.6:
            return 'good'
        elif quality_score > 0.4:
            return 'fair'
        else:
            return 'poor'
    
    @staticmethod
    def predict_quality_improvement(
        current_metrics: Dict[str, float],
        optimization_actions: List[str]
    ) -> Dict[str, Any]:
        """Predict quality improvement from optimization actions"""
        
        improvements = {}
        
        if 'reduce_bitrate' in optimization_actions:
            improvements['packet_loss'] = -20  # Reduce by 20%
        
        if 'increase_buffer' in optimization_actions:
            improvements['jitter'] = -30  # Reduce by 30%
        
        if 'switch_codec' in optimization_actions:
            improvements['bandwidth'] = -15  # Reduce bandwidth by 15%
        
        if 'optimize_network' in optimization_actions:
            improvements['rtt'] = -25  # Reduce by 25%
        
        return improvements


class FraudDetector:
    """Detect fraudulent activities"""
    
    @staticmethod
    def detect_suspicious_pattern(
        user_id: int,
        action: str,
        amount: int,
        timestamp: datetime,
        user_history: List[Dict[str, Any]]
    ) -> Tuple[bool, float, str]:
        """Detect suspicious patterns"""
        
        risk_score = 0.0
        reasons = []
        
        # Check for rapid transactions
        recent_transactions = [
            h for h in user_history
            if (datetime.fromisoformat(h['timestamp']) - timestamp).total_seconds() < 300
        ]
        
        if len(recent_transactions) > 5:
            risk_score += 0.3
            reasons.append("Rapid transactions detected")
        
        # Check for unusual amounts
        if user_history:
            avg_amount = sum(h['amount'] for h in user_history) / len(user_history)
            if amount > avg_amount * 3:
                risk_score += 0.2
                reasons.append("Unusual transaction amount")
        
        # Check for unusual time
        hour = timestamp.hour
        if hour < 6 or hour > 23:
            risk_score += 0.1
            reasons.append("Unusual transaction time")
        
        is_suspicious = risk_score > 0.5
        
        return is_suspicious, risk_score, "; ".join(reasons)


# Global matching engine instance
matching_engine = MatchingEngine()
fraud_detector = FraudDetector()
quality_predictor = CallQualityPredictor()
