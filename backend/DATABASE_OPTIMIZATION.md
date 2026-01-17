# Database Optimization Guide

This document describes the database optimizations implemented for dchat.pro to ensure production-grade performance.

## Table of Contents

1. [Indexes](#indexes)
2. [Query Optimization](#query-optimization)
3. [Connection Pooling](#connection-pooling)
4. [Monitoring](#monitoring)
5. [Maintenance](#maintenance)

---

## Indexes

### Users Table

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_users_wallet_address` | `wallet_address` | Fast wallet-based authentication lookups |
| `idx_users_created_at` | `created_at` | Sorting users by registration date |
| `idx_users_public_key` | `public_key` | E2E encryption key lookups (partial index) |

### Messages Table

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_messages_sender_receiver` | `sender_id, receiver_id` | Direct message queries |
| `idx_messages_receiver_sender` | `receiver_id, sender_id` | Reverse direction queries |
| `idx_messages_timestamp` | `timestamp DESC` | Chronological message ordering |
| `idx_messages_status` | `status` | Filter by message status |
| `idx_messages_receiver_status` | `receiver_id, status` | Unread message counts (partial index) |

### Groups Table

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_groups_owner` | `owner_id` | Find groups owned by user |
| `idx_groups_created_at` | `created_at` | Sort groups by creation date |
| `idx_groups_is_public` | `is_public` | Filter public/private groups |

### Group Members Table

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_group_members_group_user` | `group_id, user_id` | Membership checks |
| `idx_group_members_user` | `user_id` | Find all groups for a user |
| `idx_group_members_joined_at` | `joined_at` | Sort by join date |

---

## Query Optimization

### Best Practices

1. **Always use indexed columns in WHERE clauses**
   ```sql
   -- Good: Uses index
   SELECT * FROM users WHERE wallet_address = '0x123...';
   
   -- Bad: Full table scan
   SELECT * FROM users WHERE LOWER(name) = 'john';
   ```

2. **Avoid SELECT * - specify only needed columns**
   ```sql
   -- Good: Reduces data transfer
   SELECT id, name, wallet_address FROM users WHERE id = 123;
   
   -- Bad: Transfers unnecessary data
   SELECT * FROM users WHERE id = 123;
   ```

3. **Use LIMIT for pagination**
   ```sql
   -- Good: Paginated results
   SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50 OFFSET 0;
   ```

4. **Use prepared statements**
   ```python
   # Good: Prevents SQL injection
   cursor.execute("SELECT * FROM users WHERE wallet_address = %s", (address,))
   
   # Bad: SQL injection risk
   cursor.execute(f"SELECT * FROM users WHERE wallet_address = '{address}'")
   ```

5. **Use EXPLAIN ANALYZE to identify slow queries**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM messages
   WHERE receiver_id = 123 AND status = 'unread'
   ORDER BY timestamp DESC;
   ```

### Common Query Patterns

#### Get unread message count
```sql
SELECT COUNT(*) FROM messages
WHERE receiver_id = ? AND status = 'unread';
-- Uses: idx_messages_receiver_status
```

#### Get recent messages between two users
```sql
SELECT * FROM messages
WHERE (sender_id = ? AND receiver_id = ?)
   OR (sender_id = ? AND receiver_id = ?)
ORDER BY timestamp DESC
LIMIT 50;
-- Uses: idx_messages_sender_receiver, idx_messages_timestamp
```

#### Get user's groups
```sql
SELECT g.* FROM groups g
JOIN group_members gm ON g.id = gm.group_id
WHERE gm.user_id = ?
ORDER BY gm.joined_at DESC;
-- Uses: idx_group_members_user
```

---

## Connection Pooling

### SQLAlchemy Configuration

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,          # Number of connections to keep open
    max_overflow=20,       # Additional connections under load
    pool_timeout=30,       # Timeout waiting for connection
    pool_recycle=3600,     # Recycle connections after 1 hour
    pool_pre_ping=True     # Verify connections before use
)
```

### Recommended Settings

| Environment | pool_size | max_overflow | Total Connections |
|-------------|-----------|--------------|-------------------|
| Development | 5 | 10 | 15 |
| Staging | 10 | 20 | 30 |
| Production | 20 | 40 | 60 |

### Connection Limits

- **PostgreSQL default**: 100 connections
- **Supabase Free Tier**: 60 connections
- **Supabase Pro**: 200+ connections

**Formula**: `total_connections = pool_size + max_overflow`

---

## Monitoring

### Key Metrics to Track

1. **Query Performance**
   - Average query time
   - Slow query count (> 1 second)
   - Queries per second (QPS)

2. **Connection Pool**
   - Active connections
   - Idle connections
   - Connection wait time

3. **Table Statistics**
   - Table size
   - Index size
   - Row count

### Monitoring Queries

#### Check index usage
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Find unused indexes
```sql
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast%';
```

#### Check table sizes
```sql
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Identify slow queries
```sql
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Maintenance

### Regular Tasks

#### Daily
- Monitor slow query log
- Check connection pool usage
- Review error logs

#### Weekly
- Run `ANALYZE` to update statistics
  ```sql
  ANALYZE users;
  ANALYZE messages;
  ANALYZE groups;
  ```

#### Monthly
- Run `VACUUM ANALYZE` to reclaim space
  ```sql
  VACUUM ANALYZE;
  ```
- Review and optimize slow queries
- Check for missing indexes
- Archive old data

### Backup Strategy

1. **Automated Backups**
   - Daily full backups
   - Hourly incremental backups
   - Retain for 30 days

2. **Point-in-Time Recovery**
   - Enable WAL archiving
   - Test recovery procedures monthly

3. **Backup Verification**
   - Weekly restore tests
   - Verify data integrity

### Scaling Considerations

#### Vertical Scaling (Increase Resources)
- More CPU cores
- More RAM
- Faster storage (SSD/NVMe)

#### Horizontal Scaling (Read Replicas)
- Master-slave replication
- Read queries to replicas
- Write queries to master

#### Partitioning (For Large Tables)
```sql
-- Partition messages by month
CREATE TABLE messages_2024_01 PARTITION OF messages
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE messages_2024_02 PARTITION OF messages
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

---

## Performance Benchmarks

### Target Metrics

| Operation | Target Time | Acceptable Time | Action Required |
|-----------|-------------|-----------------|-----------------|
| User login | < 100ms | < 500ms | > 500ms |
| Load messages | < 200ms | < 1s | > 1s |
| Send message | < 150ms | < 500ms | > 500ms |
| Create group | < 300ms | < 1s | > 1s |
| Search users | < 500ms | < 2s | > 2s |

### Load Testing

Use tools like:
- **Apache JMeter** - HTTP load testing
- **pgbench** - PostgreSQL benchmarking
- **Locust** - Python-based load testing

Example pgbench command:
```bash
pgbench -c 50 -j 10 -t 1000 -r dchat_db
```

---

## Troubleshooting

### Common Issues

#### Slow Queries
1. Check if indexes are being used (`EXPLAIN ANALYZE`)
2. Update table statistics (`ANALYZE`)
3. Consider adding missing indexes
4. Optimize query structure

#### Connection Pool Exhaustion
1. Increase `pool_size` and `max_overflow`
2. Check for connection leaks
3. Implement connection timeout
4. Use connection pooling middleware

#### High Database CPU
1. Identify expensive queries
2. Add missing indexes
3. Optimize application logic
4. Consider caching frequently accessed data

#### Disk Space Issues
1. Run `VACUUM` to reclaim space
2. Archive old data
3. Implement data retention policy
4. Upgrade storage capacity

---

## References

- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [SQLAlchemy Connection Pooling](https://docs.sqlalchemy.org/en/14/core/pooling.html)
- [Supabase Database Optimization](https://supabase.com/docs/guides/database/performance)
- [Index Types in PostgreSQL](https://www.postgresql.org/docs/current/indexes-types.html)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
