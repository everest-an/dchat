/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Features:
 * - Catches rendering errors
 * - Logs errors to console and monitoring service
 * - Shows user-friendly error message
 * - Provides recovery options
 * - Prevents entire app from crashing
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * Author: Manus AI
 * Date: 2024-11-13
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
    
    // Log to monitoring service (e.g., Sentry, LogRocket)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error, errorInfo) {
    // TODO: Send error to monitoring service
    // Example with Sentry:
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack
    //       }
    //     }
    //   });
    // }
    
    // For now, just log to console
    console.log('Error logged:', {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  handleReset = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Optionally reload the page
    // window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      const { error, errorInfo, errorCount } = this.state;
      const { fallback } = this.props;
      
      // If custom fallback provided, use it
      if (fallback) {
        return fallback({ error, errorInfo, reset: this.handleReset });
      }
      
      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <svg
                style={styles.icon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h1 style={styles.title}>Oops! Something went wrong</h1>
            
            <p style={styles.message}>
              We're sorry, but something unexpected happened. 
              Don't worry, your data is safe.
            </p>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development Only)</summary>
                <div style={styles.errorDetails}>
                  <p style={styles.errorMessage}>{error.toString()}</p>
                  {errorInfo && (
                    <pre style={styles.errorStack}>
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
            
            <div style={styles.actions}>
              <button
                onClick={this.handleReset}
                style={styles.buttonPrimary}
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                style={styles.buttonSecondary}
              >
                Reload Page
              </button>
            </div>
            
            {errorCount > 2 && (
              <p style={styles.warning}>
                ⚠️ This error has occurred {errorCount} times. 
                Please contact support if the problem persists.
              </p>
            )}
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '20px'
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    textAlign: 'center'
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  icon: {
    width: '64px',
    height: '64px',
    color: '#f59e0b'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '12px'
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  details: {
    textAlign: 'left',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fbbf24'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '12px'
  },
  errorDetails: {
    marginTop: '12px'
  },
  errorMessage: {
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: '8px',
    fontSize: '14px'
  },
  errorStack: {
    fontSize: '12px',
    color: '#374151',
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  buttonPrimary: {
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#4338ca'
    }
  },
  buttonSecondary: {
    padding: '12px 24px',
    backgroundColor: 'white',
    color: '#4f46e5',
    border: '2px solid #4f46e5',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  warning: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #fecaca'
  }
};

export default ErrorBoundary;
