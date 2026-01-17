# Enhanced Search Guide

## Overview

dchat.pro features a powerful full-text search system powered by PostgreSQL and Redis. This guide explains how to use and integrate the search functionality.

## Features

### Core Features
- **Message Search**: Full-text search across all messages
- **User Search**: Find users by name, email, or wallet address
- **Universal Search**: Search across multiple content types simultaneously
- **Search Suggestions**: Real-time autocomplete suggestions
- **Search History**: Track and revisit recent searches
- **Advanced Filters**: Filter by date, sender, conversation, and more

### Technical Features
- **PostgreSQL Full-Text Search**: GIN indexes for fast search
- **Redis Caching**: Cache search results for 5 minutes
- **Debounced Suggestions**: Reduce API calls with 300ms debounce
- **Highlighted Results**: Automatic highlighting of search terms
- **Relevance Scoring**: Results ranked by relevance

## Architecture

### Backend Components

1. **Search API** (`/backend/src/routes/search.py`)
   - RESTful API endpoints for search
   - PostgreSQL full-text search integration
   - Redis caching layer

2. **Database Indexes** (`/backend/migrations/add_fulltext_search_indexes.sql`)
   - GIN indexes on message content
   - Indexes on user fields
   - Composite indexes for filtering

### Frontend Components

1. **SearchService** (`/frontend/src/services/SearchService.js`)
   - Search API client
   - Client-side caching
   - Query parsing

2. **SearchBar Component** (`/frontend/src/components/SearchBar.jsx`)
   - Universal search bar
   - Autocomplete suggestions
   - Keyboard navigation

## API Reference

### REST API Endpoints

