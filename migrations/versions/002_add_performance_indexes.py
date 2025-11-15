"""Add performance indexes for production

Revision ID: 002
Revises: 001
Create Date: 2024-11-13

This migration adds critical database indexes to improve query performance
for production workloads with thousands of users.

Indexes added:
- User table: wallet_address, email, username, online_status
- Message table: conversation_id, sender_id, recipient_id, is_read, full-text search
- User_profile table: user_id, skills, location, availability
- Project table: owner_id, status, title search
- Matching tables: request/result lookups, skill relations
- Custodial_wallet table: user_id, wallet_address
- Subscription table: user_id, status, expiration
- Chat_transfer table: sender_id, recipient_id, status, tx_hash
- Nonce_tracker table: wallet_address, created_at

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """Apply performance indexes"""
    
    # Read and execute SQL file
    import os
    sql_file = os.path.join(
        os.path.dirname(__file__),
        '..',
        'add_performance_indexes.sql'
    )
    
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    # Split by semicolon and execute each statement
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
    
    for statement in statements:
        # Skip comments and empty statements
        if statement.startswith('--') or statement.startswith('/*'):
            continue
        
        if statement:
            try:
                op.execute(statement)
            except Exception as e:
                print(f"Warning: Could not execute statement: {e}")
                # Continue with other indexes even if one fails


def downgrade():
    """Remove performance indexes"""
    
    # Drop all indexes created in upgrade
    indexes = [
        # User indexes
        'idx_user_wallet_address',
        'idx_user_email',
        'idx_user_username',
        'idx_user_online_status',
        'idx_user_active',
        
        # Message indexes
        'idx_message_conversation',
        'idx_message_sender',
        'idx_message_recipient',
        'idx_message_unread',
        'idx_message_content_search',
        'idx_message_conversation_read',
        
        # User profile indexes
        'idx_user_profile_user',
        'idx_user_profile_skills',
        'idx_user_profile_location',
        'idx_user_profile_availability',
        
        # Project indexes
        'idx_project_owner',
        'idx_project_status',
        'idx_project_active',
        'idx_project_title_search',
        
        # Matching indexes
        'idx_matching_request_requester',
        'idx_matching_request_status',
        'idx_matching_result_request',
        'idx_matching_result_candidate',
        'idx_skill_relation_skill1',
        'idx_skill_relation_skill2',
        'idx_skill_relation_both',
        
        # Custodial wallet indexes
        'idx_custodial_wallet_user',
        'idx_custodial_wallet_address',
        'idx_custodial_wallet_active',
        
        # Subscription indexes
        'idx_subscription_user',
        'idx_subscription_active',
        'idx_subscription_expiring',
        
        # Chat transfer indexes
        'idx_chat_transfer_sender',
        'idx_chat_transfer_recipient',
        'idx_chat_transfer_pending',
        'idx_chat_transfer_tx_hash',
        
        # Nonce tracker indexes
        'idx_nonce_tracker_wallet',
        'idx_nonce_tracker_created',
    ]
    
    for index_name in indexes:
        try:
            op.execute(f'DROP INDEX IF EXISTS {index_name}')
        except Exception as e:
            print(f"Warning: Could not drop index {index_name}: {e}")
