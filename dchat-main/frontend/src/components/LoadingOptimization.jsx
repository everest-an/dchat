/**
 * 加载优化组件
 * 提供骨架屏、懒加载、虚拟滚动等性能优化功能
 */

import React, { Suspense, lazy } from 'react'

/**
 * 骨架屏组件
 */
export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i)
  
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="animate-pulse bg-gray-200 rounded-lg p-4 mb-4">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        )
      
      case 'list':
        return (
          <div className="animate-pulse flex items-center space-x-4 mb-4">
            <div className="rounded-full bg-gray-300 h-12 w-12"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className="animate-pulse space-y-2 mb-4">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            <div className="h-4 bg-gray-300 rounded w-4/6"></div>
          </div>
        )
      
      case 'avatar':
        return (
          <div className="animate-pulse">
            <div className="rounded-full bg-gray-300 h-16 w-16"></div>
          </div>
        )
      
      default:
        return (
          <div className="animate-pulse bg-gray-200 rounded h-32 w-full"></div>
        )
    }
  }
  
  return (
    <div className="skeleton-loader">
      {skeletons.map(i => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  )
}

/**
 * 懒加载图片组件
 */
export const LazyImage = ({ src, alt, className, placeholder }) => {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [isInView, setIsInView] = React.useState(false)
  const imgRef = React.useRef(null)
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px'
      }
    )
    
    if (imgRef.current) {
      observer.observe(imgRef.current)
    }
    
    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [])
  
  return (
    <div ref={imgRef} className={`lazy-image-container ${className}`}>
      {!isLoaded && (
        <div className="lazy-image-placeholder">
          {placeholder || <SkeletonLoader type="avatar" />}
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setIsLoaded(true)}
          style={{ display: isLoaded ? 'block' : 'none' }}
        />
      )}
    </div>
  )
}

/**
 * 虚拟滚动列表组件
 */
export const VirtualList = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3
}) => {
  const [scrollTop, setScrollTop] = React.useState(0)
  const containerRef = React.useRef(null)
  
  // 计算可见范围
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )
  
  // 可见项
  const visibleItems = items.slice(startIndex, endIndex + 1)
  
  // 偏移量
  const offsetY = startIndex * itemHeight
  
  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop)
  }
  
  return (
    <div
      ref={containerRef}
      className="virtual-list-container"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-list-spacer"
        style={{ height: items.length * itemHeight }}
      >
        <div
          className="virtual-list-content"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              className="virtual-list-item"
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 路由懒加载高阶组件
 */
export const lazyLoad = (importFunc) => {
  const LazyComponent = lazy(importFunc)
  
  return (props) => (
    <Suspense fallback={<SkeletonLoader type="card" count={3} />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

/**
 * 防抖Hook
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

/**
 * 节流Hook
 */
export const useThrottle = (value, limit = 500) => {
  const [throttledValue, setThrottledValue] = React.useState(value)
  const lastRan = React.useRef(Date.now())
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, limit - (Date.now() - lastRan.current))
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])
  
  return throttledValue
}

/**
 * 无限滚动Hook
 */
export const useInfiniteScroll = (callback, options = {}) => {
  const {
    threshold = 0.8,
    rootMargin = '0px',
    enabled = true
  } = options
  
  const observerRef = React.useRef(null)
  const targetRef = React.useRef(null)
  
  React.useEffect(() => {
    if (!enabled) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback()
        }
      },
      {
        threshold,
        rootMargin
      }
    )
    
    if (targetRef.current) {
      observer.observe(targetRef.current)
    }
    
    observerRef.current = observer
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback, threshold, rootMargin, enabled])
  
  return targetRef
}

/**
 * 性能监控Hook
 */
export const usePerformance = (componentName) => {
  React.useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      if (renderTime > 16) { // 超过一帧的时间（60fps）
        console.warn(
          `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms`
        )
      }
    }
  })
}

export default {
  SkeletonLoader,
  LazyImage,
  VirtualList,
  lazyLoad,
  useDebounce,
  useThrottle,
  useInfiniteScroll,
  usePerformance
}
