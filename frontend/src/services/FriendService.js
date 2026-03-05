import apiClient from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'

/**
 * FriendService handles all friend-related API calls.
 */
const FriendService = {
  /** List all friends of the authenticated user. */
  listFriends: () => apiClient.get(API_ENDPOINTS.FRIENDS.LIST),

  /** Remove a friend by ID (bidirectional). */
  removeFriend: (friendId) => apiClient.delete(API_ENDPOINTS.FRIENDS.REMOVE(friendId)),

  /** Search users by name, username, or wallet address. */
  searchUsers: (query) => apiClient.get(`${API_ENDPOINTS.FRIENDS.SEARCH}?q=${encodeURIComponent(query)}`),

  /** Send a friend request by user ID. */
  sendRequest: (receiverId, message = '', source = 'search') =>
    apiClient.post(API_ENDPOINTS.FRIENDS.SEND_REQUEST, {
      receiver_id: receiverId,
      message,
      source,
    }),

  /** Send a friend request by wallet address (for NFC / QR). */
  sendRequestByWallet: (walletAddress, message = '', source = 'nfc') =>
    apiClient.post(API_ENDPOINTS.FRIENDS.SEND_REQUEST_BY_WALLET, {
      wallet_address: walletAddress,
      message,
      source,
    }),

  /** List pending friend requests (direction: 'received' | 'sent'). */
  listRequests: (direction = 'received') =>
    apiClient.get(`${API_ENDPOINTS.FRIENDS.REQUESTS}?direction=${direction}`),

  /** Accept a pending friend request. */
  acceptRequest: (requestId) =>
    apiClient.post(API_ENDPOINTS.FRIENDS.ACCEPT(requestId)),

  /** Reject a pending friend request. */
  rejectRequest: (requestId) =>
    apiClient.post(API_ENDPOINTS.FRIENDS.REJECT(requestId)),

  /** Invite a friend via email or phone. */
  inviteFriend: (inviterAddress, inviteeIdentifier, type = 'email') =>
    apiClient.post(API_ENDPOINTS.FRIENDS.INVITE, {
      inviter_address: inviterAddress,
      invitee_identifier: inviteeIdentifier,
      type,
    }),
}

export default FriendService
