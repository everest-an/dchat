/**
 * LinkedIn OAuth Callback Page
 * Handles the OAuth redirect and communicates with parent window
 */

import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

const LinkedInCallback = () => {
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing LinkedIn authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        throw new Error(errorDescription || error);
      }

      // Validate parameters
      if (!code || !state) {
        throw new Error('Missing required OAuth parameters');
      }

      setMessage('Exchanging authorization code...');

      // The backend callback route will handle the token exchange
      // and store the session. We just need to notify the parent window.
      
      // In a real implementation, you might want to fetch the profile here
      // For now, we'll send a success message
      
      if (window.opener) {
        window.opener.postMessage({
          type: 'LINKEDIN_AUTH_SUCCESS',
          profile: {
            // Profile will be fetched by the parent window
            authenticated: true
          }
        }, window.location.origin);

        setStatus('success');
        setMessage('Authentication successful! You can close this window.');

        // Auto-close after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // If no opener, redirect to app
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        setTimeout(() => {
          window.location.href = '/app/settings';
        }, 2000);
      }
    } catch (error) {
      console.error('LinkedIn callback error:', error);
      
      setStatus('error');
      setMessage(error.message || 'Authentication failed');

      if (window.opener) {
        window.opener.postMessage({
          type: 'LINKEDIN_AUTH_ERROR',
          error: error.message
        }, window.location.origin);

        // Auto-close after 3 seconds
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing...
              </h2>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Success!
              </h2>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Error
              </h2>
            </>
          )}

          <p className="text-gray-600">{message}</p>

          {status === 'error' && (
            <button
              onClick={() => window.close()}
              className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Close Window
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkedInCallback;
