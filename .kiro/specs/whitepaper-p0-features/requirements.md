# Requirements Document

## Introduction

本文档定义了 Dchat 白皮书中 P0 级别核心功能的需求。这些功能是 Dchat 区别于传统聊天应用的关键差异化特性，包括端到端加密、公钥管理、IPFS 去中心化存储和智能机会匹配算法。

## Glossary

- **E2E_Encryption**: 端到端加密系统，确保只有发送者和接收者能读取消息内容
- **Public_Key_Manager**: 公钥管理服务，负责存储、检索和验证用户公钥
- **IPFS_Service**: IPFS 去中心化存储服务，用于存储文件、图片等大型内容
- **Opportunity_Matcher**: 智能机会匹配引擎，基于用户技能、项目和需求进行匹配
- **Key_Pair**: RSA/ECDSA 密钥对，包含公钥和私钥
- **Message_Envelope**: 加密消息封装，包含加密内容、签名和元数据
- **CID**: IPFS 内容标识符 (Content Identifier)
- **Opportunity_Score**: 机会匹配分数，0-100 分表示匹配程度

## Requirements

### Requirement 1: 端到端加密系统

**User Story:** As a privacy-conscious user, I want my messages to be encrypted end-to-end, so that only the intended recipient can read them.

#### Acceptance Criteria

1. WHEN a user registers or first logs in, THE E2E_Encryption SHALL generate an RSA-2048 key pair for the user
2. WHEN key pair is generated, THE Public_Key_Manager SHALL store the public key in the database
3. WHEN key pair is generated, THE E2E_Encryption SHALL securely store the private key in browser localStorage (encrypted with user password)
4. WHEN user sends a message, THE E2E_Encryption SHALL retrieve recipient's public key from Public_Key_Manager
5. WHEN recipient's public key is obtained, THE E2E_Encryption SHALL encrypt message content using hybrid encryption (RSA + AES-256-GCM)
6. WHEN message is encrypted, THE E2E_Encryption SHALL create a digital signature using sender's private key
7. WHEN encrypted message is sent, THE Message_Envelope SHALL contain: encrypted content, signature, sender public key hash, timestamp
8. WHEN recipient receives message, THE E2E_Encryption SHALL verify signature using sender's public key
9. IF signature verification succeeds, THEN THE E2E_Encryption SHALL decrypt message using recipient's private key
10. IF signature verification fails, THEN THE Frontend SHALL display warning that message may be tampered
11. IF recipient's public key is not found, THEN THE Frontend SHALL display error and prevent message sending
12. WHEN user logs out, THE E2E_Encryption SHALL NOT delete private key (allow re-login)

### Requirement 2: 公钥管理系统

**User Story:** As a user, I want my public key to be securely stored and easily retrievable, so that others can send me encrypted messages.

#### Acceptance Criteria

1. THE Public_Key_Manager SHALL provide API endpoint to register user's public key
2. THE Public_Key_Manager SHALL provide API endpoint to retrieve public key by wallet address
3. THE Public_Key_Manager SHALL provide API endpoint to retrieve public key by user ID
4. WHEN public key is registered, THE Public_Key_Manager SHALL validate key format (PEM or JWK)
5. WHEN public key is registered, THE Public_Key_Manager SHALL store key with user ID, wallet address, and timestamp
6. WHEN public key is requested, THE Public_Key_Manager SHALL return key with verification status
7. THE Public_Key_Manager SHALL support key rotation (update existing key)
8. WHEN key is rotated, THE Public_Key_Manager SHALL maintain key history for message decryption
9. THE Public_Key_Manager SHALL cache frequently accessed keys for performance
10. IF public key request fails, THEN THE Public_Key_Manager SHALL return appropriate error code

### Requirement 3: IPFS 去中心化存储

**User Story:** As a user, I want to send files, images, and videos in chat, so that I can share rich media content with my contacts.

#### Acceptance Criteria

