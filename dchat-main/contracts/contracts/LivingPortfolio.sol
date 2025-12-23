// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LivingPortfolio
 * @dev 动态作品集合约 - 自动展示当前项目、空闲时间和可用性
 * @notice 支持实时项目更新、可用性管理、被动发现和机会匹配
 */
contract LivingPortfolio {
    
    // 项目状态
    enum ProjectStatus {
        PLANNING,       // 规划中
        IN_PROGRESS,    // 进行中
        COMPLETED,      // 已完成
        ON_HOLD,        // 暂停
        CANCELLED       // 取消
    }
    
    // 可用性状态
    enum AvailabilityStatus {
        AVAILABLE,          // 可用
        PARTIALLY_AVAILABLE, // 部分可用
        BUSY,               // 忙碌
        NOT_AVAILABLE       // 不可用
    }
    
    // 项目结构
    struct Project {
        uint256 projectId;          // 项目ID
        string title;               // 项目标题
        string description;         // 项目描述
        string category;            // 项目分类
        string[] skills;            // 所需技能
        ProjectStatus status;       // 项目状态
        uint256 progress;           // 进度 (0-100)
        uint256 startDate;          // 开始日期
        uint256 endDate;            // 结束日期
        uint256 estimatedHours;     // 预计工时
        uint256 actualHours;        // 实际工时
        address client;             // 客户地址
        bool isPublic;              // 是否公开
        bool isVerified;            // 是否验证
        string[] deliverables;      // 交付成果
        uint256 createdAt;          // 创建时间
        uint256 lastUpdated;        // 最后更新时间
    }
    
    // 可用性时间段
    struct AvailabilitySlot {
        uint256 startTime;          // 开始时间
        uint256 endTime;            // 结束时间
        uint256 hoursPerWeek;       // 每周可用小时数
        AvailabilityStatus status;  // 可用性状态
        string note;                // 备注
    }
    
    // 用户作品集
    struct Portfolio {
        address owner;              // 所有者
        string title;               // 作品集标题
        string bio;                 // 个人简介
        string[] skills;            // 技能列表
        string[] interests;         // 兴趣领域
        uint256 hourlyRate;         // 时薪 (wei)
        AvailabilityStatus currentStatus; // 当前状态
        uint256 totalProjects;      // 总项目数
        uint256 completedProjects;  // 完成项目数
        uint256 totalHours;         // 总工时
        uint256 reputationScore;    // 信誉评分
        bool isActive;              // 是否活跃
        uint256 createdAt;          // 创建时间
        uint256 lastUpdated;        // 最后更新时间
    }
    
    // 订阅者结构 (用于被动发现)
    struct Subscriber {
        address subscriberAddress;  // 订阅者地址
        uint256 subscribedAt;       // 订阅时间
        bool notifyAvailability;    // 通知可用性变化
        bool notifyNewProjects;     // 通知新项目
        bool notifySkillUpdates;    // 通知技能更新
    }
    
    // 机会匹配结构
    struct OpportunityMatch {
        uint256 matchId;            // 匹配ID
        address seeker;             // 寻求者
        address provider;           // 提供者
        string[] requiredSkills;    // 所需技能
        uint256 matchScore;         // 匹配分数 (0-100)
        uint256 createdAt;          // 创建时间
        bool isActive;              // 是否活跃
    }
    
    // 已验证凭证
    struct VerifiedCredential {
        uint256 credentialId;       // 凭证ID
        address issuer;             // 发行者
        address recipient;          // 接收者
        string credentialType;      // 凭证类型
        string title;               // 标题
        string description;         // 描述
        uint256 projectId;          // 关联项目ID
        string evidenceHash;        // 证据哈希 (IPFS)
        uint256 issuedAt;           // 发行时间
        bool isVerified;            // 是否验证
    }
    
    // 存储用户作品集
    mapping(address => Portfolio) public portfolios;
    
    // 存储用户项目
    mapping(address => Project[]) public userProjects;
    
    // 存储用户可用性
    mapping(address => AvailabilitySlot[]) public userAvailability;
    
    // 存储订阅关系 (被订阅者 => 订阅者列表)
    mapping(address => Subscriber[]) public subscribers;
    
    // 存储机会匹配
    mapping(uint256 => OpportunityMatch) public opportunityMatches;
    
    // 存储已验证凭证
    mapping(address => VerifiedCredential[]) public userCredentials;
    
    // 技能索引 (技能 => 拥有该技能的用户列表)
    mapping(string => address[]) public skillIndex;
    
    // 项目计数器
    uint256 public projectCounter;
    
    // 匹配计数器
    uint256 public matchCounter;
    
    // 凭证计数器
    uint256 public credentialCounter;
    
    // 事件
    event PortfolioCreated(address indexed owner, uint256 timestamp);
    event PortfolioUpdated(address indexed owner, uint256 timestamp);
    event ProjectAdded(address indexed owner, uint256 projectId, string title, uint256 timestamp);
    event ProjectUpdated(address indexed owner, uint256 projectId, ProjectStatus status, uint256 progress, uint256 timestamp);
    event AvailabilityUpdated(address indexed owner, AvailabilityStatus status, uint256 timestamp);
    event SubscriberAdded(address indexed owner, address indexed subscriber, uint256 timestamp);
    event OpportunityMatched(uint256 indexed matchId, address indexed seeker, address indexed provider, uint256 matchScore, uint256 timestamp);
    event CredentialIssued(uint256 indexed credentialId, address indexed issuer, address indexed recipient, uint256 timestamp);
    
    // 修饰符
    modifier onlyPortfolioOwner() {
        require(portfolios[msg.sender].isActive, "Portfolio not found");
        _;
    }
    
    /**
     * @dev 创建作品集
     */
    function createPortfolio(
        string memory _title,
        string memory _bio,
        string[] memory _skills,
        uint256 _hourlyRate
    ) external {
        require(!portfolios[msg.sender].isActive, "Portfolio already exists");
        
        portfolios[msg.sender] = Portfolio({
            owner: msg.sender,
            title: _title,
            bio: _bio,
            skills: _skills,
            interests: new string[](0),
            hourlyRate: _hourlyRate,
            currentStatus: AvailabilityStatus.AVAILABLE,
            totalProjects: 0,
            completedProjects: 0,
            totalHours: 0,
            reputationScore: 100,
            isActive: true,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });
        
        // 添加到技能索引
        for (uint256 i = 0; i < _skills.length; i++) {
            skillIndex[_skills[i]].push(msg.sender);
        }
        
        emit PortfolioCreated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 添加项目
     */
    function addProject(
        string memory _title,
        string memory _description,
        string memory _category,
        string[] memory _skills,
        uint256 _startDate,
        uint256 _estimatedHours,
        bool _isPublic
    ) external onlyPortfolioOwner returns (uint256) {
        projectCounter++;
        
        Project memory newProject = Project({
            projectId: projectCounter,
            title: _title,
            description: _description,
            category: _category,
            skills: _skills,
            status: ProjectStatus.PLANNING,
            progress: 0,
            startDate: _startDate,
            endDate: 0,
            estimatedHours: _estimatedHours,
            actualHours: 0,
            client: address(0),
            isPublic: _isPublic,
            isVerified: false,
            deliverables: new string[](0),
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });
        
        userProjects[msg.sender].push(newProject);
        
        Portfolio storage portfolio = portfolios[msg.sender];
        portfolio.totalProjects++;
        portfolio.lastUpdated = block.timestamp;
        
        emit ProjectAdded(msg.sender, projectCounter, _title, block.timestamp);
        
        // 通知订阅者
        _notifySubscribers(msg.sender, "newProject");
        
        return projectCounter;
    }
    
    /**
     * @dev 更新项目进度
     */
    function updateProjectProgress(
        uint256 _projectIndex,
        ProjectStatus _status,
        uint256 _progress,
        uint256 _actualHours
    ) external onlyPortfolioOwner {
        require(_projectIndex < userProjects[msg.sender].length, "Invalid project index");
        require(_progress <= 100, "Progress must be 0-100");
        
        Project storage project = userProjects[msg.sender][_projectIndex];
        project.status = _status;
        project.progress = _progress;
        project.actualHours = _actualHours;
        project.lastUpdated = block.timestamp;
        
        // 如果项目完成,更新统计
        if (_status == ProjectStatus.COMPLETED && project.progress == 100) {
            project.endDate = block.timestamp;
            Portfolio storage portfolio = portfolios[msg.sender];
            portfolio.completedProjects++;
            portfolio.totalHours += _actualHours;
        }
        
        emit ProjectUpdated(msg.sender, project.projectId, _status, _progress, block.timestamp);
    }
    
    /**
     * @dev 更新可用性状态
     */
    function updateAvailability(
        AvailabilityStatus _status,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _hoursPerWeek,
        string memory _note
    ) external onlyPortfolioOwner {
        userAvailability[msg.sender].push(AvailabilitySlot({
            startTime: _startTime,
            endTime: _endTime,
            hoursPerWeek: _hoursPerWeek,
            status: _status,
            note: _note
        }));
        
        Portfolio storage portfolio = portfolios[msg.sender];
        portfolio.currentStatus = _status;
        portfolio.lastUpdated = block.timestamp;
        
        emit AvailabilityUpdated(msg.sender, _status, block.timestamp);
        
        // 通知订阅者
        _notifySubscribers(msg.sender, "availabilityChange");
    }
    
    /**
     * @dev 订阅用户更新 (被动发现)
     */
    function subscribe(
        address _user,
        bool _notifyAvailability,
        bool _notifyNewProjects,
        bool _notifySkillUpdates
    ) external {
        require(portfolios[_user].isActive, "User portfolio not found");
        require(_user != msg.sender, "Cannot subscribe to yourself");
        
        subscribers[_user].push(Subscriber({
            subscriberAddress: msg.sender,
            subscribedAt: block.timestamp,
            notifyAvailability: _notifyAvailability,
            notifyNewProjects: _notifyNewProjects,
            notifySkillUpdates: _notifySkillUpdates
        }));
        
        emit SubscriberAdded(_user, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 创建机会匹配
     */
    function createOpportunityMatch(
        string[] memory _requiredSkills
    ) external onlyPortfolioOwner returns (uint256[] memory) {
        matchCounter++;
        
        // 查找匹配的提供者
        address[] memory potentialMatches = _findMatchingProviders(_requiredSkills);
        uint256[] memory matchIds = new uint256[](potentialMatches.length);
        
        for (uint256 i = 0; i < potentialMatches.length; i++) {
            uint256 matchScore = _calculateMatchScore(potentialMatches[i], _requiredSkills);
            
            opportunityMatches[matchCounter + i] = OpportunityMatch({
                matchId: matchCounter + i,
                seeker: msg.sender,
                provider: potentialMatches[i],
                requiredSkills: _requiredSkills,
                matchScore: matchScore,
                createdAt: block.timestamp,
                isActive: true
            });
            
            matchIds[i] = matchCounter + i;
            
            emit OpportunityMatched(matchCounter + i, msg.sender, potentialMatches[i], matchScore, block.timestamp);
        }
        
        matchCounter += potentialMatches.length;
        
        return matchIds;
    }
    
    /**
     * @dev 发行已验证凭证
     */
    function issueCredential(
        address _recipient,
        string memory _credentialType,
        string memory _title,
        string memory _description,
        uint256 _projectId,
        string memory _evidenceHash
    ) external returns (uint256) {
        require(portfolios[_recipient].isActive, "Recipient portfolio not found");
        
        credentialCounter++;
        
        VerifiedCredential memory credential = VerifiedCredential({
            credentialId: credentialCounter,
            issuer: msg.sender,
            recipient: _recipient,
            credentialType: _credentialType,
            title: _title,
            description: _description,
            projectId: _projectId,
            evidenceHash: _evidenceHash,
            issuedAt: block.timestamp,
            isVerified: true
        });
        
        userCredentials[_recipient].push(credential);
        
        // 增加接收者的信誉分数
        Portfolio storage portfolio = portfolios[_recipient];
        portfolio.reputationScore += 10;
        
        emit CredentialIssued(credentialCounter, msg.sender, _recipient, block.timestamp);
        
        return credentialCounter;
    }
    
    /**
     * @dev 内部函数: 通知订阅者
     */
    function _notifySubscribers(address _user, string memory _eventType) internal {
        // 在实际应用中,这里会触发链下通知系统
        // 这里只记录事件,前端监听事件来发送通知
    }
    
    /**
     * @dev 内部函数: 查找匹配的提供者
     */
    function _findMatchingProviders(string[] memory _requiredSkills) internal view returns (address[] memory) {
        // 简化版本: 返回拥有至少一个所需技能的用户
        address[] memory matches = new address[](100); // 最多返回100个匹配
        uint256 matchCount = 0;
        
        for (uint256 i = 0; i < _requiredSkills.length && matchCount < 100; i++) {
            address[] memory skillUsers = skillIndex[_requiredSkills[i]];
            for (uint256 j = 0; j < skillUsers.length && matchCount < 100; j++) {
                if (portfolios[skillUsers[j]].currentStatus == AvailabilityStatus.AVAILABLE ||
                    portfolios[skillUsers[j]].currentStatus == AvailabilityStatus.PARTIALLY_AVAILABLE) {
                    matches[matchCount] = skillUsers[j];
                    matchCount++;
                }
            }
        }
        
        // 调整数组大小
        address[] memory result = new address[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            result[i] = matches[i];
        }
        
        return result;
    }
    
    /**
     * @dev 内部函数: 计算匹配分数
     */
    function _calculateMatchScore(address _provider, string[] memory _requiredSkills) internal view returns (uint256) {
        Portfolio storage portfolio = portfolios[_provider];
        uint256 matchedSkills = 0;
        
        for (uint256 i = 0; i < _requiredSkills.length; i++) {
            for (uint256 j = 0; j < portfolio.skills.length; j++) {
                if (keccak256(bytes(_requiredSkills[i])) == keccak256(bytes(portfolio.skills[j]))) {
                    matchedSkills++;
                    break;
                }
            }
        }
        
        // 匹配分数 = (匹配技能数 / 所需技能数) * 100
        return (matchedSkills * 100) / _requiredSkills.length;
    }
    
    /**
     * @dev 获取用户作品集
     */
    function getPortfolio(address _user) external view returns (Portfolio memory) {
        return portfolios[_user];
    }
    
    /**
     * @dev 获取用户所有项目
     */
    function getUserProjects(address _user) external view returns (Project[] memory) {
        return userProjects[_user];
    }
    
    /**
     * @dev 获取用户当前项目 (进行中的项目)
     */
    function getCurrentProjects(address _user) external view returns (Project[] memory) {
        Project[] memory allProjects = userProjects[_user];
        uint256 currentCount = 0;
        
        // 计算进行中的项目数量
        for (uint256 i = 0; i < allProjects.length; i++) {
            if (allProjects[i].status == ProjectStatus.IN_PROGRESS) {
                currentCount++;
            }
        }
        
        // 创建结果数组
        Project[] memory currentProjects = new Project[](currentCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allProjects.length; i++) {
            if (allProjects[i].status == ProjectStatus.IN_PROGRESS) {
                currentProjects[index] = allProjects[i];
                index++;
            }
        }
        
        return currentProjects;
    }
    
    /**
     * @dev 获取用户可用性
     */
    function getUserAvailability(address _user) external view returns (AvailabilitySlot[] memory) {
        return userAvailability[_user];
    }
    
    /**
     * @dev 获取用户凭证
     */
    function getUserCredentials(address _user) external view returns (VerifiedCredential[] memory) {
        return userCredentials[_user];
    }
    
    /**
     * @dev 获取订阅者列表
     */
    function getSubscribers(address _user) external view returns (Subscriber[] memory) {
        return subscribers[_user];
    }
}

