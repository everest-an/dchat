"""
Unit tests for Matching Service
"""

import pytest
from src.services.matching_service import MatchingService


class TestMatchingService:
    """Test cases for MatchingService"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.service = MatchingService()
    
    def test_calculate_skill_score_direct_match(self):
        """Test skill score calculation with direct match"""
        required_skills = [
            {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}
        ]
        provider_skills = [
            {'name': 'Solidity', 'proficiency': 4, 'years': 3}
        ]
        
        score, matched = self.service._calculate_skill_score(
            required_skills,
            provider_skills
        )
        
        assert score > 80  # Should be high match
        assert len(matched) == 1
        assert matched[0]['match_type'] == 'direct'
        assert matched[0]['required'] == 'Solidity'
    
    def test_calculate_skill_score_related_match(self):
        """Test skill score calculation with related skills"""
        required_skills = [
            {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}
        ]
        provider_skills = [
            {'name': 'Smart Contracts', 'proficiency': 4, 'years': 3}
        ]
        
        score, matched = self.service._calculate_skill_score(
            required_skills,
            provider_skills
        )
        
        assert score > 50  # Should have some match due to relation
        assert len(matched) == 1
        assert matched[0]['match_type'] == 'related'
    
    def test_calculate_skill_score_no_match(self):
        """Test skill score calculation with no match"""
        required_skills = [
            {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}
        ]
        provider_skills = [
            {'name': 'Python', 'proficiency': 4, 'years': 3}
        ]
        
        score, matched = self.service._calculate_skill_score(
            required_skills,
            provider_skills
        )
        
        assert score == 0  # No match
        assert len(matched) == 0
    
    def test_calculate_availability_score_available(self):
        """Test availability score for available provider"""
        requirements = {
            'hours_per_week': 20
        }
        profile = {
            'availability_status': 0,  # AVAILABLE
            'available_hours_per_week': 30
        }
        
        score = self.service._calculate_availability_score(
            requirements,
            profile
        )
        
        assert score >= 80  # Should be high
    
    def test_calculate_availability_score_busy(self):
        """Test availability score for busy provider"""
        requirements = {
            'hours_per_week': 20
        }
        profile = {
            'availability_status': 2,  # BUSY
            'available_hours_per_week': 10
        }
        
        score = self.service._calculate_availability_score(
            requirements,
            profile
        )
        
        assert score < 50  # Should be low
    
    def test_calculate_reputation_score(self):
        """Test reputation score calculation"""
        profile = {
            'reputation_score': 80,
            'completed_projects': 10,
            'success_rate': 90
        }
        
        score = self.service._calculate_reputation_score(profile)
        
        assert score >= 80  # Should be high
    
    def test_calculate_price_score_within_budget(self):
        """Test price score when within budget"""
        budget = {'min': 50, 'max': 150}
        hourly_rate = 100
        
        score = self.service._calculate_price_score(budget, hourly_rate)
        
        assert score >= 90  # Should be high
    
    def test_calculate_price_score_over_budget(self):
        """Test price score when over budget"""
        budget = {'min': 50, 'max': 100}
        hourly_rate = 150
        
        score = self.service._calculate_price_score(budget, hourly_rate)
        
        assert score < 80  # Should be penalized but not too harsh
    
    def test_calculate_network_score_direct_connection(self):
        """Test network score for direct connection"""
        network_data = {
            'is_direct_connection': True,
            'connection_strength': 80
        }
        
        score = self.service._calculate_network_score(network_data)
        
        assert score >= 60  # Should be decent
    
    def test_calculate_responsiveness_score_fast(self):
        """Test responsiveness score for fast responder"""
        score = self.service._calculate_responsiveness_score(0.5)  # 30 minutes
        
        assert score >= 95  # Should be very high
    
    def test_calculate_responsiveness_score_slow(self):
        """Test responsiveness score for slow responder"""
        score = self.service._calculate_responsiveness_score(48)  # 48 hours
        
        assert score < 30  # Should be low
    
    def test_calculate_match_score_excellent(self):
        """Test overall match score calculation for excellent match"""
        requirements = {
            'required_skills': [
                {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}
            ],
            'budget': {'min': 50, 'max': 150},
            'hours_per_week': 20
        }
        
        profile = {
            'skills': [
                {'name': 'Solidity', 'proficiency': 4, 'years': 3}
            ],
            'hourly_rate': 100,
            'availability_status': 0,
            'available_hours_per_week': 30,
            'reputation_score': 90,
            'response_time_avg': 2,
            'completed_projects': 15,
            'success_rate': 95
        }
        
        result = self.service.calculate_match_score(
            requirements,
            profile
        )
        
        assert result['total_score'] >= 80
        assert result['match_quality'] in ['Excellent Match', 'Great Match']
        assert 'dimension_scores' in result
        assert 'matched_skills' in result
        assert 'recommendations' in result
    
    def test_calculate_match_score_poor(self):
        """Test overall match score calculation for poor match"""
        requirements = {
            'required_skills': [
                {'name': 'Solidity', 'min_proficiency': 4, 'weight': 1.0}
            ],
            'budget': {'min': 50, 'max': 100},
            'hours_per_week': 40
        }
        
        profile = {
            'skills': [
                {'name': 'Python', 'proficiency': 3, 'years': 2}
            ],
            'hourly_rate': 200,
            'availability_status': 2,  # BUSY
            'available_hours_per_week': 10,
            'reputation_score': 50,
            'response_time_avg': 48,
            'completed_projects': 2,
            'success_rate': 60
        }
        
        result = self.service.calculate_match_score(
            requirements,
            profile
        )
        
        assert result['total_score'] < 50
        assert result['match_quality'] in ['Low Match', 'Fair Match']
    
    def test_find_matches_sorting(self):
        """Test that find_matches returns sorted results"""
        requirements = {
            'required_skills': [
                {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}
            ],
            'budget': {'min': 50, 'max': 150},
            'hours_per_week': 20
        }
        
        candidates = [
            {
                'address': '0x1111',
                'name': 'Low Match',
                'skills': [{'name': 'Python', 'proficiency': 3, 'years': 2}],
                'hourly_rate': 200,
                'availability_status': 2,
                'available_hours_per_week': 10,
                'reputation_score': 50,
                'response_time_avg': 48,
                'completed_projects': 2,
                'success_rate': 60
            },
            {
                'address': '0x2222',
                'name': 'High Match',
                'skills': [{'name': 'Solidity', 'proficiency': 4, 'years': 3}],
                'hourly_rate': 100,
                'availability_status': 0,
                'available_hours_per_week': 30,
                'reputation_score': 90,
                'response_time_avg': 2,
                'completed_projects': 15,
                'success_rate': 95
            }
        ]
        
        matches = self.service.find_matches(
            requirements,
            candidates
        )
        
        assert len(matches) == 2
        assert matches[0]['provider_address'] == '0x2222'  # High match first
        assert matches[1]['provider_address'] == '0x1111'  # Low match second
        assert matches[0]['total_score'] > matches[1]['total_score']
    
    def test_get_skill_relevance(self):
        """Test skill relevance lookup"""
        relevance = self.service._get_skill_relevance('Solidity', 'Smart Contracts')
        assert relevance > 0.8  # Should be highly related
        
        relevance = self.service._get_skill_relevance('Solidity', 'Python')
        assert relevance == 0.0  # Should be unrelated


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
