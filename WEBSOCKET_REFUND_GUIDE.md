# WebSocket Real-time Notifications & Automatic Refund Processing

**Version:** 1.0  
**Date:** November 16, 2024  
**Status:** Implementation Complete

---

## Overview

This document describes the WebSocket real-time notification system and automatic refund processing features for the Dchat backend. These features enable:

- **Real-time Notifications:** Instant updates on red packet claims, transaction status, and system alerts
- **Automatic Refund Processing:** Scheduled processing of expired and cancelled red packets with automatic refunds

---

## Architecture

### Components

| Component | Purpose | File |
| :--- | :--- | :--- |
| **WebSocket Notifications** | Real-time message delivery | `src/routes/websocket_notifications.py` |
| **Refund Processor** | Automatic refund handling | `src/routes/refund_processor.py` |
| **Admin Routes** | Management and monitoring | `src/routes/admin.py` |

### Technology Stack

- **WebSocket:** FastAPI WebSocket support
- **Connection Management:** In-memory connection tracking
- **Async Processing:** Python asyncio for non-blocking operations
- **Database:** PostgreSQL with SQLAlchemy ORM

---

## WebSocket Notifications

### Connection Establishment

**Endpoint:** `GET /api/ws/notifications/{token}`

**Parameters:**
- `token` (path): JWT authentication token
- `query` (query): Optional notification type filters (comma-separated)

**Example Connection:**
```javascript
// JavaScript client
const token = 'your_jwt_token';
const ws = new WebSocket(
  `ws://localhost:8000/api/ws/notifications/${token}?query=red_packet_claimed,transaction_finalized`
);

ws.onopen = () => {
  console.log('Connected to notification service');
};

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Received notification:', notification);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from notification service');
};
```

### Notification Types

| Type | Trigger | Use Case |
| :--- | :--- | :--- |
| `red_packet_created` | New red packet created | Show in user's sent packets |
| `red_packet_claimed` | User claims a red packet | Notify sender and claimer |
| `red_packet_completed` | All packets claimed | Archive red packet |
| `red_packet_expired` | 24 hours passed | Trigger refund |
| `red_packet_cancelled` | Sender cancels packet | Trigger refund |
| `transaction_pending` | Transaction submitted | Show pending status |
| `transaction_confirmed` | Transaction in block | Show confirmed status |
| `transaction_finalized` | Transaction finalized | Mark as complete |
| `transaction_failed` | Transaction failed | Show error and retry |
| `payment_received` | Payment received | Notify recipient |
| `system_alert` | System event | Show alert to users |

### Message Format

**Received Messages (from client):**

```json
{
  "type": "subscribe" | "unsubscribe" | "ping",
  "data": {
    "types": ["red_packet_claimed", "transaction_finalized"]
  }
}
```

**Sent Messages (to client):**

```json
{
  "type": "red_packet_claimed",
  "timestamp": "2024-11-16T07:30:00Z",
  "data": {
    "packet_id": "550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 1,
    "recipient_id": 2,
    "claim_amount": 1000000000000,
    "remaining_packets": 4
  }
}
```

### Client Implementation Example

```python
# Python client using websockets library
import asyncio
import json
import websockets

async def connect_to_notifications(token):
    uri = f"ws://localhost:8000/api/ws/notifications/{token}"
    
    async with websockets.connect(uri) as websocket:
        # Subscribe to specific notification types
        subscribe_msg = {
            "type": "subscribe",
            "data": {
                "types": ["red_packet_claimed", "transaction_finalized"]
            }
        }
        await websocket.send(json.dumps(subscribe_msg))
        
        # Listen for notifications
        while True:
            notification = await websocket.recv()
            data = json.loads(notification)
            print(f"Received: {data['type']}")
            
            if data['type'] == 'red_packet_claimed':
                print(f"Packet {data['data']['packet_id']} claimed!")
            
            elif data['type'] == 'transaction_finalized':
                print(f"Transaction {data['data']['transaction_hash']} finalized!")

