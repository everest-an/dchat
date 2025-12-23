// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UserIdentityV2
 * @dev 升级版用户身份验证和资料管理合约
 * @notice 支持完整用户资料、技能管理、LinkedIn 集成
 */
contract UserIdentityV2 {
    
    // 用户资料结构
    struct UserProfile {
        address walletAddress;      // 钱包地址
        string username;            // 用户名
        string displayName;         // 显示名称
        string email;               // 邮箱 (哈希)
        string avatar;              // 头像 IPFS 哈希
        string bio;                 // 个人简介
        string linkedInId;          // LinkedIn ID
        string linkedInProfileUrl;  // LinkedIn 个人主页
        bool isLinkedInVerified;    // LinkedIn 是否验证
        bool isEmailVerified;       // 邮箱是否验证
        uint256 reputationScore;    // 信誉评分
        uint256 createdAt;          // 创建时间
        uint256 lastUpdated;        // 最后更新时间
        bool isActive;              // 是否活跃
    }
    
    // 技能结构
    struct Skill {
        string name;                // 技能名称
        string category;            // 技能分类 (e.g., "Programming", "Design")
        uint8 level;                // 技能等级 (1-5)
        uint256 endorsements;       // 背书数量
        uint256 addedAt;            // 添加时间
    }
    
    // 工作经历结构
    struct WorkExperience {
        string companyId;           // 公司ID
        string companyName;         // 公司名称
        string position;            // 职位
        string department;          // 部门
        string location;            // 地点
        uint256 startDate;          // 开始日期
        uint256 endDate;            // 结束日期 (0表示当前)
        bool isCurrent;             // 是否当前职位
        bool isVerified;            // 是否验证
        string linkedInWorkId;      // LinkedIn 工作经历ID
    }
    
    // 公司资料结构
    struct CompanyProfile {
        string companyId;           // 公司ID
        string companyName;         // 公司名称
        string industry;            // 行业
        string website;             // 网站
        string logo;                // Logo IPFS 哈希
        bool isVerified;            // 是否验证
        uint256 employeeCount;      // 员工数量
        uint256 createdAt;          // 创建时间
    }
    
    // 存储用户资料
    mapping(address => UserProfile) public userProfiles;
    
    // 存储用户技能
    mapping(address => Skill[]) public userSkills;
    
    // 存储用户工作经历
    mapping(address => WorkExperience[]) public userWorkExperiences;
    
    // 存储公司资料
    mapping(string => CompanyProfile) public companyProfiles;
    
    // 用户名映射 (用户名 => 地址)
    mapping(string => address) public usernameToAddress;
    
    // LinkedIn ID 映射 (LinkedIn ID => 地址)
    mapping(string => address) public linkedInToAddress;
    
    // 技能背书记录 (用户地址 => 技能索引 => 背书者列表)
    mapping(address => mapping(uint256 => address[])) public skillEndorsers;
    
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
    
    event LinkedInConnected(
        address indexed userAddress,
        string linkedInId,
        uint256 timestamp
    );
    
    event LinkedInSynced(
        address indexed userAddress,
        uint256 workExperienceCount,
        uint256 timestamp
    );
    
    event SkillAdded(
        address indexed userAddress,
        string skillName,
        string category,
        uint256 timestamp
    );
    
    event SkillUpdated(
        address indexed userAddress,
        uint256 skillIndex,
        uint256 timestamp
    );
    
    event SkillEndorsed(
        address indexed endorser,
        address indexed user,
        uint256 skillIndex,
        uint256 timestamp
    );
    
    event WorkExperienceAdded(
        address indexed userAddress,
        string companyName,
        string position,
        uint256 timestamp
    );
    
    event WorkExperienceUpdated(
        address indexed userAddress,
        uint256 experienceIndex,
        uint256 timestamp
    );
    
    // 修饰符
    modifier onlyRegistered() {
        require(userProfiles[msg.sender].isActive, "User not registered");
        _;
    }
    
    modifier usernameAvailable(string memory _username) {
        require(usernameToAddress[_username] == address(0), "Username already taken");
        _;
    }
    
    /**
     * @dev 注册新用户
     */
    function registerUser(
        string memory _username,
        string memory _displayName,
        string memory _email
    ) external usernameAvailable(_username) {
        require(bytes(_username).length > 0, "Username required");
        require(!userProfiles[msg.sender].isActive, "User already registered");
        
        userProfiles[msg.sender] = UserProfile({
            walletAddress: msg.sender,
            username: _username,
            displayName: _displayName,
            email: _email,
            avatar: "",
            bio: "",
            linkedInId: "",
            linkedInProfileUrl: "",
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
     */
    function updateProfile(
        string memory _displayName,
        string memory _avatar,
        string memory _bio
    ) external onlyRegistered {
        UserProfile storage profile = userProfiles[msg.sender];
        profile.displayName = _displayName;
        profile.avatar = _avatar;
        profile.bio = _bio;
        profile.lastUpdated = block.timestamp;
        
        emit ProfileUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 连接 LinkedIn 账号
     */
    function connectLinkedIn(
        string memory _linkedInId,
        string memory _profileUrl
    ) external onlyRegistered {
        require(bytes(_linkedInId).length > 0, "LinkedIn ID required");
        require(linkedInToAddress[_linkedInId] == address(0), "LinkedIn already connected");
        
        UserProfile storage profile = userProfiles[msg.sender];
        profile.linkedInId = _linkedInId;
        profile.linkedInProfileUrl = _profileUrl;
        profile.isLinkedInVerified = true;
        profile.lastUpdated = block.timestamp;
        
        linkedInToAddress[_linkedInId] = msg.sender;
        
        emit LinkedInConnected(msg.sender, _linkedInId, block.timestamp);
    }
    
    /**
     * @dev 添加技能
     */
    function addSkill(
        string memory _name,
        string memory _category,
        uint8 _level
    ) external onlyRegistered {
        require(bytes(_name).length > 0, "Skill name required");
        require(_level >= 1 && _level <= 5, "Level must be 1-5");
        
        userSkills[msg.sender].push(Skill({
            name: _name,
            category: _category,
            level: _level,
            endorsements: 0,
            addedAt: block.timestamp
        }));
        
        emit SkillAdded(msg.sender, _name, _category, block.timestamp);
    }
    
    /**
     * @dev 更新技能
     */
    function updateSkill(
        uint256 _skillIndex,
        string memory _name,
        string memory _category,
        uint8 _level
    ) external onlyRegistered {
        require(_skillIndex < userSkills[msg.sender].length, "Invalid skill index");
        require(_level >= 1 && _level <= 5, "Level must be 1-5");
        
        Skill storage skill = userSkills[msg.sender][_skillIndex];
        skill.name = _name;
        skill.category = _category;
        skill.level = _level;
        
        emit SkillUpdated(msg.sender, _skillIndex, block.timestamp);
    }
    
    /**
     * @dev 删除技能
     */
    function removeSkill(uint256 _skillIndex) external onlyRegistered {
        require(_skillIndex < userSkills[msg.sender].length, "Invalid skill index");
        
        // 将最后一个技能移到要删除的位置
        uint256 lastIndex = userSkills[msg.sender].length - 1;
        if (_skillIndex != lastIndex) {
            userSkills[msg.sender][_skillIndex] = userSkills[msg.sender][lastIndex];
        }
        userSkills[msg.sender].pop();
    }
    
    /**
     * @dev 背书技能
     */
    function endorseSkill(address _user, uint256 _skillIndex) external onlyRegistered {
        require(_user != msg.sender, "Cannot endorse yourself");
        require(userProfiles[_user].isActive, "User not found");
        require(_skillIndex < userSkills[_user].length, "Invalid skill index");
        
        // 检查是否已经背书过
        address[] storage endorsers = skillEndorsers[_user][_skillIndex];
        for (uint256 i = 0; i < endorsers.length; i++) {
            require(endorsers[i] != msg.sender, "Already endorsed");
        }
        
        endorsers.push(msg.sender);
        userSkills[_user][_skillIndex].endorsements++;
        
        emit SkillEndorsed(msg.sender, _user, _skillIndex, block.timestamp);
    }
    
    /**
     * @dev 添加工作经历
     */
    function addWorkExperience(
        string memory _companyId,
        string memory _companyName,
        string memory _position,
        string memory _department,
        string memory _location,
        uint256 _startDate,
        uint256 _endDate,
        bool _isCurrent
    ) external onlyRegistered {
        require(bytes(_companyName).length > 0, "Company name required");
        require(bytes(_position).length > 0, "Position required");
        
        userWorkExperiences[msg.sender].push(WorkExperience({
            companyId: _companyId,
            companyName: _companyName,
            position: _position,
            department: _department,
            location: _location,
            startDate: _startDate,
            endDate: _endDate,
            isCurrent: _isCurrent,
            isVerified: false,
            linkedInWorkId: ""
        }));
        
        emit WorkExperienceAdded(msg.sender, _companyName, _position, block.timestamp);
    }
    
    /**
     * @dev 从 LinkedIn 同步工作经历
     */
    function syncLinkedInWorkExperience(
        string memory _linkedInWorkId,
        string memory _companyId,
        string memory _companyName,
        string memory _position,
        string memory _department,
        string memory _location,
        uint256 _startDate,
        uint256 _endDate,
        bool _isCurrent
    ) external onlyRegistered {
        require(userProfiles[msg.sender].isLinkedInVerified, "LinkedIn not verified");
        
        userWorkExperiences[msg.sender].push(WorkExperience({
            companyId: _companyId,
            companyName: _companyName,
            position: _position,
            department: _department,
            location: _location,
            startDate: _startDate,
            endDate: _endDate,
            isCurrent: _isCurrent,
            isVerified: true, // LinkedIn 同步的自动验证
            linkedInWorkId: _linkedInWorkId
        }));
        
        emit WorkExperienceAdded(msg.sender, _companyName, _position, block.timestamp);
    }
    
    /**
     * @dev 更新工作经历
     */
    function updateWorkExperience(
        uint256 _experienceIndex,
        string memory _position,
        string memory _department,
        uint256 _endDate,
        bool _isCurrent
    ) external onlyRegistered {
        require(_experienceIndex < userWorkExperiences[msg.sender].length, "Invalid experience index");
        
        WorkExperience storage exp = userWorkExperiences[msg.sender][_experienceIndex];
        exp.position = _position;
        exp.department = _department;
        exp.endDate = _endDate;
        exp.isCurrent = _isCurrent;
        
        emit WorkExperienceUpdated(msg.sender, _experienceIndex, block.timestamp);
    }
    
    /**
     * @dev 获取用户资料
     */
    function getUserProfile(address _user) external view returns (UserProfile memory) {
        return userProfiles[_user];
    }
    
    /**
     * @dev 获取用户所有技能
     */
    function getUserSkills(address _user) external view returns (Skill[] memory) {
        return userSkills[_user];
    }
    
    /**
     * @dev 获取用户所有工作经历
     */
    function getUserWorkExperiences(address _user) external view returns (WorkExperience[] memory) {
        return userWorkExperiences[_user];
    }
    
    /**
     * @dev 获取用户当前工作
     */
    function getCurrentWork(address _user) external view returns (WorkExperience memory) {
        WorkExperience[] memory experiences = userWorkExperiences[_user];
        for (uint256 i = 0; i < experiences.length; i++) {
            if (experiences[i].isCurrent) {
                return experiences[i];
            }
        }
        revert("No current work found");
    }
    
    /**
     * @dev 检查用户是否已注册
     */
    function isUserRegistered(address _user) external view returns (bool) {
        return userProfiles[_user].isActive;
    }
    
    /**
     * @dev 通过用户名查找用户
     */
    function getUserByUsername(string memory _username) external view returns (address) {
        return usernameToAddress[_username];
    }
}

