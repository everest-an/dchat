# dChat Go Backend API

This document outlines the API endpoints for the dChat Go backend. All endpoints are prefixed with `/api`.

## Authentication

Authentication is handled via Web3 wallet signatures. The flow is as follows:

1.  The client requests a unique, single-use nonce from the server.
2.  The client asks the user to sign this nonce with their wallet.
3.  The client sends the wallet address, signature, and nonce back to the server.
4.  The server verifies the signature, and if valid, returns a JSON Web Token (JWT).
5.  This JWT must be included in the `Authorization` header for all subsequent authenticated requests as `Bearer <token>`.

### `POST /auth/nonce`

Request a nonce for wallet authentication.

**Request Body:**

```json
{
  "wallet_address": "0x..."
}
```

**Response:**

```json
{
  "nonce": "a1b2c3d4...",
  "message": "Sign this message to authenticate with dChat: a1b2c3d4..."
}
```

### `POST /auth/wallet-login`

Log in with a signed nonce.

**Request Body:**

```json
{
  "wallet_address": "0x...",
  "signature": "0x...",
  "nonce": "a1b2c3d4..."
}
```

**Response (Success):**

```json
{
  "token": "ey...",
  "user": {
    "id": 1,
    "wallet_address": "0x...",
    "name": "New User",
    "username": "user123",
    "created_at": "...",
    "updated_at": "..."
  },
  "is_new_user": true
}
```

**Response (Error):**

```json
{
  "error": "invalid wallet signature",
  "code": 1002
}
```

## User

### `GET /user/me`

Get the profile of the currently authenticated user.

**Authentication:** Required (Bearer Token)

**Response:**

```json
{
  "id": 1,
  "wallet_address": "0x...",
  "name": "Alice",
  "username": "alice",
  "created_at": "...",
  "updated_at": "..."
}
```

## Messaging

### `POST /messages`

Send a message to another user.

**Authentication:** Required (Bearer Token)

**Request Body:**

```json
{
  "receiver_id": 2,
  "content": "Hello, Bob!",
  "encrypted": false
}
```

**Response:**

```json
{
  "id": 101,
  "sender_id": 1,
  "receiver_id": 2,
  "content": "Hello, Bob!",
  "encrypted": false,
  "read": false,
  "created_at": "...",
  "sender": { ... },
  "receiver": { ... }
}
```

### `GET /messages/:user_id`

Retrieve the message history with a specific user.

**Authentication:** Required (Bearer Token)

**URL Parameters:**

*   `:user_id` (uint): The ID of the other user in the conversation.

**Query Parameters:**

*   `page` (int, optional, default: 1): The page number for pagination.
*   `page_size` (int, optional, default: 50, max: 100): The number of messages per page.

**Response:**

```json
{
  "items": [
    {
      "id": 101,
      "content": "Hello, Bob!",
      ...
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50
}
```

### `GET /conversations`

Get a list of all conversations for the current user, including the last message and unread count.

**Authentication:** Required (Bearer Token)

**Response:**

```json
[
  {
    "user_id": 2,
    "name": "Bob",
    "username": "bob",
    "last_message": "See you then!",
    "timestamp": "...",
    "unread": 1
  }
]
```

### `PUT /messages/read/:sender_id`

Mark all messages from a specific sender as read.

**Authentication:** Required (Bearer Token)

**URL Parameters:**

*   `:sender_id` (uint): The ID of the user whose messages should be marked as read.

**Response:**

```json
{
  "message": "messages marked as read"
}
```

## WebSocket

### `GET /ws`

Upgrade the HTTP connection to a WebSocket for real-time communication. The JWT token must be passed as a query parameter.

**Query Parameters:**

*   `token` (string, required): The authentication JWT.

Once connected, the WebSocket can be used to send and receive messages in real-time. Messages are sent as JSON objects.

**Example Outgoing Message (Client to Server):**

```json
{
  "type": "private_message",
  "payload": {
    "receiver_id": 2,
    "content": "This is a real-time message!"
  }
}
```

**Example Incoming Message (Server to Client):**

```json
{
  "type": "new_message",
  "payload": {
    "id": 102,
    "sender_id": 2,
    "receiver_id": 1,
    "content": "Got it!",
    ...
  }
}
```
