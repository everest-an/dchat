import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

// Use correct backend URL with fallback
const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app';

/**
 * Profile Edit Dialog
 * 
 * Allows users to edit their profile information:
 * - Projects
 * - Skills
 * - Resources
 * - Seeking opportunities
 * - Business Info (company, job title, industry)
 * 
 * Fully integrated with backend API with demo mode fallback.
 */
const ProfileEditDialog = ({ isOpen, onClose, userId, authToken }) => {
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [resources, setResources] = useState([]);
  const [seeking, setSeeking] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({
    company_name: '',
    job_title: '',
    industry: '',
    bio: '',
    website: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'

  // Demo data storage key
  const DEMO_STORAGE_KEY = `dchat_profile_${userId || 'demo'}`;

  // Load data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  // Load demo data from localStorage
  const loadDemoData = () => {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setProjects(data.projects || []);
        setSkills(data.skills || []);
        setResources(data.resources || []);
        setSeeking(data.seeking || []);
        setBusinessInfo(data.businessInfo || {
          company_name: '',
          job_title: '',
          industry: '',
          bio: '',
          website: '',
          location: ''
        });
      }
    } catch (e) {
      console.error('Failed to load demo data:', e);
    }
  };

  // Save demo data to localStorage
  const saveDemoData = (updates = {}) => {
    try {
      const data = {
        projects: updates.projects || projects,
        skills: updates.skills || skills,
        resources: updates.resources || resources,
        seeking: updates.seeking || seeking,
        businessInfo: updates.businessInfo || businessInfo
      };
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save demo data:', e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      
      const [projectsRes, skillsRes, resourcesRes, seekingRes, businessRes] = await Promise.all([
        axios.get(`${API_BASE}/api/profile/projects`, { headers }).catch(() => null),
        axios.get(`${API_BASE}/api/profile/skills`, { headers }).catch(() => null),
        axios.get(`${API_BASE}/api/profile/resources`, { headers }).catch(() => null),
        axios.get(`${API_BASE}/api/profile/seeking`, { headers }).catch(() => null),
        axios.get(`${API_BASE}/api/profile/business`, { headers }).catch(() => null)
      ]);
      
      // Check if any request succeeded
      const anySuccess = projectsRes || skillsRes || resourcesRes || seekingRes || businessRes;
      
      if (!anySuccess) {
        // Backend unavailable, switch to demo mode
        console.warn('Backend unavailable, switching to demo mode');
        setDemoMode(true);
        loadDemoData();
      } else {
        setDemoMode(false);
        setProjects(projectsRes?.data?.projects || []);
        setSkills(skillsRes?.data?.skills || []);
        setResources(resourcesRes?.data?.resources || []);
        setSeeking(seekingRes?.data?.seeking || []);
        setBusinessInfo(businessRes?.data?.data || {
          company_name: '',
          job_title: '',
          industry: '',
          bio: '',
          website: '',
          location: ''
        });
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setDemoMode(true);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  // Project operations
  const addProject = async () => {
    const newProject = {
      id: demoMode ? Date.now() : undefined,
      title: 'New Project',
      description: '',
      status: 'In Progress',
      progress: 0
    };
    
    if (demoMode) {
      const updated = [...projects, newProject];
      setProjects(updated);
      saveDemoData({ projects: updated });
      return;
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/projects`,
        newProject,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setProjects([...projects, res.data.project]);
    } catch (error) {
      console.error('Failed to add project:', error);
      // Fallback to demo mode
      const updated = [...projects, { ...newProject, id: Date.now() }];
      setProjects(updated);
      setDemoMode(true);
      saveDemoData({ projects: updated });
    }
  };

  const updateProject = async (id, updates) => {
    if (demoMode) {
      const updated = projects.map(p => p.id === id ? { ...p, ...updates } : p);
      setProjects(updated);
      saveDemoData({ projects: updated });
      return;
    }
    
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/projects/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setProjects(projects.map(p => p.id === id ? res.data.project : p));
    } catch (error) {
      console.error('Failed to update project:', error);
      // Fallback to local update
      const updated = projects.map(p => p.id === id ? { ...p, ...updates } : p);
      setProjects(updated);
      saveDemoData({ projects: updated });
    }
  };

  const deleteProject = async (id) => {
    if (demoMode) {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      saveDemoData({ projects: updated });
      return;
    }
    
    try {
      await axios.delete(
        `${API_BASE}/api/profile/projects/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      saveDemoData({ projects: updated });
    }
  };

  // Skill operations
  const addSkill = async () => {
    const newSkill = {
      id: demoMode ? Date.now() : undefined,
      name: 'New Skill',
      category: 'Technical',
      level: 'Intermediate'
    };
    
    if (demoMode) {
      const updated = [...skills, newSkill];
      setSkills(updated);
      saveDemoData({ skills: updated });
      return;
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/skills`,
        newSkill,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSkills([...skills, res.data.skill]);
    } catch (error) {
      console.error('Failed to add skill:', error);
      const updated = [...skills, { ...newSkill, id: Date.now() }];
      setSkills(updated);
      setDemoMode(true);
      saveDemoData({ skills: updated });
    }
  };

  const updateSkill = async (id, updates) => {
    if (demoMode) {
      const updated = skills.map(s => s.id === id ? { ...s, ...updates } : s);
      setSkills(updated);
      saveDemoData({ skills: updated });
      return;
    }
    
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/skills/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSkills(skills.map(s => s.id === id ? res.data.skill : s));
    } catch (error) {
      console.error('Failed to update skill:', error);
      const updated = skills.map(s => s.id === id ? { ...s, ...updates } : s);
      setSkills(updated);
      saveDemoData({ skills: updated });
    }
  };

  const deleteSkill = async (id) => {
    if (demoMode) {
      const updated = skills.filter(s => s.id !== id);
      setSkills(updated);
      saveDemoData({ skills: updated });
      return;
    }
    
    try {
      await axios.delete(
        `${API_BASE}/api/profile/skills/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSkills(skills.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete skill:', error);
      const updated = skills.filter(s => s.id !== id);
      setSkills(updated);
      saveDemoData({ skills: updated });
    }
  };

  // Resource operations
  const addResource = async () => {
    const newResource = {
      id: demoMode ? Date.now() : undefined,
      name: 'New Resource',
      description: '',
      resource_type: 'Service',
      availability: 'Available'
    };
    
    if (demoMode) {
      const updated = [...resources, newResource];
      setResources(updated);
      saveDemoData({ resources: updated });
      return;
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/resources`,
        newResource,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setResources([...resources, res.data.resource]);
    } catch (error) {
      console.error('Failed to add resource:', error);
      const updated = [...resources, { ...newResource, id: Date.now() }];
      setResources(updated);
      setDemoMode(true);
      saveDemoData({ resources: updated });
    }
  };

  const updateResource = async (id, updates) => {
    if (demoMode) {
      const updated = resources.map(r => r.id === id ? { ...r, ...updates } : r);
      setResources(updated);
      saveDemoData({ resources: updated });
      return;
    }
    
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/resources/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setResources(resources.map(r => r.id === id ? res.data.resource : r));
    } catch (error) {
      console.error('Failed to update resource:', error);
      const updated = resources.map(r => r.id === id ? { ...r, ...updates } : r);
      setResources(updated);
      saveDemoData({ resources: updated });
    }
  };

  const deleteResource = async (id) => {
    if (demoMode) {
      const updated = resources.filter(r => r.id !== id);
      setResources(updated);
      saveDemoData({ resources: updated });
      return;
    }
    
    try {
      await axios.delete(
        `${API_BASE}/api/profile/resources/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setResources(resources.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete resource:', error);
      const updated = resources.filter(r => r.id !== id);
      setResources(updated);
      saveDemoData({ resources: updated });
    }
  };

  // Seeking operations
  const addSeeking = async () => {
    const newSeeking = {
      id: demoMode ? Date.now() : undefined,
      title: 'New Opportunity',
      description: '',
      category: 'Partnership',
      priority: 'Medium',
      is_active: true
    };
    
    if (demoMode) {
      const updated = [...seeking, newSeeking];
      setSeeking(updated);
      saveDemoData({ seeking: updated });
      return;
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/profile/seeking`,
        newSeeking,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSeeking([...seeking, res.data.seeking]);
    } catch (error) {
      console.error('Failed to add seeking:', error);
      const updated = [...seeking, { ...newSeeking, id: Date.now() }];
      setSeeking(updated);
      setDemoMode(true);
      saveDemoData({ seeking: updated });
    }
  };

  const updateSeeking = async (id, updates) => {
    if (demoMode) {
      const updated = seeking.map(s => s.id === id ? { ...s, ...updates } : s);
      setSeeking(updated);
      saveDemoData({ seeking: updated });
      return;
    }
    
    try {
      const res = await axios.put(
        `${API_BASE}/api/profile/seeking/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSeeking(seeking.map(s => s.id === id ? res.data.seeking : s));
    } catch (error) {
      console.error('Failed to update seeking:', error);
      const updated = seeking.map(s => s.id === id ? { ...s, ...updates } : s);
      setSeeking(updated);
      saveDemoData({ seeking: updated });
    }
  };

  const deleteSeeking = async (id) => {
    if (demoMode) {
      const updated = seeking.filter(s => s.id !== id);
      setSeeking(updated);
      saveDemoData({ seeking: updated });
      return;
    }
    
    try {
      await axios.delete(
        `${API_BASE}/api/profile/seeking/${id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSeeking(seeking.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete seeking:', error);
      const updated = seeking.filter(s => s.id !== id);
      setSeeking(updated);
      saveDemoData({ seeking: updated });
    }
  };

  // Business Info operations
  const updateBusinessInfo = (field, value) => {
    const updated = { ...businessInfo, [field]: value };
    setBusinessInfo(updated);
  };

  const saveBusinessInfo = async () => {
    setSaveStatus('saving');
    
    if (demoMode) {
      saveDemoData({ businessInfo });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
      return;
    }
    
    try {
      await axios.put(
        `${API_BASE}/api/profile/business`,
        businessInfo,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Failed to save business info:', error);
      // Fallback to demo mode
      saveDemoData({ businessInfo });
      setDemoMode(true);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  if (!isOpen) return null;

  const industries = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
    'Retail', 'Real Estate', 'Consulting', 'Media', 'Other'
  ];

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

        {/* Demo Mode Banner */}
        {demoMode && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Demo Mode: Changes are saved locally. Connect to backend to sync data.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {['projects', 'skills', 'resources', 'seeking', 'business'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'business' && <Building2 className="w-4 h-4" />}
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

              {/* Business Tab */}
              {activeTab === 'business' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={businessInfo.company_name}
                        onChange={(e) => updateBusinessInfo('company_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Enter company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={businessInfo.job_title}
                        onChange={(e) => updateBusinessInfo('job_title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Enter job title"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      <select
                        value={businessInfo.industry}
                        onChange={(e) => updateBusinessInfo('industry', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Select industry</option>
                        {industries.map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={businessInfo.location}
                        onChange={(e) => updateBusinessInfo('location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={businessInfo.website}
                      onChange={(e) => updateBusinessInfo('website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={businessInfo.bio}
                      onChange={(e) => updateBusinessInfo('bio', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      rows="4"
                      placeholder="Tell us about yourself and your work..."
                    />
                  </div>
                  
                  <Button 
                    onClick={saveBusinessInfo} 
                    className="w-full"
                    disabled={saveStatus === 'saving'}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : saveStatus === 'saved' ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Business Info
                      </>
                    )}
                  </Button>
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
