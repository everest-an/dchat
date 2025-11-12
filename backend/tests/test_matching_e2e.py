"""
End-to-end test for Matching System
"""

from src.services.matching_service import MatchingService


def test_complete_matching_workflow():
    """
    Test complete matching workflow with realistic data
    """
    print("\n" + "="*60)
    print("Testing Complete Matching Workflow")
    print("="*60)
    
    # Initialize service
    service = MatchingService()
    
    # Seeker requirements
    seeker_requirements = {
        'required_skills': [
            {'name': 'Solidity', 'min_proficiency': 3, 'weight': 1.5},
            {'name': 'Smart Contracts', 'min_proficiency': 3, 'weight': 1.0},
            {'name': 'Web3', 'min_proficiency': 2, 'weight': 0.8}
        ],
        'budget': {'min': 80, 'max': 150},
        'hours_per_week': 25,
        'duration_weeks': 8
    }
    
    print("\n📋 Seeker Requirements:")
    print(f"  Skills: {', '.join([s['name'] for s in seeker_requirements['required_skills']])}")
    print(f"  Budget: ${seeker_requirements['budget']['min']}-${seeker_requirements['budget']['max']}/hr")
    print(f"  Hours: {seeker_requirements['hours_per_week']}/week")
    print(f"  Duration: {seeker_requirements['duration_weeks']} weeks")
    
    # Candidate profiles
    candidates = [
        {
            'address': '0xAAA1111111111111111111111111111111111111',
            'name': 'Alice Chen',
            'title': 'Senior Blockchain Developer',
            'skills': [
                {'name': 'Solidity', 'proficiency': 5, 'years': 4},
                {'name': 'Smart Contracts', 'proficiency': 5, 'years': 4},
                {'name': 'Ethereum', 'proficiency': 4, 'years': 3},
                {'name': 'Web3', 'proficiency': 4, 'years': 3}
            ],
            'hourly_rate': 120,
            'availability_status': 1,  # PARTIALLY_AVAILABLE
            'available_hours_per_week': 30,
            'reputation_score': 95,
            'response_time_avg': 1.5,
            'completed_projects': 25,
            'success_rate': 96
        },
        {
            'address': '0xBBB2222222222222222222222222222222222222',
            'name': 'Bob Martinez',
            'title': 'Full Stack Web3 Developer',
            'skills': [
                {'name': 'Solidity', 'proficiency': 4, 'years': 2},
                {'name': 'React', 'proficiency': 5, 'years': 5},
                {'name': 'Web3', 'proficiency': 4, 'years': 2},
                {'name': 'JavaScript', 'proficiency': 5, 'years': 6}
            ],
            'hourly_rate': 100,
            'availability_status': 0,  # AVAILABLE
            'available_hours_per_week': 40,
            'reputation_score': 88,
            'response_time_avg': 3.0,
            'completed_projects': 18,
            'success_rate': 92
        },
        {
            'address': '0xCCC3333333333333333333333333333333333333',
            'name': 'Charlie Kim',
            'title': 'Blockchain Consultant',
            'skills': [
                {'name': 'Blockchain', 'proficiency': 5, 'years': 5},
                {'name': 'Smart Contracts', 'proficiency': 4, 'years': 3},
                {'name': 'DeFi', 'proficiency': 4, 'years': 2}
            ],
            'hourly_rate': 180,
            'availability_status': 1,  # PARTIALLY_AVAILABLE
            'available_hours_per_week': 20,
            'reputation_score': 92,
            'response_time_avg': 4.0,
            'completed_projects': 30,
            'success_rate': 94
        },
        {
            'address': '0xDDD4444444444444444444444444444444444444',
            'name': 'Diana Lopez',
            'title': 'Junior Blockchain Developer',
            'skills': [
                {'name': 'Solidity', 'proficiency': 2, 'years': 1},
                {'name': 'JavaScript', 'proficiency': 4, 'years': 3},
                {'name': 'Python', 'proficiency': 3, 'years': 2}
            ],
            'hourly_rate': 60,
            'availability_status': 0,  # AVAILABLE
            'available_hours_per_week': 40,
            'reputation_score': 75,
            'response_time_avg': 6.0,
            'completed_projects': 5,
            'success_rate': 85
        },
        {
            'address': '0xEEE5555555555555555555555555555555555555',
            'name': 'Ethan Wang',
            'title': 'Backend Developer',
            'skills': [
                {'name': 'Python', 'proficiency': 5, 'years': 6},
                {'name': 'Django', 'proficiency': 4, 'years': 4},
                {'name': 'PostgreSQL', 'proficiency': 4, 'years': 5}
            ],
            'hourly_rate': 90,
            'availability_status': 2,  # BUSY
            'available_hours_per_week': 10,
            'reputation_score': 85,
            'response_time_avg': 12.0,
            'completed_projects': 20,
            'success_rate': 90
        }
    ]
    
    # Network data (simulated)
    network_data_map = {
        '0xAAA1111111111111111111111111111111111111': {
            'is_direct_connection': False,
            'mutual_connections': 3,
            'connection_strength': 65
        },
        '0xBBB2222222222222222222222222222222222222': {
            'is_direct_connection': True,
            'connection_strength': 85
        },
        '0xCCC3333333333333333333333333333333333333': {
            'is_direct_connection': False,
            'mutual_connections': 1,
            'connection_strength': 45
        }
    }
    
    # Find matches
    print("\n🔍 Finding matches...")
    matches = service.find_matches(
        seeker_requirements,
        candidates,
        network_data_map,
        limit=10
    )
    
    # Display results
    print(f"\n✅ Found {len(matches)} matches\n")
    print("="*60)
    
    for i, match in enumerate(matches, 1):
        print(f"\n#{i} - {match['provider_name']} ({match['provider_title']})")
        print(f"   Address: {match['provider_address'][:10]}...{match['provider_address'][-8:]}")
        print(f"   Overall Score: {match['total_score']:.1f}% - {match['match_quality']}")
        print(f"\n   Dimension Scores:")
        for dim, score in match['dimension_scores'].items():
            bar_length = int(score / 5)
            bar = "█" * bar_length + "░" * (20 - bar_length)
            print(f"     {dim:15s}: {bar} {score:5.1f}%")
        
        print(f"\n   Matched Skills:")
        for skill in match['matched_skills']:
            match_type = "✓" if skill['match_type'] == 'direct' else "≈"
            print(f"     {match_type} {skill['required']} → {skill['matched']}")
            if skill['match_type'] == 'related':
                print(f"       (Relevance: {skill['relevance']*100:.0f}%)")
        
        if match['recommendations']:
            print(f"\n   Recommendations:")
            for rec in match['recommendations']:
                print(f"     • {rec}")
        
        print("\n" + "-"*60)
    
    # Assertions
    assert len(matches) == 5, "Should return all 5 candidates"
    
    # Top match should have high score
    assert matches[0]['total_score'] >= 75, "Top match should have score >= 75"
    
    # Alice or Bob should be in top 2 (both are strong candidates)
    top_two_names = [matches[0]['provider_name'], matches[1]['provider_name']]
    assert 'Alice Chen' in top_two_names, "Alice should be in top 2"
    assert 'Bob Martinez' in top_two_names, "Bob should be in top 2"
    
    # Ethan should be last (no relevant skills, busy)
    assert matches[-1]['provider_name'] == 'Ethan Wang', "Ethan should be last"
    assert matches[-1]['total_score'] < 40, "Last match should have low score"
    
    print("\n" + "="*60)
    print("✅ All tests passed!")
    print("="*60 + "\n")


if __name__ == '__main__':
    test_complete_matching_workflow()
