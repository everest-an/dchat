import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Profile Edit Dialog
 * 
 * Allows users to edit their profile information:
 * - Projects
 * - Skills
 * - Resources
 * - Seeking opportunities
 * 
 * Fully integrated with backend API.
 */
const ProfileEditDialog = ({ isOpen, onClose, userId, authToken }) => {
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [resources, setResources] = useState([]);
  const [seeking, setSeeking] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      
      const [projectsRes, skillsRes, resourcesRes, seekingRes] = await Promise.all([
        axios.get(`${API_BASE}/api/profile/projects`, { headers }),
        axios.get(`${API_BASE}/api/profile/skills`, { headers }),
        axios.get(`${API_BASE}/api/profile/resources`, { headers }),
        axios.get(`${API_BASE}/api/profile/seeking`, { headers })
      ]);
      
      setProjects(projectsRes.data.projects || []);
      setSkills(skillsRes.data.skills || []);
      setResources(resourcesRes.data.resources || []);
      setSeeking(seekingRes.data.seeking || []);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Project operations
  const addProject = async () => {
    const newProject = {
      title: 'New Project',
      description: '',
      status: 'In Progress',
      progress: 0
    };
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/projects`,
        newProject,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setProjects([...projects, res.data.project]);
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const updateProject = async (id, updates) => {
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/projects/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setProjects(projects.map(p => p.id === id ? res.data.project : p));
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const deleteProject = async (id) => {
    try {
      await axios.delete(
        `${API_BASE}/api/profile/projects/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Skill operations
  const addSkill = async () => {
    const newSkill = {
      name: 'New Skill',
      category: 'Technical',
      level: 'Intermediate'
    };
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/skills`,
        newSkill,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSkills([...skills, res.data.skill]);
    } catch (error) {
      console.error('Failed to add skill:', error);
    }
  };

  const updateSkill = async (id, updates) => {
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/skills/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSkills(skills.map(s => s.id === id ? res.data.skill : s));
    } catch (error) {
      console.error('Failed to update skill:', error);
    }
  };

  const deleteSkill = async (id) => {
    try {
      await axios.delete(
        `${API_BASE}/api/profile/skills/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSkills(skills.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  // Resource operations
  const addResource = async () => {
    const newResource = {
      name: 'New Resource',
      description: '',
      resource_type: 'Service',
      availability: 'Available'
    };
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/resources`,
        newResource,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setResources([...resources, res.data.resource]);
    } catch (error) {
      console.error('Failed to add resource:', error);
    }
  };

  const updateResource = async (id, updates) => {
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/resources/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setResources(resources.map(r => r.id === id ? res.data.resource : r));
    } catch (error) {
      console.error('Failed to update resource:', error);
    }
  };

  const deleteResource = async (id) => {
    try {
      await axios.delete(
        `${API_BASE}/api/profile/resources/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setResources(resources.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  // Seeking operations
  const addSeeking = async () => {
    const newSeeking = {
      title: 'New Opportunity',
      description: '',
      category: 'Partnership',
      priority: 'Medium',
      is_active: true
    };
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/seeking`,
        newSeeking,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSeeking([...seeking, res.data.seeking]);
    } catch (error) {
      console.error('Failed to add seeking:', error);
    }
  };

  const updateSeeking = async (id, updates) => {
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/seeking/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSeeking(seeking.map(s => s.id === id ? res.data.seeking : s));
    } catch (error) {
      console.error('Failed to update seeking:', error);
    }
  };

  const deleteSeeking = async (id) => {
    try {
      await axios.delete(
        `${API_BASE}/api/profile/seeking/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSeeking(seeking.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete seeking:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">{t('profile.edit')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {['projects', 'skills', 'resources', 'seeking'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Projects Tab */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  <Button onClick={addProject} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Project
                  </Button>
                  {projects.map(project => (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                      <input
                        type="text"
                        value={project.title}
                        onChange={(e) => updateProject(project.id, { title: e.target.value })}
                        className="w-full font-medium mb-2 px-2 py-1 border border-gray-300 rounded"
                      />
                      <textarea
                        value={project.description || ''}
                        onChange={(e) => updateProject(project.id, { description: e.target.value })}
                        className="w-full text-sm mb-2 px-2 py-1 border border-gray-300 rounded"
                        rows="2"
                        placeholder="Description"
                      />
                      <div className="flex items-center gap-4">
                        <select
                          value={project.status}
                          onChange={(e) => updateProject(project.id, { status: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option>In Progress</option>
                          <option>Completed</option>
                          <option>On Hold</option>
                        </select>
                        <input
                          type="number"
                          value={project.progress}
                          onChange={(e) => updateProject(project.id, { progress: parseInt(e.target.value) })}
                          min="0"
                          max="100"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-500">%</span>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="ml-auto text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <div className="space-y-4">
                  <Button onClick={addSkill} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Skill
                  </Button>
                  {skills.map(skill => (
                    <div key={skill.id} className="border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      />
                      <select
                        value={skill.level}
                        onChange={(e) => updateSkill(skill.id, { level: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Expert</option>
                      </select>
                      <button
                        onClick={() => deleteSkill(skill.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Resources Tab */}
              {activeTab === 'resources' && (
                <div className="space-y-4">
                  <Button onClick={addResource} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Resource
                  </Button>
                  {resources.map(resource => (
                    <div key={resource.id} className="border border-gray-200 rounded-lg p-4">
                      <input
                        type="text"
                        value={resource.name}
                        onChange={(e) => updateResource(resource.id, { name: e.target.value })}
                        className="w-full font-medium mb-2 px-2 py-1 border border-gray-300 rounded"
                      />
                      <button
                        onClick={() => deleteResource(resource.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Seeking Tab */}
              {activeTab === 'seeking' && (
                <div className="space-y-4">
                  <Button onClick={addSeeking} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Opportunity
                  </Button>
                  {seeking.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateSeeking(item.id, { title: e.target.value })}
                        className="w-full font-medium mb-2 px-2 py-1 border border-gray-300 rounded"
                      />
                      <button
                        onClick={() => deleteSeeking(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditDialog;