#### Search Messages
```http
GET /api/search/messages?q=<query>&limit=20&offset=0
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `q` (required): Search query
- `user_id` (optional): Filter by sender
- `conversation_id` (optional): Filter by conversation
- `start_date` (optional): Filter by start date (ISO format)
- `end_date` (optional): Filter by end date (ISO format)
- `limit` (optional): Maximum results (default: 20, max: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "query": "hello",
  "results": [
    {
      "id": "msg_123",
      "sender_id": "user_456",
      "receiver_id": "user_789",
      "content": "Hello, how are you?",
      "highlighted_content": "<mark>Hello</mark>, how are you?",
      "timestamp": "2024-11-05T10:30:00Z",
      "is_encrypted": false,
      "relevance": 0.95
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### Search Users
```http
GET /api/search/users?q=<query>&limit=20&offset=0
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Maximum results (default: 20, max: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "query": "john",
  "results": [
    {
      "id": "user_456",
      "username": "john_doe",
      "email": "john@example.com",
      "wallet_address": "0x1234...",
      "bio": "Software developer",
      "avatar_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

#### Universal Search
```http
GET /api/search/all?q=<query>&types=messages,users&limit=5
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `q` (required): Search query
- `types` (optional): Comma-separated list of types (default: messages,users)
- `limit` (optional): Maximum results per type (default: 5, max: 20)

**Response:**
```json
{
  "success": true,
  "query": "hello",
  "results": {
    "messages": [...],
    "users": [...]
  },
  "types": ["messages", "users"]
}
```

#### Get Search Suggestions
```http
GET /api/search/suggestions?q=<partial_query>&limit=10
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `q` (required): Partial search query
- `limit` (optional): Maximum suggestions (default: 10, max: 20)

**Response:**
```json
{
  "success": true,
  "query": "hel",
  "suggestions": [
    "hello",
    "help",
    "helicopter"
  ]
}
```

#### Get Search History
```http
GET /api/search/history?limit=20
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "query": "hello",
      "type": "messages",
      "result_count": 42,
      "timestamp": "2024-11-05T10:30:00Z"
    }
  ]
}
```

#### Clear Search History
```http
DELETE /api/search/history
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Search history cleared"
}
```

## Usage Examples

### Frontend Integration

#### Basic Search
```javascript
import searchService from './services/SearchService';

// Search messages
const results = await searchService.searchMessages({
  query: 'hello',
  limit: 20
});

console.log('Found', results.total, 'messages');
console.log('Results:', results.results);
```

#### Search with Filters
```javascript
// Search messages from specific user
const results = await searchService.searchMessages({
  query: 'meeting',
  userId: 'user_456',
  startDate: '2024-11-01T00:00:00Z',
  endDate: '2024-11-05T23:59:59Z',
  limit: 10
});
```

#### Search Users
```javascript
// Search users by name or email
const results = await searchService.searchUsers({
  query: 'john',
  limit: 10
});

console.log('Found', results.total, 'users');
```

#### Universal Search
```javascript
// Search across all types
const results = await searchService.searchAll({
  query: 'hello',
  types: ['messages', 'users'],
  limit: 5
});

console.log('Messages:', results.results.messages);
console.log('Users:', results.results.users);
```

#### Get Suggestions
```javascript
// Get autocomplete suggestions
const suggestions = await searchService.getSuggestions('hel', 10);

console.log('Suggestions:', suggestions);
// Output: ['hello', 'help', 'helicopter']
```

#### Search History
```javascript
// Get search history
const history = await searchService.getHistory(20);

console.log('Recent searches:', history);

// Clear search history
await searchService.clearHistory();
```

### React Component Example

```jsx
import React, { useState } from 'react';
import SearchBar from '../components/SearchBar';
import searchService from '../services/SearchService';

function ChatPage() {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = async (query) => {
    try {
      setIsSearching(true);
      
      // Search messages
      const results = await searchService.searchMessages({
        query,
        limit: 20
      });
      
      setSearchResults(results.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <div>
      <SearchBar
        onSearch={handleSearch}
        placeholder="Search messages..."
        autoFocus
      />
      
      {isSearching && <div>Searching...</div>}
      
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map(result => (
            <div key={result.id} className="search-result-item">
              <div dangerouslySetInnerHTML={{ 
                __html: result.highlighted_content 
              }} />
              <div className="result-meta">
                {result.sender_id} • {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Database Setup

### Run Migration

Apply the full-text search indexes:

```bash
cd backend
psql $DATABASE_URL < migrations/add_fulltext_search_indexes.sql
```

### Verify Indexes

Check that indexes were created:

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE '%_fts%' OR indexname LIKE '%_search%'
ORDER BY tablename, indexname;
```

### Test Search

Test PostgreSQL full-text search:

```sql
-- Search messages
SELECT * FROM messages
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'hello:*')
LIMIT 10;

-- Search users
SELECT * FROM users
WHERE username ILIKE '%john%'
   OR email ILIKE '%john%'
   OR wallet_address ILIKE '%john%'
LIMIT 10;
```

## Performance Optimization

### Tips for Better Performance

1. **Use GIN Indexes**: Already configured in migration
2. **Cache Results**: Redis caching enabled (5 minutes TTL)
3. **Limit Results**: Use pagination (limit/offset)
4. **Debounce Input**: Frontend debounces suggestions (300ms)
5. **Analyze Regularly**: Run `ANALYZE messages;` periodically

### Recommended Settings

**For Large Databases:**
```sql
-- Increase shared_buffers for better caching
ALTER SYSTEM SET shared_buffers = '256MB';

-- Increase work_mem for complex queries
ALTER SYSTEM SET work_mem = '16MB';

-- Reload configuration
SELECT pg_reload_conf();
```

**For Search-Heavy Workloads:**
```sql
-- Create additional indexes
CREATE INDEX idx_messages_timestamp_desc 
ON messages (timestamp DESC);

CREATE INDEX idx_messages_sender_timestamp 
ON messages (sender_id, timestamp DESC);
```

## Advanced Features

### Query Syntax

The search supports advanced query syntax:

**Basic Search:**
```
hello
```

**Phrase Search:**
```
"hello world"
```

**Boolean Operators:**
```
hello AND world
hello OR world
hello NOT world
```

**Prefix Search:**
```
hel*  (matches hello, help, helicopter)
```

### Custom Filters

Parse advanced filters from query:

```javascript
const filters = searchService.parseQuery('hello from:john date:2024-11-05');

console.log(filters);
// Output: {
//   query: 'hello',
//   from: 'john',
//   date: '2024-11-05',
//   to: null,
//   type: null
// }
```

### Relevance Scoring

Results are automatically scored by relevance:

- **Position**: Earlier matches score higher
- **Frequency**: More matches score higher
- **Exact Match**: Exact matches score highest

## Troubleshooting

### Common Issues

**1. No search results**
- Check that GIN indexes are created
- Verify data exists in database
- Check user permissions

**2. Slow search**
- Run `ANALYZE messages;`
- Check index usage with `EXPLAIN`
- Increase `work_mem` setting

**3. Suggestions not working**
- Check Redis connection
- Verify search history is being saved
- Clear cache and try again

**4. Highlighted text not rendering**
- Use `dangerouslySetInnerHTML` in React
- Sanitize HTML to prevent XSS

### Debug Mode

Enable search debug logs:

```javascript
// In browser console
localStorage.setItem('debug', 'search:*');
```

### Performance Monitoring

Monitor search performance:

```sql
-- Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE indexrelname LIKE '%_fts%';

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%to_tsquery%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Security

### Best Practices

1. **Authenticate All Requests**: JWT required for all endpoints
2. **Validate Input**: Query length limited (2-100 characters)
3. **Rate Limiting**: Prevent search spam
4. **Sanitize Output**: Escape HTML in highlighted results
5. **Privacy**: Users can only search their own messages

### Privacy Considerations

- Search history is stored per-user in Redis
- Search queries are not logged permanently
- Users can clear their search history anytime
- Encrypted messages are searchable only after decryption

## Future Enhancements

### Planned Features

- [ ] Fuzzy search (typo tolerance)
- [ ] Search filters UI
- [ ] Search within specific conversations
- [ ] File content search (PDF, DOCX)
- [ ] Image search (OCR)
- [ ] Voice message transcription search
- [ ] Multi-language support
- [ ] Search analytics dashboard

## Support

For issues or questions:
- GitHub Issues: https://github.com/everest-an/dchat/issues
- Documentation: https://dchat.pro/docs
- Email: support@dchat.pro

## License

MIT License - See LICENSE file for details

---

**Last Updated**: November 5, 2024  
**Version**: 1.0.0  
**Author**: Manus AI
