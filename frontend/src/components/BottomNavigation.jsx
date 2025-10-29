import { useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, Briefcase, Target, Wallet, User } from 'lucide-react'

const BottomNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageCircle,
      path: '/'
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: Briefcase,
      path: '/portfolio'
    },
    {
      id: 'matching',
      label: 'Matching',
      icon: Target,
      path: '/matching'
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: Wallet,
      path: '/payments'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile'
    }
  ]

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-2 safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.path)
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1"
            >
              <Icon 
                className={`w-6 h-6 mb-1 ${
                  active ? 'text-black' : 'text-gray-400'
                }`}
                strokeWidth={active ? 2 : 1.5}
              />
              <span 
                className={`text-xs ${
                  active ? 'text-black font-medium' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* iOS风格的home indicator */}
      <div className="flex justify-center pt-2">
        <div className="w-32 h-1 bg-black rounded-full opacity-30"></div>
      </div>
    </div>
  )
}

export default BottomNavigation

