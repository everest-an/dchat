import { useState } from 'react'
import { Plus, Search, Filter, Calendar, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Projects = () => {
  const [activeTab, setActiveTab] = useState('current')
  const [searchQuery, setSearchQuery] = useState('')

  const projects = {
    current: [
      {
        id: 1,
        title: 'AI Data Analytics Platform',
        description: 'Developing intelligent data analysis and visualization platform for enterprise clients',
        status: 'In Progress',
        progress: 65,
        team: 8,
        budget: '$500K',
        deadline: 'March 2024',
        tags: ['AI', 'Data Analytics', 'Enterprise']
      },
      {
        id: 2,
        title: 'Blockchain Payment System',
        description: 'Ethereum-based decentralized payment solution',
        status: 'Design Phase',
        progress: 25,
        team: 5,
        budget: '$300K',
        deadline: 'May 2024',
        tags: ['Blockchain', 'Payment', 'DeFi']
      }
    ],
    seeking: [
      {
        id: 3,
        title: 'Mobile App Development Partnership',
        description: 'Seeking experienced mobile development team to collaborate on business social app',
        type: 'Technical Partnership',
        budget: 'Negotiable',
        requirements: ['React Native', 'iOS/Android', '3+ years experience'],
        tags: ['Mobile Dev', 'Social App', 'Partnership']
      },
      {
        id: 4,
        title: 'Marketing Partner',
        description: 'Looking for marketing partner with rich experience in B2B market',
        type: 'Business Partnership',
        budget: 'Revenue Share',
        requirements: ['B2B Experience', 'Client Resources', 'Marketing Skills'],
        tags: ['Marketing', 'B2B', 'Partnership']
      }
    ],
    resources: [
      {
        id: 5,
        title: 'Development Team',
        description: '10-person full-stack development team specializing in enterprise applications',
        type: 'Technical Resource',
        capacity: 'Available for 2-3 projects',
        expertise: ['React', 'Node.js', 'Blockchain', 'AI/ML'],
        tags: ['Dev Team', 'Full Stack', 'Enterprise']
      },
      {
        id: 6,
        title: 'Industry Client Network',
        description: 'Rich client resources and partnerships in fintech industry',
        type: 'Client Resource',
        capacity: '50+ enterprise clients',
        expertise: ['Fintech', 'Banking', 'Insurance', 'Investment'],
        tags: ['Client Network', 'Fintech', 'Partnerships']
      }
    ]
  }

  const tabs = [
    { id: 'current', label: 'Current Projects', count: projects.current.length },
    { id: 'seeking', label: 'Seeking Partners', count: projects.seeking.length },
    { id: 'resources', label: 'Available Resources', count: projects.resources.length }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return 'bg-green-100 text-green-800'
      case 'Design Phase': return 'bg-blue-100 text-blue-800'
      case 'Completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderCurrentProjects = () => (
    <div className="space-y-4">
      {projects.current.map((project) => (
        <div key={project.id} className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-black mb-1">{project.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{project.description}</p>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className="text-xs text-gray-500">Progress: {project.progress}%</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
          </div>

          {/* Project Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{project.team} people</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>{project.budget}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{project.deadline}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const renderSeekingProjects = () => (
    <div className="space-y-4">
      {projects.seeking.map((project) => (
        <div key={project.id} className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-black mb-1">{project.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{project.description}</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                  {project.type}
                </span>
                <span className="text-xs text-gray-500">Budget: {project.budget}</span>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Requirements:</h4>
            <ul className="space-y-1">
              {project.requirements.map((req, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const renderResources = () => (
    <div className="space-y-4">
      {projects.resources.map((resource) => (
        <div key={resource.id} className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-black mb-1">{resource.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  {resource.type}
                </span>
                <span className="text-xs text-gray-500">{resource.capacity}</span>
              </div>
            </div>
          </div>

          {/* Expertise */}
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Expertise:</h4>
            <div className="flex flex-wrap gap-2">
              {resource.expertise.map((skill, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {resource.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-black">Project Center</h1>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects or opportunities"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            />
          </div>
          <Button variant="ghost" size="icon" className="w-10 h-10">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 pb-20">
        {activeTab === 'current' && renderCurrentProjects()}
        {activeTab === 'seeking' && renderSeekingProjects()}
        {activeTab === 'resources' && renderResources()}
      </div>
    </div>
  )
}

export default Projects

