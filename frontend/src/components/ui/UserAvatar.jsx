/**
 * UserAvatar Component
 * 统一的用户头像组件，确保整个应用中头像显示一致
 */

import { useState, useEffect } from 'react'
import { UnifiedUserService } from '../../services/UnifiedUserService'

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
  '2xl': 'w-20 h-20 text-3xl'
}

export const UserAvatar = ({ 
  address, 
  size = 'md', 
  className = '',
  showOnlineStatus = false,
  isOnline = false,
  onClick = null
}) => {
  const [userData, setUserData] = useState(() => UnifiedUserService.getUser(address))
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    // 更新用户数据
    setUserData(UnifiedUserService.getUser(address))
    setImageError(false)

    // 订阅用户数据变化
    const unsubscribe = UnifiedUserService.subscribe((updatedAddress) => {
      if (updatedAddress?.toLowerCase() === address?.toLowerCase()) {
        setUserData(UnifiedUserService.getUser(address))
        setImageError(false)
      }
    })

    return unsubscribe
  }, [address])

  const sizeClass = sizeClasses[size] || sizeClasses.md
  const isImage = userData.avatarType === 'ipfs' && !imageError

  const handleImageError = () => {
    setImageError(true)
  }

  const baseClasses = `
    ${sizeClass}
    rounded-full
    flex items-center justify-center
    flex-shrink-0
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.trim()

  return (
    <div className="relative inline-block">
      {isImage ? (
        <img
          src={userData.avatar}
          alt={userData.displayName}
          className={`${baseClasses} object-cover`}
          onError={handleImageError}
          onClick={onClick}
        />
      ) : (
        <div
          className={`${baseClasses} bg-gray-100 dark:bg-gray-800`}
          onClick={onClick}
        >
          {userData.avatar}
        </div>
      )}
      
      {showOnlineStatus && (
        <span
          className={`
            absolute bottom-0 right-0
            w-3 h-3 rounded-full border-2 border-white dark:border-gray-900
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      )}
    </div>
  )
}

/**
 * UserInfo Component
 * 显示用户头像和名称的组合组件
 */
export const UserInfo = ({
  address,
  size = 'md',
  showAddress = false,
  showBio = false,
  className = '',
  avatarClassName = '',
  onClick = null
}) => {
  const [userData, setUserData] = useState(() => UnifiedUserService.getUser(address))

  useEffect(() => {
    setUserData(UnifiedUserService.getUser(address))

    const unsubscribe = UnifiedUserService.subscribe((updatedAddress) => {
      if (updatedAddress?.toLowerCase() === address?.toLowerCase()) {
        setUserData(UnifiedUserService.getUser(address))
      }
    })

    return unsubscribe
  }, [address])

  const textSizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  }[size] || 'text-base'

  return (
    <div 
      className={`flex items-center gap-3 ${className}`}
      onClick={onClick}
    >
      <UserAvatar 
        address={address} 
        size={size} 
        className={avatarClassName}
      />
      <div className="min-w-0 flex-1">
        <p className={`font-medium truncate ${textSizeClass}`}>
          {userData.displayName}
        </p>
        {showAddress && address && (
          <p className="text-xs text-gray-500 truncate">
            {`${address.slice(0, 6)}...${address.slice(-4)}`}
          </p>
        )}
        {showBio && userData.bio && (
          <p className="text-sm text-gray-500 truncate">
            {userData.bio}
          </p>
        )}
      </div>
    </div>
  )
}

export default UserAvatar
