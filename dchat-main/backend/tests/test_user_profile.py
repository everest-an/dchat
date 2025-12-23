"""
Unit Tests for User Profile API

Tests all CRUD operations for:
- Projects
- Skills
- Resources
- Seeking opportunities

@author Manus AI
@date 2025-11-05
"""

import unittest
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.main import app, db
from src.models.user import User
from src.models.user_profile import UserProject, UserSkill, UserResource, UserSeeking
import jwt
from datetime import datetime, timedelta

class TestUserProfileAPI(unittest.TestCase):
    """Test cases for User Profile API"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.client = app.test_client()
        
        with app.app_context():
            db.create_all()
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test environment"""
        with app.app_context():
            db.drop_all()
    
    def setUp(self):
        """Set up test data before each test"""
        with app.app_context():
            # Create test user
            self.test_user = User(
                wallet_address='0x1234567890123456789012345678901234567890',
                username='testuser',
                email='test@example.com'
            )
            db.session.add(self.test_user)
            db.session.commit()
            
            # Generate JWT token
            self.token = jwt.encode(
                {
                    'user_id': self.test_user.id,
                    'wallet_address': self.test_user.wallet_address,
                    'exp': datetime.utcnow() + timedelta(hours=24)
                },
                app.config['SECRET_KEY'],
                algorithm='HS256'
            )
            
            self.headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
    
    def tearDown(self):
        """Clean up after each test"""
        with app.app_context():
            UserProject.query.delete()
            UserSkill.query.delete()
            UserResource.query.delete()
            UserSeeking.query.delete()
            User.query.delete()
            db.session.commit()
    
    # ========================================================================
    # PROJECT TESTS
    # ========================================================================
    
    def test_create_project(self):
        """Test creating a new project"""
        data = {
            'title': 'Test Project',
            'description': 'A test project',
            'status': 'In Progress',
            'progress': 50
        }
        
        response = self.client.post(
            '/api/profile/projects',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(result['project']['title'], 'Test Project')
        self.assertEqual(result['project']['progress'], 50)
    
    def test_get_projects(self):
        """Test getting all projects"""
        # Create test projects
        with app.app_context():
            project1 = UserProject(
                user_id=self.test_user.id,
                title='Project 1',
                status='In Progress',
                progress=30
            )
            project2 = UserProject(
                user_id=self.test_user.id,
                title='Project 2',
                status='Completed',
                progress=100
            )
            db.session.add(project1)
            db.session.add(project2)
            db.session.commit()
        
        response = self.client.get(
            '/api/profile/projects',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(len(result['projects']), 2)
    
    def test_update_project(self):
        """Test updating a project"""
        # Create test project
        with app.app_context():
            project = UserProject(
                user_id=self.test_user.id,
                title='Original Title',
                progress=30
            )
            db.session.add(project)
            db.session.commit()
            project_id = project.id
        
        # Update project
        data = {
            'title': 'Updated Title',
            'progress': 75
        }
        
        response = self.client.put(
            f'/api/profile/projects/{project_id}',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(result['project']['title'], 'Updated Title')
        self.assertEqual(result['project']['progress'], 75)
    
    def test_delete_project(self):
        """Test deleting a project"""
        # Create test project
        with app.app_context():
            project = UserProject(
                user_id=self.test_user.id,
                title='To Delete'
            )
            db.session.add(project)
            db.session.commit()
            project_id = project.id
        
        # Delete project
        response = self.client.delete(
            f'/api/profile/projects/{project_id}',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        
        # Verify deletion
        with app.app_context():
            project = UserProject.query.get(project_id)
            self.assertIsNone(project)
    
    # ========================================================================
    # SKILL TESTS
    # ========================================================================
    
    def test_create_skill(self):
        """Test creating a new skill"""
        data = {
            'name': 'Python',
            'category': 'Technical',
            'level': 'Advanced',
            'years_of_experience': 5
        }
        
        response = self.client.post(
            '/api/profile/skills',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(result['skill']['name'], 'Python')
        self.assertEqual(result['skill']['level'], 'Advanced')
    
    def test_get_skills(self):
        """Test getting all skills"""
        # Create test skills
        with app.app_context():
            skill1 = UserSkill(
                user_id=self.test_user.id,
                name='JavaScript',
                level='Expert'
            )
            skill2 = UserSkill(
                user_id=self.test_user.id,
                name='React',
                level='Advanced'
            )
            db.session.add(skill1)
            db.session.add(skill2)
            db.session.commit()
        
        response = self.client.get(
            '/api/profile/skills',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(len(result['skills']), 2)
    
    def test_update_skill(self):
        """Test updating a skill"""
        # Create test skill
        with app.app_context():
            skill = UserSkill(
                user_id=self.test_user.id,
                name='Python',
                level='Intermediate'
            )
            db.session.add(skill)
            db.session.commit()
            skill_id = skill.id
        
        # Update skill
        data = {
            'level': 'Advanced',
            'years_of_experience': 3
        }
        
        response = self.client.put(
            f'/api/profile/skills/{skill_id}',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(result['skill']['level'], 'Advanced')
        self.assertEqual(result['skill']['years_of_experience'], 3)
    
    def test_delete_skill(self):
        """Test deleting a skill"""
        # Create test skill
        with app.app_context():
            skill = UserSkill(
                user_id=self.test_user.id,
                name='To Delete'
            )
            db.session.add(skill)
            db.session.commit()
            skill_id = skill.id
        
        # Delete skill
        response = self.client.delete(
            f'/api/profile/skills/{skill_id}',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
    
    # ========================================================================
    # RESOURCE TESTS
    # ========================================================================
    
    def test_create_resource(self):
        """Test creating a new resource"""
        data = {
            'name': 'Development Team',
            'description': 'Full-stack development team',
            'resource_type': 'Team',
            'availability': 'Available'
        }
        
        response = self.client.post(
            '/api/profile/resources',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(result['resource']['name'], 'Development Team')
    
    def test_get_resources(self):
        """Test getting all resources"""
        # Create test resources
        with app.app_context():
            resource1 = UserResource(
                user_id=self.test_user.id,
                name='Resource 1',
                availability='Available'
            )
            resource2 = UserResource(
                user_id=self.test_user.id,
                name='Resource 2',
                availability='Limited'
            )
            db.session.add(resource1)
            db.session.add(resource2)
            db.session.commit()
        
        response = self.client.get(
            '/api/profile/resources',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(len(result['resources']), 2)
    
    # ========================================================================
    # SEEKING TESTS
    # ========================================================================
    
    def test_create_seeking(self):
        """Test creating a new seeking opportunity"""
        data = {
            'title': 'Looking for Co-founder',
            'description': 'Tech co-founder needed',
            'category': 'Partnership',
            'priority': 'High'
        }
        
        response = self.client.post(
            '/api/profile/seeking',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(result['seeking']['title'], 'Looking for Co-founder')
        self.assertEqual(result['seeking']['priority'], 'High')
    
    def test_get_seeking(self):
        """Test getting all seeking opportunities"""
        # Create test seeking
        with app.app_context():
            seeking1 = UserSeeking(
                user_id=self.test_user.id,
                title='Seeking 1',
                priority='High'
            )
            seeking2 = UserSeeking(
                user_id=self.test_user.id,
                title='Seeking 2',
                priority='Medium'
            )
            db.session.add(seeking1)
            db.session.add(seeking2)
            db.session.commit()
        
        response = self.client.get(
            '/api/profile/seeking',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(len(result['seeking']), 2)
    
    # ========================================================================
    # AUTHENTICATION TESTS
    # ========================================================================
    
    def test_unauthorized_access(self):
        """Test API access without authentication"""
        response = self.client.get('/api/profile/projects')
        self.assertEqual(response.status_code, 401)
    
    def test_invalid_token(self):
        """Test API access with invalid token"""
        headers = {
            'Authorization': 'Bearer invalid_token',
            'Content-Type': 'application/json'
        }
        response = self.client.get('/api/profile/projects', headers=headers)
        self.assertEqual(response.status_code, 401)


if __name__ == '__main__':
    unittest.main()
