// Responsive Container Component
// Provides optimal viewing experience on both mobile and desktop
// Mobile: Full width, comfortable for touch
// Tablet: 640px max width with side padding
// Desktop: 480px max width (mobile-like), centered with generous side margins
// Large Desktop: 560px max width, centered

const ResponsiveContainer = ({ children, className = '' }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      {/* 
        Responsive width breakpoints:
        - Mobile (< 640px): Full width (100%)
        - Tablet (640px - 1024px): Max 640px
        - Desktop (1024px - 1536px): Max 480px (mobile-like)
        - Large Desktop (> 1536px): Max 560px
      */}
      <div className={`
        w-full 
        sm:max-w-[640px] 
        lg:max-w-[480px] 
        xl:max-w-[520px] 
        2xl:max-w-[560px] 
        min-h-screen 
        bg-white 
        lg:shadow-2xl 
        lg:my-0
        ${className}
      `}>
        {children}
      </div>
    </div>
  )
}

export default ResponsiveContainer

