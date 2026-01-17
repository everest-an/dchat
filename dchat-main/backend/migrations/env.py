"""
Alembic environment configuration for Dchat
Handles database migrations with support for both SQLite and PostgreSQL
"""
from logging.config import fileConfig
import os
import sys

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import database configuration
from config.database import DatabaseConfig

# Import all models to ensure they're registered with SQLAlchemy
from src.models.user import db
from src.models.message import Message
from src.models.project import Project, Moment

# Import optional models
try:
    from src.models.subscription import Subscription, NFTMembership, NFTAvatar, SubscriptionFeatureUsage
except ImportError:
    pass

try:
    from src.models.matching import MatchingRequest, MatchingResult, MatchingFeedback, SkillRelation
except ImportError:
    pass

try:
    from src.models.custodial_wallet import CustodialWallet, WalletTransaction
except ImportError:
    pass

try:
    from src.models.nonce_tracker import NonceTracker
except ImportError:
    pass

try:
    from src.models.chat_transfer import ChatTransfer
except ImportError:
    pass

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get database URL from our configuration
database_url = DatabaseConfig.get_database_uri()
config.set_main_option('sqlalchemy.url', database_url)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = db.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration['sqlalchemy.url'] = database_url
    
    # Use NullPool for migrations (don't use connection pooling)
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