# Run the client
asyncio.run(connect_to_notifications('your_jwt_token'))
```

### Ping/Pong for Keep-Alive

To keep the connection alive, send periodic ping messages:

```json
{
  "type": "ping"
}
```

Expected response:
```json
{
  "type": "pong",
  "timestamp": "2024-11-16T07:30:00Z"
}
```

---

## Automatic Refund Processing

### Overview

The refund processor automatically handles:
1. **Expired Packets:** Refunds unclaimed amounts after 24 hours
2. **Cancelled Packets:** Refunds all amounts when sender cancels
3. **Failed Transactions:** Handles blockchain transaction failures

### Processing Flow

```
┌─────────────────────────────────────┐
│  Scheduled Refund Processing        │
│  (Every 1 hour by default)          │
└────────────┬────────────────────────┘
             │
             ├─→ Check Expired Packets
             │   └─→ Calculate Refund Amount
             │   └─→ Create Refund Record
             │   └─→ Update Packet Status
             │
             ├─→ Check Cancelled Packets
             │   └─→ Calculate Refund Amount
             │   └─→ Create Refund Record
             │   └─→ Update Packet Status
             │
             └─→ Check Failed Transactions
                 └─→ Handle Blockchain Failures
```

### Refund Calculation

**For Expired Packets:**
```
Refund Amount = Total Amount - Claimed Amount
```

**For Cancelled Packets:**
```
Refund Amount = Total Amount - Claimed Amount
```

**Example:**
- Total Amount: 10 DOT
- Claimed: 3 DOT (by 3 users)
- Refund: 7 DOT (returned to sender)

### API Endpoints

#### Get Pending Refunds

**Endpoint:** `GET /api/admin/refunds/pending`

**Authentication:** Required (Admin)

**Query Parameters:**
- `limit` (optional): Maximum number of refunds to return (default: 100)

**Response:**
```json
{
  "success": true,
  "pending_count": 5,
  "total_amount": 50000000000000,
  "refunds": [
    {
      "packet_id": "550e8400-e29b-41d4-a716-446655440000",
      "sender_id": 1,
      "sender_address": "1ABC...",
      "refund_amount": 5000000000000,
      "reason": "expired",
      "created_at": "2024-11-16T07:10:00Z",
      "expires_at": "2024-11-17T07:10:00Z"
    }
  ],
  "timestamp": "2024-11-16T07:30:00Z"
}
```

#### Get Refund Status

**Endpoint:** `GET /api/admin/refunds/{packet_id}`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "packet_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "refunded",
  "refund_amount": 5000000000000,
  "claimed_amount": 5000000000000,
  "total_amount": 10000000000000,
  "refund_record": {
    "packet_id": "550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 1,
    "sender_address": "1ABC...",
    "refund_amount": 5000000000000,
    "reason": "expired",
    "status": "pending",
    "created_at": "2024-11-16T07:10:00Z",
    "processed_at": "2024-11-16T07:30:00Z"
  }
}
```

#### Trigger Refund Processing

**Endpoint:** `POST /api/admin/refunds/process`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "results": {
    "expired_packets": {
      "success": true,
      "packet_count": 3,
      "total_refunded": 15000000000000,
      "timestamp": "2024-11-16T07:30:00Z"
    },
    "cancelled_packets": {
      "success": true,
      "packet_count": 2,
      "total_refunded": 10000000000000,
      "timestamp": "2024-11-16T07:30:00Z"
    },
    "failed_transactions": {
      "success": true,
      "transaction_count": 0,
      "total_refunded": 0,
      "timestamp": "2024-11-16T07:30:00Z"
    }
  },
  "timestamp": "2024-11-16T07:30:00Z"
}
```

#### Get Refund History

**Endpoint:** `GET /api/admin/refunds/history`

**Authentication:** Required (Admin)

**Query Parameters:**
- `limit` (optional): Maximum number of records (default: 100)

**Response:**
```json
{
  "success": true,
  "total_records": 10,
  "total_refunded": 100000000000000,
  "history": [
    {
      "packet_id": "550e8400-e29b-41d4-a716-446655440000",
      "sender_id": 1,
      "sender_address": "1ABC...",
      "refund_amount": 5000000000000,
      "reason": "expired",
      "status": "completed",
      "created_at": "2024-11-16T07:10:00Z",
      "processed_at": "2024-11-16T07:30:00Z"
    }
  ],
  "timestamp": "2024-11-16T07:30:00Z"
}
```

#### Get Processor Status

**Endpoint:** `GET /api/admin/refunds/processor-status`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "processor_status": {
    "processing": false,
    "last_run": "2024-11-16T07:30:00Z",
    "refund_count": 25,
    "total_refunded": 250000000000000
  },
  "timestamp": "2024-11-16T07:30:00Z"
}
```

---

## Admin Management

### WebSocket Management

#### Get WebSocket Status

