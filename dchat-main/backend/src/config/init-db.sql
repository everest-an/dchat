-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  login_method ENUM('wallet', 'email', 'phone', 'alipay') NOT NULL,
  is_custodial BOOLEAN DEFAULT FALSE,
  
  -- Contact Information
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  alipay_id VARCHAR(100) UNIQUE,
  
  -- Profile Information
  name VARCHAR(100),
  company VARCHAR(200),
  position VARCHAR(100),
  avatar_url VARCHAR(500),
  bio TEXT,
  
  -- LinkedIn Integration
  linkedin_id VARCHAR(100) UNIQUE,
  linkedin_profile JSON,
  
  -- Verification Status
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  
  INDEX idx_wallet_address (wallet_address),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_alipay_id (alipay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Codes Table
CREATE TABLE IF NOT EXISTS verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- email or phone
  code VARCHAR(10) NOT NULL,
  type ENUM('email', 'phone') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_identifier (identifier),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions Table (for JWT token management)
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  device_info JSON,
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token(255)),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custodial Wallets Table (encrypted private keys)
CREATE TABLE IF NOT EXISTS custodial_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  encrypted_private_key TEXT NOT NULL,
  encryption_method VARCHAR(50) DEFAULT 'AES-256-GCM',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_wallet_address (wallet_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages Table (for future use)
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  content TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT TRUE,
  message_hash VARCHAR(66), -- blockchain hash
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender_id (sender_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects Table (for future use)
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('planning', 'in_progress', 'completed', 'on_hold') DEFAULT 'planning',
  visibility ENUM('private', 'connections', 'public') DEFAULT 'connections',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Connections Table (for future use)
CREATE TABLE IF NOT EXISTS connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  connected_user_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
  privacy_level ENUM('public', 'network', 'close') DEFAULT 'network',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (connected_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_connection (user_id, connected_user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_connected_user_id (connected_user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

