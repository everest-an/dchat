"""
Integration test for Matching Service (standalone)
Tests the core matching logic without full Flask app dependencies
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.services.matching_service import MatchingService
import json


def test_matching_service_integration():
    """
    Integration test for matching service
    """
    print("\n" + "="*70)
    print("MATCHING SERVICE INTEGRATION TEST")
    print("="*70)
    
    # Initialize service
    service = MatchingService()
    print("\n✓ Matching service initialized")
    
    # Test Case 1: Basic skill matching
    print("\n" + "-"*70)
    print("TEST 1: Basic Skill Matching")
    print("-"*70)
    
    requirements = {
        'required_skills': [
            {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}
        ],
        'budget': {'min': 50, 'max': 150},
        'hours_per_week': 20
    }
    
    profile = {
        'address': '0x1234567890123456789012345678901234567890',
        'name': 'Test Developer',
        'skills': [
            {'name': 'Solidity', 'proficiency': 4, 'years': 3}
        ],
        'hourly_rate': 100,
        'availability_status': 0,
        'available_hours_per_week': 30,
        'reputation_score': 85,
        'response_time_avg': 3.0,
        'completed_projects': 10,
        'success_rate': 90
    }
    
    result = service.calculate_match_score(requirements, profile)
    
    print(f"\nSeeker Requirements:")
    print(f"  - Skills: {', '.join([s['name'] for s in requirements['required_skills']])}")
    print(f"  - Budget: ${requirements['budget']['min']}-${requirements['budget']['max']}/hr")
    print(f"  - Hours: {requirements['hours_per_week']}/week")
    
    print(f"\nProvider Profile:")
    print(f"  - Name: {profile['name']}")
    print(f"  - Skills: {', '.join([s['name'] for s in profile['skills']])}")
    print(f"  - Rate: ${profile['hourly_rate']}/hr")
    print(f"  - Reputation: {profile['reputation_score']}")
    
    print(f"\nMatch Result:")
    print(f"  - Total Score: {result['total_score']:.1f}%")
    print(f"  - Quality: {result['match_quality']}")
    print(f"\n  Dimension Scores:")
    for dim, score in result['dimension_scores'].items():
        print(f"    {dim:15s}: {score:5.1f}%")
    
    assert result['total_score'] > 70, "Should be a good match"
    print("\n✓ TEST 1 PASSED")
    
    # Test Case 2: Multiple candidates ranking
    print("\n" + "-"*70)
    print("TEST 2: Multiple Candidates Ranking")
    print("-"*70)
    
    candidates = [
        {
            'address': '0xAAAA',
            'name': 'Expert Developer',
            'skills': [
                {'name': 'Solidity', 'proficiency': 5, 'years': 5},
                {'name': 'Smart Contracts', 'proficiency': 5, 'years': 5}
            ],
            'hourly_rate': 120,
            'availability_status': 1,
            'available_hours_per_week': 25,
            'reputation_score': 95,
            'response_time_avg': 1.0,
            'completed_projects': 30,
            'success_rate': 98
        },
        {
            'address': '0xBBBB',
            'name': 'Junior Developer',
            'skills': [
                {'name': 'Solidity', 'proficiency': 2, 'years': 1}
            ],
            'hourly_rate': 50,
            'availability_status': 0,
            'available_hours_per_week': 40,
            'reputation_score': 70,
            'response_time_avg': 8.0,
            'completed_projects': 3,
            'success_rate': 80
        },
        {
            'address': '0xCCCC',
            'name': 'Busy Expert',
            'skills': [
                {'name': 'Solidity', 'proficiency': 5, 'years': 6}
            ],
            'hourly_rate': 200,
            'availability_status': 2,
            'available_hours_per_week': 10,
            'reputation_score': 92,
            'response_time_avg': 12.0,
            'completed_projects': 40,
            'success_rate': 95
        }
    ]
    
    matches = service.find_matches(
        requirements,
        candidates,
        limit=10
    )
    
    print(f"\nFound {len(matches)} matches:")
    for i, match in enumerate(matches, 1):
        print(f"\n  #{i} - {match['provider_name']}")
        print(f"      Score: {match['total_score']:.1f}% ({match['match_quality']})")
        print(f"      Skills: {match['dimension_scores']['skill_match']:.1f}%")
        print(f"      Availability: {match['dimension_scores']['availability']:.1f}%")
    
    # Verify ranking
    assert matches[0]['total_score'] >= matches[1]['total_score'], "Should be sorted by score"
    assert matches[1]['total_score'] >= matches[2]['total_score'], "Should be sorted by score"
    
    # Expert should be top despite higher price
    assert matches[0]['provider_name'] == 'Expert Developer', "Expert should rank highest"
    
    print("\n✓ TEST 2 PASSED")
    
    # Test Case 3: Related skill matching
    print("\n" + "-"*70)
    print("TEST 3: Related Skill Matching")
    print("-"*70)
    
    requirements_related = {
        'required_skills': [
            {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.0}
        ],
        'budget': {'min': 50, 'max': 150},
        'hours_per_week': 20
    }
    
    profile_related = {
        'address': '0xDDDD',
        'name': 'Smart Contract Expert',
        'skills': [
            {'name': 'Smart Contracts', 'proficiency': 5, 'years': 4}
        ],
        'hourly_rate': 110,
        'availability_status': 0,
        'available_hours_per_week': 30,
        'reputation_score': 90,
        'response_time_avg': 2.0,
        'completed_projects': 20,
        'success_rate': 95
    }
    
    result_related = service.calculate_match_score(requirements_related, profile_related)
    
    print(f"\nRequired Skill: Solidity")
    print(f"Provider Has: Smart Contracts (related)")
    print(f"\nMatch Score: {result_related['total_score']:.1f}%")
    print(f"Matched Skills:")
    for skill in result_related['matched_skills']:
        print(f"  - {skill['required']} → {skill['matched']} ({skill['match_type']})")
        if 'relevance' in skill:
            print(f"    Relevance: {skill['relevance']*100:.0f}%")
    
    assert result_related['total_score'] > 60, "Related skill should still match well"
    assert len(result_related['matched_skills']) > 0, "Should find related match"
    
    print("\n✓ TEST 3 PASSED")
    
    # Summary
    print("\n" + "="*70)
    print("✅ ALL INTEGRATION TESTS PASSED")
    print("="*70)
    print("\nMatching Service Summary:")
    print("  ✓ Core matching algorithm working")
    print("  ✓ Multi-dimensional scoring functional")
    print("  ✓ Candidate ranking correct")
    print("  ✓ Related skill matching operational")
    print("  ✓ Ready for API integration")
    print("="*70 + "\n")


if __name__ == '__main__':
    try:
        test_matching_service_integration()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