**Endpoint:** `GET /api/admin/websocket/status`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "active_users": 42,
  "active_connections": 58,
  "timestamp": "2024-11-16T07:30:00Z"
}
```

#### Get Connection Details

**Endpoint:** `GET /api/admin/websocket/connections`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "total_connections": 58,
  "connections": [
    {
      "user_id": 1,
      "connected_at": "2024-11-16T07:15:00Z",
      "message_count": 45
    }
  ],
  "timestamp": "2024-11-16T07:30:00Z"
}
```

#### Broadcast Message

**Endpoint:** `POST /api/admin/websocket/broadcast`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "type": "system_alert",
  "data": {
    "message": "System maintenance scheduled for 2024-11-17 02:00 UTC",
    "severity": "warning"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message broadcast successfully",
  "users_notified": 42,
  "timestamp": "2024-11-16T07:30:00Z"
}
```

### System Monitoring

#### Get System Health

**Endpoint:** `GET /api/admin/system/health`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "database": "healthy",
  "websocket": "healthy",
  "refund_processor": {
    "processing": false,
    "last_run": "2024-11-16T07:30:00Z",
    "refund_count": 25,
    "total_refunded": 250000000000000
  },
  "active_users": 42,
  "active_connections": 58,
  "timestamp": "2024-11-16T07:30:00Z"
}
```

#### Get System Statistics

**Endpoint:** `GET /api/admin/system/stats`

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "red_packets": {
    "total": 1000,
    "active": 150,
    "completed": 800
  },
  "claims": {
    "total": 5000
  },
  "users": {
    "total": 500
  },
  "websocket": {
    "active_users": 42,
    "active_connections": 58
  },
  "timestamp": "2024-11-16T07:30:00Z"
}
```

---

## Configuration

### Environment Variables

```bash
# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30  # Seconds between heartbeats
WS_MAX_CONNECTIONS=1000   # Maximum concurrent connections

# Refund Processing Configuration
REFUND_PROCESS_INTERVAL=3600  # Seconds between processing runs (1 hour)
REFUND_BATCH_SIZE=100         # Number of packets to process per batch
```

### Scheduled Tasks

Add to your FastAPI startup event:

```python
from contextlib import asynccontextmanager
from src.routes.refund_processor import schedule_refund_processing

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(schedule_refund_processing(interval_seconds=3600))
    yield
    # Shutdown
    task.cancel()

app = FastAPI(lifespan=lifespan)
```

---

## Testing

### Test WebSocket Connection

```bash
# Using websocat (install: cargo install websocat)
websocat ws://localhost:8000/api/ws/notifications/YOUR_JWT_TOKEN

# Send ping
{"type": "ping"}

# Expected response
{"type": "pong", "timestamp": "2024-11-16T07:30:00Z"}

# Subscribe to notifications
{"type": "subscribe", "data": {"types": ["red_packet_claimed"]}}
```

### Test Refund Processing

```bash
# Trigger manual refund processing
curl -X POST http://localhost:8000/api/admin/refunds/process \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get pending refunds
curl -X GET http://localhost:8000/api/admin/refunds/pending \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get refund status for specific packet
curl -X GET http://localhost:8000/api/admin/refunds/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## Best Practices

### WebSocket

1. **Implement Reconnection Logic:** Handle disconnections gracefully
2. **Use Heartbeats:** Send periodic pings to detect stale connections
3. **Filter Notifications:** Subscribe only to relevant notification types
4. **Handle Errors:** Implement error handling for connection failures

### Refund Processing

1. **Regular Monitoring:** Check refund processor status regularly
2. **Backup Verification:** Verify refunds on blockchain
3. **Audit Trail:** Keep detailed logs of all refunds
4. **Testing:** Test refund processing in testnet first

---

## Monitoring & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| WebSocket connection refused | Token invalid or expired | Refresh JWT token |
| Notifications not received | Not subscribed to type | Use subscribe message |
| Connection drops frequently | Network instability | Implement reconnection logic |
| Refunds not processing | Processor not running | Check scheduled task |
| High memory usage | Too many connections | Implement connection limits |

### Performance Tuning

- **Connection Limits:** Set `WS_MAX_CONNECTIONS` based on server capacity
- **Batch Processing:** Adjust `REFUND_BATCH_SIZE` for optimal performance
- **Heartbeat Interval:** Balance between responsiveness and bandwidth

---

## Future Enhancements

- [ ] Persistent message queue for offline users
- [ ] Message history and replay
- [ ] Advanced filtering and routing
- [ ] Metrics and analytics dashboard
- [ ] Multi-server WebSocket support (Redis pub/sub)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/everest-an/dchat/issues
- Documentation: https://github.com/everest-an/dchat/wiki

---

*Document prepared by: Manus AI*  
*Last Updated: November 16, 2024*
