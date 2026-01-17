/**
 * LinkedIn Integration Component
 * Handles LinkedIn OAuth connection and features
 */

import React, { useState, useEffect } from 'react';
import { Linkedin, UserPlus, Share2, LogOut, CheckCircle, XCircle, Loader } from 'lucide-react';
import LinkedInService from '../services/LinkedInService';

const LinkedInIntegration = () => {
  const [status, setStatus] = useState({ connected: false, loading: true });
  const [profile, setProfile] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const statusData = await LinkedInService.getStatus();
      setStatus({ ...statusData, loading: false });
      
      if (statusData.connected && statusData.profile) {
        setProfile(statusData.profile);
      }
    } catch (error) {
      console.error('Error checking LinkedIn status:', error);
      setStatus({ connected: false, loading: false });
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const result = await LinkedInService.initiateAuth();
      
      if (result.success) {
        setProfile(result.profile);
        setStatus({ connected: true, loading: false });
      }
    } catch (error) {
      console.error('LinkedIn connection error:', error);
      setError(error.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      setError(null);
      await LinkedInService.disconnect();
      setProfile(null);
      setConnections([]);
      setStatus({ connected: false, loading: false });
    } catch (error) {
      console.error('LinkedIn disconnect error:', error);
      setError(error.message);
    }
  };

  const handleLoadConnections = async () => {
    try {
      setError(null);
      setLoadingConnections(true);
      const connectionsData = await LinkedInService.getConnections();
      setConnections(connectionsData);
    } catch (error) {
      console.error('Error loading connections:', error);
      setError(error.message);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleImportConnections = () => {
    try {
      const imported = LinkedInService.importConnectionsToContacts(connections);
      
      // TODO: Save imported contacts to app state/database
      console.log('Imported contacts:', imported);
      
      alert(`Successfully imported ${imported.length} contacts from LinkedIn!`);
    } catch (error) {
      console.error('Error importing connections:', error);
      setError(error.message);
    }
  };

  if (status.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading LinkedIn status...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Linkedin className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">LinkedIn Integration</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Connect your LinkedIn account to import contacts and share content
                </p>
              </div>
            </div>
            {status.connected ? (
              <CheckCircle className="w-8 h-8 text-green-300" />
            ) : (
              <XCircle className="w-8 h-8 text-gray-300" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {!status.connected ? (
            // Not Connected State
            <div className="text-center py-8">
              <Linkedin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Connect Your LinkedIn Account
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Link your LinkedIn account to access your professional network,
                import contacts, and share content directly from Dchat.
              </p>
              
              <button
                onClick={handleConnect}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
                <span>Connect LinkedIn</span>
              </button>

              {/* Features List */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <UserPlus className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-1">Import Contacts</h4>
                  <p className="text-sm text-gray-600">
                    Bring your LinkedIn connections into Dchat
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Share2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-1">Share Content</h4>
                  <p className="text-sm text-gray-600">
                    Post updates to LinkedIn from Dchat
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-1">Sync Profile</h4>
                  <p className="text-sm text-gray-600">
                    Keep your professional info up to date
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Connected State
            <div>
              {/* Profile Section */}
              {profile && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {profile.picture && (
                        <img
                          src={profile.picture}
                          alt={profile.name}
                          className="w-16 h-16 rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {profile.name}
                        </h3>
                        <p className="text-gray-600">{profile.email}</p>
                        <div className="flex items-center mt-1">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600">Connected</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="text-red-600 hover:text-red-700 px-4 py-2 rounded-lg border border-red-300 hover:border-red-400 inline-flex items-center space-x-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={handleLoadConnections}
                  disabled={loadingConnections}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-colors"
                >
                  {loadingConnections ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Load Connections</span>
                    </>
                  )}
                </button>

                {connections.length > 0 && (
                  <button
                    onClick={handleImportConnections}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center space-x-2 transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Import {connections.length} Contacts</span>
                  </button>
                )}
              </div>

              {/* Connections List */}
              {connections.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    LinkedIn Connections ({connections.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    {connections.map((conn, index) => (
                      <div
                        key={conn.id || index}
                        className="flex items-center space-x-3 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        {conn.profilePicture ? (
                          <img
                            src={conn.profilePicture}
                            alt={`${conn.firstName} ${conn.lastName}`}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {conn.firstName?.[0]}{conn.lastName?.[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {conn.firstName} {conn.lastName}
                          </div>
                          {conn.headline && (
                            <div className="text-sm text-gray-600">{conn.headline}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkedInIntegration;