1. WHEN user selects a file to send, THE IPFS_Service SHALL validate file size (max 50MB) and type
2. WHEN file is validated, THE IPFS_Service SHALL encrypt file content using recipient's public key
3. WHEN file is encrypted, THE IPFS_Service SHALL upload encrypted file to IPFS via Pinata API
4. WHEN upload succeeds, THE IPFS_Service SHALL return CID (Content Identifier)
5. WHEN CID is obtained, THE Frontend SHALL send message with CID and file metadata (name, size, type)
6. WHEN recipient receives file message, THE Frontend SHALL display file preview (thumbnail for images)
7. WHEN recipient clicks download, THE IPFS_Service SHALL fetch file from IPFS using CID
8. WHEN file is fetched, THE IPFS_Service SHALL decrypt file using recipient's private key
9. WHEN file is decrypted, THE Frontend SHALL trigger browser download
10. IF file upload fails, THEN THE Frontend SHALL display error and allow retry
11. IF file download fails, THEN THE Frontend SHALL display error with CID for manual retrieval
12. THE IPFS_Service SHALL support image preview without full download (thumbnail generation)

### Requirement 4: 智能机会匹配算法

**User Story:** As a professional, I want to discover relevant collaboration opportunities automatically, so that I can grow my network without manual searching.

#### Acceptance Criteria

1. THE Opportunity_Matcher SHALL calculate match score based on: skills (30%), availability (20%), network distance (15%), interests (15%), resources (10%), success rate (10%)
2. WHEN user updates profile (skills, projects, resources), THE Opportunity_Matcher SHALL recalculate matches
3. THE Opportunity_Matcher SHALL provide API to get top N matched opportunities for a user
4. THE Opportunity_Matcher SHALL support matching categories: Project Collaboration, Resource Sharing, Partnership, Hiring/Consulting, Knowledge Exchange
5. WHEN match score exceeds threshold (70), THE Opportunity_Matcher SHALL create opportunity notification
6. THE Frontend SHALL display opportunity feed with matched users/projects
7. WHEN user views opportunity, THE Frontend SHALL show match score breakdown
8. WHEN user expresses interest, THE Frontend SHALL create connection request with context
9. THE Opportunity_Matcher SHALL learn from user interactions (accept/reject) to improve matching
10. THE Opportunity_Matcher SHALL respect user privacy settings when calculating matches
11. IF user has no profile data, THEN THE Opportunity_Matcher SHALL prompt to complete profile
12. THE Opportunity_Matcher SHALL run batch matching daily and real-time matching on profile updates

### Requirement 5: 细粒度隐私控制

**User Story:** As a user, I want to control what information different contacts can see, so that I can maintain professional boundaries.

#### Acceptance Criteria

1. THE Frontend SHALL provide privacy settings UI with 4 disclosure levels: Public, Network, Connections, Close Collaborators
2. WHEN user sets privacy level for a field, THE Backend SHALL store privacy preference
3. WHEN user views another user's profile, THE Backend SHALL filter fields based on relationship and privacy settings
4. THE Privacy_Controller SHALL support field-level privacy: name, company, role, projects, skills, contact info, availability
5. WHEN user adds a connection, THE Frontend SHALL prompt to set connection tier
6. THE Privacy_Controller SHALL support connection groups (e.g., "Clients", "Partners", "Extended Network")
7. WHEN user changes privacy settings, THE Backend SHALL immediately apply to all profile views
8. THE Privacy_Controller SHALL support time-based access (temporary elevated access for active projects)
9. IF viewer has insufficient access level, THEN THE Frontend SHALL show placeholder or "Request Access" button
10. THE Privacy_Controller SHALL log access attempts for audit purposes

### Requirement 6: Living Profile 系统完善

**User Story:** As a professional, I want my profile to automatically reflect my current status, so that my network always has up-to-date information.

#### Acceptance Criteria

1. THE Frontend SHALL provide "Current Projects" section in profile with add/edit/remove functionality
2. THE Frontend SHALL provide "Available Resources" section to signal what user can offer
3. THE Frontend SHALL provide "Seeking Opportunities" section to indicate what user is looking for
4. WHEN user updates any profile section, THE Backend SHALL broadcast update to connections (based on privacy settings)
5. THE Frontend SHALL display "Last Updated" timestamp on profile sections
6. THE Backend SHALL support LinkedIn auto-sync for role/company changes (with user permission)
7. WHEN LinkedIn data changes, THE Backend SHALL notify user and offer to update profile
8. THE Frontend SHALL provide "Availability Status" toggle (Available, Busy, Away)
9. WHEN availability changes, THE Opportunity_Matcher SHALL adjust matching priority
10. THE Frontend SHALL show profile completeness score and suggestions for improvement

