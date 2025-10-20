// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UserIdentity
 * @dev 用户身份验证和信誉系统合约
 * @notice 管理用户资料、LinkedIn 验证和信誉评分
 */
contract UserIdentity {
    
    // 用户资料结构
    struct UserProfile {
        address walletAddress;      // 钱包地址
        string username;            // 用户名
        string email;               // 邮箱 (哈希)
        string linkedInId;          // LinkedIn ID
        bool isLinkedInVerified;    // LinkedIn 是否验证
        bool isEmailVerified;       // 邮箱是否验证
        uint256 reputationScore;    // 信誉评分
        uint256 createdAt;          // 创建时间
        uint256 lastUpdated;        // 最后更新时间
        bool isActive;              // 是否活跃
    }
    
    // 公司资料结构
    struct CompanyProfile {
        string companyId;           // 公司ID
        string companyName;         // 公司名称
        string industry;            // 行业
        bool isVerified;            // 是否验证
        uint256 employeeCount;      // 员工数量
        uint256 createdAt;          // 创建时间
    }
    
    // 用户-公司关联结构
    struct UserCompany {
        address userAddress;        // 用户地址
        string companyId;           // 公司ID
        string position;            // 职位
        uint256 startDate;          // 开始日期
        uint256 endDate;            // 结束日期 (0表示当前)
        bool isVerified;            // 是否验证
    }
    
    // 信誉记录结构
    struct ReputationRecord {
        address fromUser;           // 评价者
        address toUser;             // 被评价者
        int256 score;               // 评分 (-5 到 +5)
        string comment;             // 评论
        uint256 timestamp;          // 时间戳
    }
    
    // 存储用户资料
    mapping(address => UserProfile) public userProfiles;
    
    // 存储公司资料
    mapping(string => CompanyProfile) public companyProfiles;
    
    // 存储用户-公司关联
    mapping(address => UserCompany[]) public userCompanies;
    
    // 存储信誉记录
    mapping(address => ReputationRecord[]) public reputationRecords;
    
    // 用户名映射 (用户名 => 地址)
    mapping(string => address) public usernameToAddress;
    
    // LinkedIn ID 映射 (LinkedIn ID => 地址)
    mapping(string => address) public linkedInToAddress;
    
    // 公司员工列表
    mapping(string => address[]) public companyEmployees;
    
    // 已注册用户数量
    uint256 public totalUsers;
    
    // 已注册公司数量
    uint256 public totalCompanies;
    
    // 事件
    event UserRegistered(
        address indexed userAddress,
        string username,
        uint256 timestamp
    );
    
    event ProfileUpdated(
        address indexed userAddress,
        uint256 timestamp
    );
    
    event LinkedInVerified(
        address indexed userAddress,
        string linkedInId,
        uint256 timestamp
    );
    
    event EmailVerified(
        address indexed userAddress,
        uint256 timestamp
    );
    
    event CompanyRegistered(
        string indexed companyId,
        string companyName,
        uint256 timestamp
    );
    
    event UserCompanyAdded(
        address indexed userAddress,
        string indexed companyId,
        string position,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        address indexed fromUser,
        address indexed toUser,
        int256 score,
        uint256 timestamp
    );
    
    /**
     * @dev 注册用户
     * @param _username 用户名
     * @param _emailHash 邮箱哈希
     */
    function registerUser(
        string memory _username,
        string memory _emailHash
    ) external {
        require(userProfiles[msg.sender].createdAt == 0, "User already registered");
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(usernameToAddress[_username] == address(0), "Username already taken");
        
        userProfiles[msg.sender] = UserProfile({
            walletAddress: msg.sender,
            username: _username,
            email: _emailHash,
            linkedInId: "",
            isLinkedInVerified: false,
            isEmailVerified: false,
            reputationScore: 100, // 初始信誉分数
            createdAt: block.timestamp,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        usernameToAddress[_username] = msg.sender;
        totalUsers++;
        
        emit UserRegistered(msg.sender, _username, block.timestamp);
    }
    
    /**
     * @dev 更新用户资料
     * @param _username 新用户名
     * @param _emailHash 新邮箱哈希
     */
    function updateProfile(
        string memory _username,
        string memory _emailHash
    ) external {
        require(userProfiles[msg.sender].createdAt > 0, "User not registered");
        
        UserProfile storage profile = userProfiles[msg.sender];
        
        // 更新用户名
        if (bytes(_username).length > 0 && 
            keccak256(bytes(_username)) != keccak256(bytes(profile.username))) {
            require(usernameToAddress[_username] == address(0), "Username already taken");
            delete usernameToAddress[profile.username];
            profile.username = _username;
            usernameToAddress[_username] = msg.sender;
        }
        
        // 更新邮箱
        if (bytes(_emailHash).length > 0) {
            profile.email = _emailHash;
            profile.isEmailVerified = false; // 重新验证
        }
        
        profile.lastUpdated = block.timestamp;
        
        emit ProfileUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 验证 LinkedIn
     * @param _linkedInId LinkedIn ID
     */
    function verifyLinkedIn(string memory _linkedInId) external {
        require(userProfiles[msg.sender].createdAt > 0, "User not registered");
        require(bytes(_linkedInId).length > 0, "LinkedIn ID cannot be empty");
        require(linkedInToAddress[_linkedInId] == address(0), "LinkedIn ID already linked");
        
        UserProfile storage profile = userProfiles[msg.sender];
        
        // 如果之前有 LinkedIn ID,删除旧映射
        if (bytes(profile.linkedInId).length > 0) {
            delete linkedInToAddress[profile.linkedInId];
        }
        
        profile.linkedInId = _linkedInId;
        profile.isLinkedInVerified = true;
        profile.reputationScore += 50; // 验证 LinkedIn 增加信誉分数
        profile.lastUpdated = block.timestamp;
        
        linkedInToAddress[_linkedInId] = msg.sender;
        
        emit LinkedInVerified(msg.sender, _linkedInId, block.timestamp);
    }
    
    /**
     * @dev 验证邮箱
     */
    function verifyEmail() external {
        require(userProfiles[msg.sender].createdAt > 0, "User not registered");
        require(!userProfiles[msg.sender].isEmailVerified, "Email already verified");
        
        UserProfile storage profile = userProfiles[msg.sender];
        profile.isEmailVerified = true;
        profile.reputationScore += 20; // 验证邮箱增加信誉分数
        profile.lastUpdated = block.timestamp;
        
        emit EmailVerified(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 注册公司
     * @param _companyId 公司ID
     * @param _companyName 公司名称
     * @param _industry 行业
     */
    function registerCompany(
        string memory _companyId,
        string memory _companyName,
        string memory _industry
    ) external {
        require(companyProfiles[_companyId].createdAt == 0, "Company already registered");
        require(bytes(_companyName).length > 0, "Company name cannot be empty");
        
        companyProfiles[_companyId] = CompanyProfile({
            companyId: _companyId,
            companyName: _companyName,
            industry: _industry,
            isVerified: false,
            employeeCount: 0,
            createdAt: block.timestamp
        });
        
        totalCompanies++;
        
        emit CompanyRegistered(_companyId, _companyName, block.timestamp);
    }
    
    /**
     * @dev 添加用户-公司关联
     * @param _companyId 公司ID
     * @param _position 职位
     * @param _startDate 开始日期
     */
    function addUserCompany(
        string memory _companyId,
        string memory _position,
        uint256 _startDate
    ) external {
        require(userProfiles[msg.sender].createdAt > 0, "User not registered");
        require(companyProfiles[_companyId].createdAt > 0, "Company not registered");
        require(bytes(_position).length > 0, "Position cannot be empty");
        
        userCompanies[msg.sender].push(UserCompany({
            userAddress: msg.sender,
            companyId: _companyId,
            position: _position,
            startDate: _startDate,
            endDate: 0, // 当前职位
            isVerified: userProfiles[msg.sender].isLinkedInVerified
        }));
        
        companyEmployees[_companyId].push(msg.sender);
        companyProfiles[_companyId].employeeCount++;
        
        emit UserCompanyAdded(msg.sender, _companyId, _position, block.timestamp);
    }
    
    /**
     * @dev 更新信誉评分
     * @param _toUser 被评价用户
     * @param _score 评分 (-5 到 +5)
     * @param _comment 评论
     */
    function updateReputation(
        address _toUser,
        int256 _score,
        string memory _comment
    ) external {
        require(userProfiles[msg.sender].createdAt > 0, "User not registered");
        require(userProfiles[_toUser].createdAt > 0, "Target user not registered");
        require(msg.sender != _toUser, "Cannot rate yourself");
        require(_score >= -5 && _score <= 5, "Score must be between -5 and 5");
        
        reputationRecords[_toUser].push(ReputationRecord({
            fromUser: msg.sender,
            toUser: _toUser,
            score: _score,
            comment: _comment,
            timestamp: block.timestamp
        }));
        
        // 更新信誉分数
        UserProfile storage profile = userProfiles[_toUser];
        if (_score > 0) {
            profile.reputationScore += uint256(_score);
        } else if (_score < 0 && profile.reputationScore >= uint256(-_score)) {
            profile.reputationScore -= uint256(-_score);
        }
        
        emit ReputationUpdated(msg.sender, _toUser, _score, block.timestamp);
    }
    
    /**
     * @dev 获取用户资料
     * @param _user 用户地址
     * @return UserProfile 用户资料
     */
    function getUserProfile(address _user) external view returns (UserProfile memory) {
        require(userProfiles[_user].createdAt > 0, "User not registered");
        return userProfiles[_user];
    }
    
    /**
     * @dev 通过用户名获取地址
     * @param _username 用户名
     * @return address 用户地址
     */
    function getUserByUsername(string memory _username) external view returns (address) {
        return usernameToAddress[_username];
    }
    
    /**
     * @dev 通过 LinkedIn ID 获取地址
     * @param _linkedInId LinkedIn ID
     * @return address 用户地址
     */
    function getUserByLinkedIn(string memory _linkedInId) external view returns (address) {
        return linkedInToAddress[_linkedInId];
    }
    
    /**
     * @dev 获取用户的公司列表
     * @param _user 用户地址
     * @return UserCompany[] 公司列表
     */
    function getUserCompanies(address _user) external view returns (UserCompany[] memory) {
        return userCompanies[_user];
    }
    
    /**
     * @dev 获取公司员工列表
     * @param _companyId 公司ID
     * @return address[] 员工地址列表
     */
    function getCompanyEmployees(string memory _companyId) external view returns (address[] memory) {
        return companyEmployees[_companyId];
    }
    
    /**
     * @dev 获取用户的信誉记录
     * @param _user 用户地址
     * @return ReputationRecord[] 信誉记录列表
     */
    function getReputationRecords(address _user) external view returns (ReputationRecord[] memory) {
        return reputationRecords[_user];
    }
    
    /**
     * @dev 检查用户是否已注册
     * @param _user 用户地址
     * @return bool 是否已注册
     */
    function isUserRegistered(address _user) external view returns (bool) {
        return userProfiles[_user].createdAt > 0;
    }
}

