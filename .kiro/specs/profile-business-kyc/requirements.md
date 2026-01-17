# Requirements Document

## Introduction

本功能模块为 Dchat 用户提供完整的商务档案管理和身份验证功能，包括：
- 商务信息编辑（公司、职位、行业）
- 技能管理（添加、编辑、删除技能标签）
- LinkedIn 集成（同步职业信息）
- Privado ID 集成（KYC/KYB 零知识证明身份验证）

## Glossary

- **Profile_Editor**: 用户档案编辑组件，管理用户的商务信息
- **Skill_Manager**: 技能管理组件，处理技能的 CRUD 操作
- **LinkedIn_Integration**: LinkedIn 集成服务，同步职业数据
- **Privado_ID_Service**: Privado ID 服务，处理 KYC/KYB 验证
- **KYC**: Know Your Customer，个人身份验证
- **KYB**: Know Your Business，企业身份验证
- **ZKP**: Zero-Knowledge Proof，零知识证明
- **DID**: Decentralized Identifier，去中心化身份标识
- **Verifiable_Credential**: 可验证凭证，由可信发行方签发的数字证书

## Requirements

### Requirement 1: 商务信息编辑

**User Story:** As a user, I want to edit my business profile information, so that I can present my professional identity to other users.

#### Acceptance Criteria

1. WHEN a user opens the profile edit dialog, THE Profile_Editor SHALL display editable fields for company name, job title, industry, and bio
2. WHEN a user modifies any business field, THE Profile_Editor SHALL validate the input format before saving
3. WHEN a user saves business information, THE Profile_Editor SHALL persist the data to the backend API
4. IF the backend API is unavailable, THEN THE Profile_Editor SHALL save data to local storage and sync when online
5. WHEN business information is updated, THE Profile_Editor SHALL display a success notification
6. THE Profile_Editor SHALL support company logo upload with image validation

### Requirement 2: 技能管理

**User Story:** As a user, I want to manage my skills, so that I can showcase my expertise to potential collaborators.

#### Acceptance Criteria

1. WHEN a user views the skills section, THE Skill_Manager SHALL display all current skills with proficiency levels
2. WHEN a user adds a new skill, THE Skill_Manager SHALL validate the skill name is not empty and not duplicate
3. WHEN a user edits a skill, THE Skill_Manager SHALL allow changing the skill name and proficiency level
4. WHEN a user deletes a skill, THE Skill_Manager SHALL remove it after confirmation
5. THE Skill_Manager SHALL support skill categories (Technical, Business, Language, Other)
6. THE Skill_Manager SHALL limit skills to a maximum of 20 per user
7. WHEN skills are modified, THE Skill_Manager SHALL sync changes to the backend API

### Requirement 3: LinkedIn 集成

**User Story:** As a user, I want to connect my LinkedIn account, so that I can import my professional information automatically.

#### Acceptance Criteria

1. WHEN a user clicks "Connect LinkedIn", THE LinkedIn_Integration SHALL initiate OAuth 2.0 authorization flow
2. WHEN LinkedIn authorization succeeds, THE LinkedIn_Integration SHALL fetch user profile data (name, headline, company, position)
3. WHEN LinkedIn data is fetched, THE LinkedIn_Integration SHALL offer to import data into the user profile
4. IF LinkedIn authorization fails, THEN THE LinkedIn_Integration SHALL display an error message with retry option
5. WHEN a user disconnects LinkedIn, THE LinkedIn_Integration SHALL revoke access and clear cached data
6. THE LinkedIn_Integration SHALL display connection status (connected/disconnected) in the profile

### Requirement 4: Privado ID KYC 验证

**User Story:** As a user, I want to verify my identity using Privado ID, so that I can build trust with other users through zero-knowledge proofs.

#### Acceptance Criteria

1. WHEN a user initiates KYC verification, THE Privado_ID_Service SHALL generate a verification request with QR code
2. WHEN a user scans the QR code with Privado ID wallet, THE Privado_ID_Service SHALL receive the ZKP proof
3. WHEN a valid proof is received, THE Privado_ID_Service SHALL verify the proof against the credential schema
4. IF proof verification succeeds, THEN THE Privado_ID_Service SHALL store the verification status and display a verified badge
5. IF proof verification fails, THEN THE Privado_ID_Service SHALL display an error message with reason
6. THE Privado_ID_Service SHALL support multiple verification types: humanity, age, country
7. WHEN verification expires, THE Privado_ID_Service SHALL notify the user and prompt re-verification

### Requirement 5: Privado ID KYB 验证

**User Story:** As a business user, I want to verify my company using Privado ID, so that I can prove my business legitimacy.

#### Acceptance Criteria

1. WHEN a user initiates KYB verification, THE Privado_ID_Service SHALL generate a business verification request
2. THE Privado_ID_Service SHALL support company verification types: registration, tax_id, business_license
3. WHEN a valid business proof is received, THE Privado_ID_Service SHALL verify against business credential schema
4. IF business verification succeeds, THEN THE Privado_ID_Service SHALL display a company verified badge
5. THE Privado_ID_Service SHALL allow linking multiple business credentials to one user
6. WHEN viewing a verified business profile, THE System SHALL display all active business verifications

### Requirement 6: 验证徽章显示

**User Story:** As a user, I want to see verification badges on profiles, so that I can identify trusted users and businesses.

#### Acceptance Criteria

1. WHEN viewing a user profile, THE System SHALL display all active verification badges
2. THE System SHALL display different badge styles for KYC (personal) and KYB (business) verifications
3. WHEN clicking a verification badge, THE System SHALL show verification details (type, issuer, expiry date)
4. THE System SHALL display verification badges in chat conversations next to usernames
5. IF a verification has expired, THEN THE System SHALL hide the badge and notify the user

### Requirement 7: 数据同步和离线支持

**User Story:** As a user, I want my profile changes to sync automatically, so that I don't lose data when offline.

#### Acceptance Criteria

1. WHEN the user is offline, THE System SHALL queue profile changes for later sync
2. WHEN the user comes online, THE System SHALL automatically sync queued changes
3. IF a sync conflict occurs, THEN THE System SHALL use last-write-wins strategy with user notification
4. THE System SHALL display sync status indicator (synced/pending/error)
5. WHEN sync fails after 3 retries, THE System SHALL notify the user and offer manual retry
