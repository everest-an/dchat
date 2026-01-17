import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 启用Fast Refresh
      fastRefresh: true,
      // Babel配置
      babel: {
        plugins: [
          // 移除console.log（生产环境）
          process.env.NODE_ENV === 'production' && 'transform-remove-console'
        ].filter(Boolean)
      }
    })
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  // 构建优化
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 生成sourcemap（开发环境）
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // 代码分割策略
    rollupOptions: {
      output: {
        // 手动分块
        manualChunks: {
          // React核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Web3相关库
          'web3-vendor': ['ethers', 'web3'],
          
          // UI组件库
          'ui-vendor': ['lucide-react'],
          
          // 工具库
          'utils': [
            './src/utils/errorHandler.js',
            './src/utils/apiClient.js'
          ]
        },
        
        // 资源文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除console
        drop_console: process.env.NODE_ENV === 'production',
        // 移除debugger
        drop_debugger: true,
        // 移除无用代码
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    
    // chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    
    // 启用CSS代码分割
    cssCodeSplit: true,
    
    // 资源内联限制（小于4kb的资源会被内联为base64）
    assetsInlineLimit: 4096
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    open: true,
    
    // 代理配置
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    
    // HMR配置
    hmr: {
      overlay: true
    }
  },
  
  // 预览服务器配置
  preview: {
    port: 4173,
    host: true
  },
  
  // 依赖优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'ethers',
      'lucide-react'
    ],
    exclude: []
  },
  
  // 性能优化
  esbuild: {
    // 移除所有debugger和console（生产环境）
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
})
