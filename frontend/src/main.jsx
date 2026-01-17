import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('🔴 Global Error:', event.error);
  console.error('Message:', event.message);
  console.error('Filename:', event.filename);
  console.error('Line:', event.lineno, 'Column:', event.colno);
  console.error('Stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled Promise Rejection:', event.reason);
  console.error('Promise:', event.promise);
});

console.log('✅ main.jsx loaded');

try {
  console.log('🔄 Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  console.log('✅ React root created');
  
  console.log('🔄 Rendering App...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ App rendered');
} catch (error) {
  console.error('🔴 Fatal Error in main.jsx:', error);
  console.error('Stack:', error.stack);
  
  // 显示错误信息在页面上
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; font-family: monospace;">
      <h1 style="color: red;">Application Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
    </div>
  `;
}
