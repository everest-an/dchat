"""
Opportunity Matching Service
Enhanced multi-dimensional matching algorithm
"""

import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import math

logger = logging.getLogger(__name__)


class MatchingService:
    """
    Advanced opportunity matching service with multi-dimensional scoring
    """
    
    # Scoring weights
    WEIGHTS = {
        'skill_match': 0.40,      # 40% - Core skill matching
        'availability': 0.20,     # 20% - Time availability
        'reputation': 0.15,       # 15% - Reputation score
        'price': 0.10,            # 10% - Price matching
        'network': 0.10,          # 10% - Network relationship
        'responsiveness': 0.05    # 5% - Response speed
    }
    
    # Skill proficiency levels
    PROFICIENCY_LEVELS = {
        1: 'Beginner',
        2: 'Intermediate',
        3: 'Advanced',
        4: 'Expert',
        5: 'Master'
    }
    
    # Availability status scores
    AVAILABILITY_SCORES = {
        0: 100,  # AVAILABLE
        1: 70,   # PARTIALLY_AVAILABLE
        2: 30,   # BUSY
        3: 0     # NOT_AVAILABLE
    }
    
    def __init__(self, db_session=None):
        """
        Initialize matching service
        
        Args:
            db_session: Database session for storing/retrieving data
        """
        self.db = db_session
        self.skill_relations = self._load_skill_relations()
    
    def _load_skill_relations(self) -> Dict[str, Dict[str, float]]:
        """
        Load skill relationship matrix
        
        Returns:
            Dictionary of skill relationships with similarity scores
        """
        # TODO: Load from database in production
        # For now, use a hardcoded matrix
        return {
            'Solidity': {
                'Smart Contracts': 0.95,
                'Ethereum': 0.90,
                'Web3': 0.85,
                'Blockchain': 0.80,
                'DeFi': 0.75
            },
            'React': {
                'JavaScript': 0.90,
                'Frontend': 0.85,
                'Web Development': 0.80,
                'TypeScript': 0.75,
                'Next.js': 0.70
            },
            'Python': {
                'Backend': 0.85,
                'Machine Learning': 0.70,
                'Data Science': 0.75,
                'Django': 0.65,
                'Flask': 0.65
            },
            'Smart Contracts': {
                'Solidity': 0.95,
                'Blockchain': 0.90,
                'Ethereum': 0.85,
                'Web3': 0.80
            }
        }
    
    def calculate_match_score(
        self,
        seeker_requirements: Dict,
        provider_profile: Dict,
        network_data: Optional[Dict] = None
    ) -> Dict:
        """
        Calculate comprehensive match score
        
        Args:
            seeker_requirements: Dictionary containing seeker's requirements
                - required_skills: List of required skills with optional proficiency
                - budget: Budget range (min, max)
                - start_date: Desired start date
                - hours_per_week: Required hours per week
                - duration_weeks: Project duration
            
            provider_profile: Dictionary containing provider's profile
                - skills: List of skills with proficiency levels
                - hourly_rate: Provider's hourly rate
                - availability_status: Current availability (0-3)
                - available_hours_per_week: Available hours
                - reputation_score: Reputation score (0-100)
                - response_time_avg: Average response time in hours
                - completed_projects: Number of completed projects
                - success_rate: Project success rate (0-100)
            
            network_data: Optional network relationship data
                - is_direct_connection: Boolean
                - mutual_connections: Number of mutual connections
                - connection_strength: Connection strength score (0-100)
        
        Returns:
            Dictionary containing:
                - total_score: Overall match score (0-100)
                - dimension_scores: Breakdown of scores by dimension
                - matched_skills: List of matched skills with details
                - recommendations: List of improvement suggestions
        """
        
        # Calculate each dimension score
        skill_score, matched_skills = self._calculate_skill_score(
            seeker_requirements.get('required_skills', []),
            provider_profile.get('skills', [])
        )
        
        availability_score = self._calculate_availability_score(
            seeker_requirements,
            provider_profile
        )
        
        reputation_score = self._calculate_reputation_score(
            provider_profile
        )
        
        price_score = self._calculate_price_score(
            seeker_requirements.get('budget'),
            provider_profile.get('hourly_rate')
        )
        
        network_score = self._calculate_network_score(
            network_data or {}
        )
        
        responsiveness_score = self._calculate_responsiveness_score(
            provider_profile.get('response_time_avg', 24)
        )
        
        # Calculate weighted total score
        total_score = (
            skill_score * self.WEIGHTS['skill_match'] +
            availability_score * self.WEIGHTS['availability'] +
            reputation_score * self.WEIGHTS['reputation'] +
            price_score * self.WEIGHTS['price'] +
            network_score * self.WEIGHTS['network'] +
            responsiveness_score * self.WEIGHTS['responsiveness']
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            skill_score,
            availability_score,
            reputation_score,
            price_score,
            network_score,
            responsiveness_score
        )
        
        return {
            'total_score': round(total_score, 2),
            'dimension_scores': {
                'skill_match': round(skill_score, 2),
                'availability': round(availability_score, 2),
                'reputation': round(reputation_score, 2),
                'price': round(price_score, 2),
                'network': round(network_score, 2),
                'responsiveness': round(responsiveness_score, 2)
            },
            'matched_skills': matched_skills,
            'recommendations': recommendations,
            'match_quality': self._get_match_quality(total_score)
        }
    
    def _calculate_skill_score(
        self,
        required_skills: List[Dict],
        provider_skills: List[Dict]
    ) -> Tuple[float, List[Dict]]:
        """
        Calculate skill matching score with proficiency and relevance
        
        Args:
            required_skills: List of required skills
                [{'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}]
            provider_skills: List of provider skills
                [{'name': 'Solidity', 'proficiency': 4, 'years': 3}]
        
        Returns:
            Tuple of (score, matched_skills_details)
        """
        if not required_skills or not provider_skills:
            return 0.0, []
        
        matched_skills = []
        total_weight = sum(skill.get('weight', 1.0) for skill in required_skills)
        weighted_score = 0.0
        
        for req_skill in required_skills:
            req_name = req_skill.get('name', '').lower()
            req_min_prof = req_skill.get('min_proficiency', 1)
            req_weight = req_skill.get('weight', 1.0)
            
            best_match = None
            best_match_score = 0.0
            
            # Direct match
            for prov_skill in provider_skills:
                prov_name = prov_skill.get('name', '').lower()
                prov_prof = prov_skill.get('proficiency', 1)
                
                if req_name == prov_name:
                    # Proficiency match score
                    prof_score = min(prov_prof / req_min_prof, 1.0) * 100
                    
                    # Bonus for exceeding requirements
                    if prov_prof > req_min_prof:
                        prof_score = min(prof_score + (prov_prof - req_min_prof) * 5, 100)
                    
                    if prof_score > best_match_score:
                        best_match_score = prof_score
                        best_match = {
                            'required': req_skill.get('name'),
                            'matched': prov_skill.get('name'),
                            'match_type': 'direct',
                            'proficiency_match': prof_score,
                            'provider_proficiency': prov_prof,
                            'required_proficiency': req_min_prof
                        }
            
            # Related skill match
            if not best_match:
                for prov_skill in provider_skills:
                    prov_name = prov_skill.get('name', '')
                    
                    # Check skill relations
                    relevance = self._get_skill_relevance(
                        req_skill.get('name'),
                        prov_name
                    )
                    
                    if relevance > 0.5:  # At least 50% relevant
                        prov_prof = prov_skill.get('proficiency', 1)
                        prof_score = min(prov_prof / req_min_prof, 1.0) * 100
                        related_score = prof_score * relevance
                        
                        if related_score > best_match_score:
                            best_match_score = related_score
                            best_match = {
                                'required': req_skill.get('name'),
                                'matched': prov_name,
                                'match_type': 'related',
                                'relevance': relevance,
                                'proficiency_match': prof_score,
                                'provider_proficiency': prov_prof,
                                'required_proficiency': req_min_prof
                            }
            
            if best_match:
                matched_skills.append(best_match)
                weighted_score += best_match_score * (req_weight / total_weight)
        
        # Calculate final score
        match_rate = len(matched_skills) / len(required_skills)
        final_score = weighted_score * match_rate
        
        return final_score, matched_skills
    
    def _get_skill_relevance(self, skill1: str, skill2: str) -> float:
        """
        Get relevance score between two skills
        
        Args:
            skill1: First skill name
            skill2: Second skill name
        
        Returns:
            Relevance score (0.0 - 1.0)
        """
        skill1 = skill1.strip()
        skill2 = skill2.strip()
        
        # Check direct relation
        if skill1 in self.skill_relations:
            if skill2 in self.skill_relations[skill1]:
                return self.skill_relations[skill1][skill2]
        
        # Check reverse relation
        if skill2 in self.skill_relations:
            if skill1 in self.skill_relations[skill2]:
                return self.skill_relations[skill2][skill1]
        
        # No relation found
        return 0.0
    
    def _calculate_availability_score(
        self,
        requirements: Dict,
        profile: Dict
    ) -> float:
        """
        Calculate availability matching score
        
        Args:
            requirements: Seeker requirements
            profile: Provider profile
        
        Returns:
            Availability score (0-100)
        """
        # Base score from availability status
        status = profile.get('availability_status', 3)
        base_score = self.AVAILABILITY_SCORES.get(status, 0)
        
        if base_score == 0:
            return 0.0
        
        # Hours per week match
        required_hours = requirements.get('hours_per_week', 0)
        available_hours = profile.get('available_hours_per_week', 0)
        
        if required_hours > 0 and available_hours > 0:
            hours_ratio = min(available_hours / required_hours, 1.0)
            hours_score = hours_ratio * 100
        else:
            hours_score = 50  # Neutral if not specified
        
        # Start date match (if specified)
        # TODO: Implement start date matching
        
        # Combine scores
        final_score = (base_score * 0.6 + hours_score * 0.4)
        
        return final_score
    
    def _calculate_reputation_score(self, profile: Dict) -> float:
        """
        Calculate reputation score
        
        Args:
            profile: Provider profile
        
        Returns:
            Reputation score (0-100)
        """
        reputation = profile.get('reputation_score', 50)
        completed = profile.get('completed_projects', 0)
        success_rate = profile.get('success_rate', 50)
        
        # Base reputation
        base_score = reputation
        
        # Bonus for experience
        experience_bonus = min(completed * 2, 20)
        
        # Success rate factor
        success_factor = success_rate / 100
        
        final_score = (base_score + experience_bonus) * success_factor
        
        return min(final_score, 100)
    
    def _calculate_price_score(
        self,
        budget: Optional[Dict],
        hourly_rate: Optional[float]
    ) -> float:
        """
        Calculate price matching score
        
        Args:
            budget: Budget range {'min': x, 'max': y}
            hourly_rate: Provider's hourly rate
        
        Returns:
            Price score (0-100)
        """
        if not budget or not hourly_rate:
            return 50  # Neutral if not specified
        
        min_budget = budget.get('min', 0)
        max_budget = budget.get('max', float('inf'))
        
        if hourly_rate < min_budget:
            # Too cheap might indicate lower quality
            ratio = hourly_rate / min_budget
            return max(ratio * 80, 40)
        elif hourly_rate <= max_budget:
            # Within budget - perfect match
            # Bonus for being closer to min (cost-effective)
            if max_budget > min_budget:
                position = (hourly_rate - min_budget) / (max_budget - min_budget)
                return 100 - (position * 10)  # 100 at min, 90 at max
            return 100
        else:
            # Over budget
            overage_ratio = (hourly_rate - max_budget) / max_budget
            penalty = min(overage_ratio * 50, 80)
            return max(100 - penalty, 0)
    
    def _calculate_network_score(self, network_data: Dict) -> float:
        """
        Calculate network relationship score
        
        Args:
            network_data: Network relationship data
        
        Returns:
            Network score (0-100)
        """
        if not network_data:
            return 50  # Neutral if no network data
        
        is_direct = network_data.get('is_direct_connection', False)
        mutual = network_data.get('mutual_connections', 0)
        strength = network_data.get('connection_strength', 0)
        
        if is_direct:
            base_score = 80
        elif mutual > 0:
            base_score = 60 + min(mutual * 2, 20)
        else:
            base_score = 40
        
        # Apply connection strength
        if strength > 0:
            final_score = base_score * (strength / 100)
        else:
            final_score = base_score * 0.7
        
        return final_score
    
    def _calculate_responsiveness_score(self, avg_response_hours: float) -> float:
        """
        Calculate responsiveness score based on average response time
        
        Args:
            avg_response_hours: Average response time in hours
        
        Returns:
            Responsiveness score (0-100)
        """
        # Scoring curve:
        # < 1 hour: 100
        # 1-4 hours: 90-80
        # 4-12 hours: 80-60
        # 12-24 hours: 60-40
        # > 24 hours: 40-0
        
        if avg_response_hours < 1:
            return 100
        elif avg_response_hours < 4:
            return 100 - (avg_response_hours - 1) * 3.33
        elif avg_response_hours < 12:
            return 90 - (avg_response_hours - 4) * 2.5
        elif avg_response_hours < 24:
            return 70 - (avg_response_hours - 12) * 2.5
        else:
            return max(40 - (avg_response_hours - 24) * 1, 0)
    
    def _generate_recommendations(
        self,
        skill_score: float,
        availability_score: float,
        reputation_score: float,
        price_score: float,
        network_score: float,
        responsiveness_score: float
    ) -> List[str]:
        """
        Generate recommendations based on dimension scores
        
        Returns:
            List of recommendation strings
        """
        recommendations = []
        
        if skill_score < 60:
            recommendations.append("Consider candidates with related skills or willingness to learn")
        
        if availability_score < 50:
            recommendations.append("Provider may have limited availability - discuss timeline flexibility")
        
        if reputation_score < 60:
            recommendations.append("New provider - consider starting with a smaller pilot project")
        
        if price_score < 50:
            recommendations.append("Price may be outside budget - consider negotiation or adjusting scope")
        
        if network_score < 40:
            recommendations.append("No existing connection - request references or introductions")
        
        if responsiveness_score < 50:
            recommendations.append("Provider may have slower response times - set clear communication expectations")
        
        if not recommendations:
            recommendations.append("Excellent match across all dimensions!")
        
        return recommendations
    
    def _get_match_quality(self, score: float) -> str:
        """
        Get match quality label
        
        Args:
            score: Total match score
        
        Returns:
            Quality label string
        """
        if score >= 85:
            return "Excellent Match"
        elif score >= 70:
            return "Great Match"
        elif score >= 55:
            return "Good Match"
        elif score >= 40:
            return "Fair Match"
        else:
            return "Low Match"
    
    def find_matches(
        self,
        seeker_requirements: Dict,
        candidate_profiles: List[Dict],
        network_data_map: Optional[Dict[str, Dict]] = None,
        limit: int = 20
    ) -> List[Dict]:
        """
        Find and rank matches for a seeker
        
        Args:
            seeker_requirements: Seeker's requirements
            candidate_profiles: List of candidate provider profiles
            network_data_map: Map of provider address to network data
            limit: Maximum number of results to return
        
        Returns:
            List of match results sorted by score
        """
        matches = []
        
        for profile in candidate_profiles:
            provider_address = profile.get('address')
            network_data = None
            
            if network_data_map and provider_address:
                network_data = network_data_map.get(provider_address)
            
            match_result = self.calculate_match_score(
                seeker_requirements,
                profile,
                network_data
            )
            
            matches.append({
                'provider_address': provider_address,
                'provider_name': profile.get('name'),
                'provider_title': profile.get('title'),
                **match_result
            })
        
        # Sort by total score (descending)
        matches.sort(key=lambda x: x['total_score'], reverse=True)
        
        # Return top matches
        return matches[:limit]
