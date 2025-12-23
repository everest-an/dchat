import React, { useState, useEffect } from 'react';
import { X, Briefcase, Users, DollarSign, Calendar, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Edit Project Dialog Component
 * Allows users to edit existing projects
 */
const EditProjectDialog = ({ isOpen, onClose, onUpdate, project }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'current',
    projectType: 'technical',
    budget: '',
    budgetType: 'fixed',
    deadline: '',
    teamSize: '',
    status: 'Planning',
    progress: 0,
    requirements: [''],
    expertise: [''],
    tags: ['']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        category: project.category || 'current',
        projectType: project.projectType || 'technical',
        budget: project.budget || '',
        budgetType: project.budgetType || 'fixed',
        deadline: project.deadline || '',
        teamSize: project.teamSize || project.team || '',
        status: project.status || 'Planning',
        progress: project.progress || 0,
        requirements: project.requirements || [''],
        expertise: project.expertise || [''],
        tags: project.tags || ['']
      });
    }
  }, [project]);

  const projectTypes = [
    { value: 'technical', label: 'Technical Project', icon: <Briefcase className="w-4 h-4" /> },
    { value: 'business', label: 'Business Project', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'partnership', label: 'Partnership', icon: <Users className="w-4 h-4" /> },
    { value: 'resource', label: 'Resource Offering', icon: <Tag className="w-4 h-4" /> }
  ];

  const budgetTypes = [
    { value: 'fixed', label: 'Fixed Price' },
    { value: 'hourly', label: 'Hourly Rate' },
    { value: 'revenue_share', label: 'Revenue Share' },
    { value: 'negotiable', label: 'Negotiable' }
  ];

  const statusOptions = [
    'Planning',
    'In Progress',
    'Design Phase',
    'Development',
    'Testing',
    'Completed',
    'On Hold'
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    if (formData[field].length > 1) {
      const newArray = formData[field].filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, [field]: newArray }));
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      alert('Please enter a project title');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please enter a project description');
      return;
    }

    setIsSubmitting(true);

    try {
      // Filter out empty items from arrays
      const cleanedData = {
        ...formData,
        requirements: formData.requirements.filter(r => r.trim()),
        expertise: formData.expertise.filter(e => e.trim()),
        tags: formData.tags.filter(t => t.trim())
      };

      // Create updated project object
      const updatedProject = {
        ...project,
        ...cleanedData,
        updatedAt: new Date().toISOString()
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onUpdate(updatedProject);
      handleClose();
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Edit Project</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Project Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {projectTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleChange('projectType', type.value)}
                  disabled={isSubmitting}
                  className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                    formData.projectType === type.value
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={formData.projectType === type.value ? 'text-black' : 'text-gray-600'}>
                    {type.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    formData.projectType === type.value ? 'text-black' : 'text-gray-700'
                  }`}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., AI-Powered Analytics Platform"
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isSubmitting}
              placeholder="Describe your project, goals, and what you're looking for..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
            <div className="text-sm text-gray-500 mt-1">
              {formData.description.length}/1000 characters
            </div>
          </div>

          {/* Status and Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress: {formData.progress}%
              </label>
              <input
                type="range"
                value={formData.progress}
                onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                disabled={isSubmitting}
                min="0"
                max="100"
                step="5"
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget
              </label>
              <input
                type="text"
                value={formData.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., $50,000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Type
              </label>
              <select
                value={formData.budgetType}
                onChange={(e) => handleChange('budgetType', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {budgetTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline and Team Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Team Size
              </label>
              <input
                type="number"
                value={formData.teamSize}
                onChange={(e) => handleChange('teamSize', e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., 5"
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements
            </label>
            {formData.requirements.map((req, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={req}
                  onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., 3+ years experience in React"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                {formData.requirements.length > 1 && (
                  <button
                    onClick={() => removeArrayItem('requirements', index)}
                    disabled={isSubmitting}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addArrayItem('requirements')}
              disabled={isSubmitting}
              className="text-sm text-black hover:underline"
            >
              + Add Requirement
            </button>
          </div>

          {/* Expertise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expertise Needed
            </label>
            {formData.expertise.map((exp, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={exp}
                  onChange={(e) => handleArrayChange('expertise', index, e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., Blockchain Development"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                {formData.expertise.length > 1 && (
                  <button
                    onClick={() => removeArrayItem('expertise', index)}
                    disabled={isSubmitting}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addArrayItem('expertise')}
              disabled={isSubmitting}
              className="text-sm text-black hover:underline"
            >
              + Add Expertise
            </button>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            {formData.tags.map((tag, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., AI, Machine Learning"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                {formData.tags.length > 1 && (
                  <button
                    onClick={() => removeArrayItem('tags', index)}
                    disabled={isSubmitting}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addArrayItem('tags')}
              disabled={isSubmitting}
              className="text-sm text-black hover:underline"
            >
              + Add Tag
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            variant="outline"
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
            className="px-8 bg-black text-white hover:bg-gray-800"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Project'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProjectDialog;
