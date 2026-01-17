import React, { useState } from 'react';
import { X, Search, User, Users, Hash, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * New Chat Dialog Component
 * Allows users to start new conversations
 */
const NewChatDialog = ({ isOpen, onClose, onStartChat, contacts = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [chatType, setChatType] = useState('direct'); // 'direct' or 'group'
  const [isCreating, setIsCreating] = useState(false);

  const chatTypes = [
    { id: 'direct', label: 'Direct Message', icon: <User className="w-4 h-4" />, description: 'One-on-one conversation' },
    { id: 'group', label: 'Group Chat', icon: <Users className="w-4 h-4" />, description: 'Chat with multiple people' }
  ];

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = async () => {
    let chatData;

    if (chatType === 'direct') {
      // Direct message
      const address = selectedContact ? selectedContact.address : manualAddress;

      if (!address || !address.trim()) {
        alert('Please select a contact or enter an address');
        return;
      }

      // Validate Ethereum address format (basic validation)
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        alert('Invalid Ethereum address format');
        return;
      }

      chatData = {
        type: 'direct',
        address: address,
        contact: selectedContact
      };
    } else {
      // Group chat - will be handled by CreateGroupDialog
      alert('Please use the Group Chat option from the menu');
      return;
    }

    setIsCreating(true);

    try {
      // Simulate API call
      // await new Promise(resolve => setTimeout(resolve, 1000));

      onStartChat(chatData);
      handleClose();
    } catch (error) {
      console.error('Failed to start chat:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedContact(null);
    setManualAddress('');
    setChatType('direct');
    setIsCreating(false);
    onClose();
  };

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setManualAddress('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">New Chat</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Chat Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Chat Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {chatTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setChatType(type.id)}
                  disabled={isCreating}
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${chatType === type.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className={`mt-0.5 ${chatType === type.id ? 'text-black' : 'text-gray-600'}`}>
                    {type.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${chatType === type.id ? 'text-black' : 'text-gray-700'
                      }`}>
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {chatType === 'direct' ? (
            <>
              {/* Search Contacts */}
              {contacts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Contacts
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isCreating}
                      placeholder="Search by name or address..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>

                  {/* Contact List */}
                  {searchQuery && (
                    <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {filteredContacts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No contacts found
                        </div>
                      ) : (
                        filteredContacts.map((contact) => (
                          <button
                            key={contact.address}
                            onClick={() => handleSelectContact(contact)}
                            disabled={isCreating}
                            className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${selectedContact?.address === contact.address ? 'bg-blue-50' : ''
                              }`}
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              {contact.avatar ? (
                                <img src={contact.avatar} alt={contact.name} className="w-full h-full rounded-full" />
                              ) : (
                                <User className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-black">{contact.name || contact.username}</div>
                              <div className="text-xs text-gray-500 truncate">{contact.address}</div>
                            </div>
                            {selectedContact?.address === contact.address && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Address Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="w-4 h-4 inline mr-1" />
                  Or Enter Address Manually
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => {
                    setManualAddress(e.target.value);
                    setSelectedContact(null);
                  }}
                  disabled={isCreating || selectedContact !== null}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter a valid Ethereum address (0x followed by 40 hexadecimal characters)
                </p>
              </div>

              {/* Selected Contact Display */}
              {selectedContact && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        {selectedContact.avatar ? (
                          <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full rounded-full" />
                        ) : (
                          <User className="w-6 h-6 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-black">{selectedContact.name || selectedContact.username}</div>
                        <div className="text-xs text-gray-600 truncate">{selectedContact.address}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedContact(null)}
                      disabled={isCreating}
                      className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Group Chat Info */
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-2">Group Chat</p>
              <p className="text-sm text-gray-600">
                Group chat functionality will be available soon. Use the "Create Group" option from the main menu.
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You can search for contacts by name or address</li>
              <li>• All messages are encrypted end-to-end</li>
              <li>• You can scan QR codes to quickly add contacts</li>
              <li>• Group chats support up to 256 participants</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handleClose}
            disabled={isCreating}
            variant="outline"
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartChat}
            disabled={
              isCreating ||
              chatType === 'group' ||
              (chatType === 'direct' && !selectedContact && !manualAddress.trim())
            }
            className="px-8 bg-black text-white hover:bg-gray-800"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Chat'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewChatDialog;
