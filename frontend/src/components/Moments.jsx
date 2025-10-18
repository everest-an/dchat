import { useState } from 'react'
import { Plus, MessageCircle, Heart, Share, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Moments = () => {
  const [posts, setPosts] = useState([
    {
      id: 1,
      user: {
        name: 'Sarah Johnson',
        company: 'Acme Inc.',
        avatar: '👩‍💼'
      },
      content: 'Excited to announce that we\'ve completed the initial design phase of our new product! The team\'s hard work has paid off, looking forward to the next milestone.',
      type: 'project_update',
      timestamp: '2 hours ago',
      likes: 8,
      comments: 6,
      liked: false
    },
    {
      id: 2,
      user: {
        name: 'Mark Smith',
        company: 'Global Insights',
        avatar: '👨‍💼'
      },
      content: 'The latest industry report shows significant growth in our field over the past year. This provides great opportunities for our business expansion.',
      type: 'industry_insights',
      chart: '📊',
      timestamp: '5 hours ago',
      likes: 12,
      comments: 4,
      liked: true
    },
    {
      id: 3,
      user: {
        name: 'Lisa Wong',
        company: 'Innovate Ltd.',
        avatar: '👩‍💻'
      },
      content: 'Looking for partners in AI and machine learning. If your company has expertise in this area, please feel free to contact us!',
      type: 'networking',
      timestamp: '8 hours ago',
      likes: 9,
      comments: 2,
      liked: false
    }
  ])

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1
          }
        : post
    ))
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'project_update': return '项目更新'
      case 'industry_insights': return '行业洞察'
      case 'networking': return '商务合作'
      default: return '动态'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'project_update': return 'bg-blue-100 text-blue-800'
      case 'industry_insights': return 'bg-green-100 text-green-800'
      case 'networking': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">商务动态</h1>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 动态列表 */}
      <div className="pb-20">
        {posts.map((post) => (
          <div key={post.id} className="bg-white mb-2 px-4 py-4">
            {/* 用户信息 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl mr-3">
                  {post.user.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-black">{post.user.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(post.type)}`}>
                      {getTypeLabel(post.type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{post.user.company}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{post.timestamp}</span>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 内容 */}
            <div className="mb-4">
              <p className="text-gray-800 leading-relaxed mb-3">{post.content}</p>
              
              {/* 图表或媒体内容 */}
              {post.chart && (
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                  <div className="text-4xl">{post.chart}</div>
                </div>
              )}
            </div>

            {/* 互动按钮 */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Heart 
                    className={`w-4 h-4 ${post.liked ? 'fill-red-500 text-red-500' : ''}`} 
                  />
                  <span>{post.likes}</span>
                </button>
                
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comments}</span>
                </button>
                
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-500 transition-colors">
                  <Share className="w-4 h-4" />
                  <span>分享</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Moments

