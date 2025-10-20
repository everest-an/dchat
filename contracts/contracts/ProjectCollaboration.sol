// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProjectCollaboration
 * @dev 项目协作和资源共享合约
 * @notice 管理项目创建、协作者、里程碑和资源
 */
contract ProjectCollaboration {
    
    // 项目状态
    enum ProjectStatus {
        Planning,       // 规划中
        Active,         // 进行中
        Paused,         // 暂停
        Completed,      // 已完成
        Cancelled       // 已取消
    }
    
    // 项目结构
    struct Project {
        bytes32 projectId;          // 项目ID
        string name;                // 项目名称
        string description;         // 项目描述
        address owner;              // 项目所有者
        ProjectStatus status;       // 项目状态
        uint256 createdAt;          // 创建时间
        uint256 updatedAt;          // 更新时间
        uint256 budget;             // 预算
        uint256 progress;           // 进度 (0-100)
        bool isPublic;              // 是否公开
    }
    
    // 协作者结构
    struct Collaborator {
        address collaboratorAddress;  // 协作者地址
        string role;                  // 角色
        uint256 joinedAt;             // 加入时间
        bool isActive;                // 是否活跃
        uint256 contribution;         // 贡献度 (0-100)
    }
    
    // 里程碑结构
    struct Milestone {
        bytes32 milestoneId;        // 里程碑ID
        string title;               // 标题
        string description;         // 描述
        uint256 dueDate;            // 截止日期
        uint256 completedAt;        // 完成时间
        bool isCompleted;           // 是否完成
        uint256 reward;             // 奖励金额
    }
    
    // 资源结构
    struct Resource {
        bytes32 resourceId;         // 资源ID
        string resourceType;        // 资源类型
        string name;                // 资源名称
        string description;         // 描述
        address provider;           // 提供者
        uint256 addedAt;            // 添加时间
        bool isAvailable;           // 是否可用
    }
    
    // 存储所有项目
    mapping(bytes32 => Project) public projects;
    
    // 项目协作者
    mapping(bytes32 => Collaborator[]) public projectCollaborators;
    
    // 项目里程碑
    mapping(bytes32 => Milestone[]) public projectMilestones;
    
    // 项目资源
    mapping(bytes32 => Resource[]) public projectResources;
    
    // 用户创建的项目列表
    mapping(address => bytes32[]) public userProjects;
    
    // 用户参与的项目列表
    mapping(address => bytes32[]) public userCollaborations;
    
    // 公开项目列表
    bytes32[] public publicProjects;
    
    // 项目总数
    uint256 public totalProjects;
    
    // 事件
    event ProjectCreated(
        bytes32 indexed projectId,
        string name,
        address indexed owner,
        uint256 timestamp
    );
    
    event ProjectUpdated(
        bytes32 indexed projectId,
        ProjectStatus status,
        uint256 progress,
        uint256 timestamp
    );
    
    event CollaboratorAdded(
        bytes32 indexed projectId,
        address indexed collaborator,
        string role,
        uint256 timestamp
    );
    
    event CollaboratorRemoved(
        bytes32 indexed projectId,
        address indexed collaborator,
        uint256 timestamp
    );
    
    event MilestoneAdded(
        bytes32 indexed projectId,
        bytes32 indexed milestoneId,
        string title,
        uint256 dueDate
    );
    
    event MilestoneCompleted(
        bytes32 indexed projectId,
        bytes32 indexed milestoneId,
        uint256 timestamp
    );
    
    event ResourceAdded(
        bytes32 indexed projectId,
        bytes32 indexed resourceId,
        string resourceType,
        address indexed provider
    );
    
    /**
     * @dev 创建项目
     * @param _name 项目名称
     * @param _description 项目描述
     * @param _isPublic 是否公开
     * @return projectId 项目ID
     */
    function createProject(
        string memory _name,
        string memory _description,
        bool _isPublic
    ) external returns (bytes32) {
        require(bytes(_name).length > 0, "Project name cannot be empty");
        
        // 生成项目ID
        bytes32 projectId = keccak256(
            abi.encodePacked(
                _name,
                msg.sender,
                block.timestamp,
                totalProjects
            )
        );
        
        // 创建项目
        projects[projectId] = Project({
            projectId: projectId,
            name: _name,
            description: _description,
            owner: msg.sender,
            status: ProjectStatus.Planning,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            budget: 0,
            progress: 0,
            isPublic: _isPublic
        });
        
        // 添加所有者为协作者
        projectCollaborators[projectId].push(Collaborator({
            collaboratorAddress: msg.sender,
            role: "Owner",
            joinedAt: block.timestamp,
            isActive: true,
            contribution: 0
        }));
        
        // 更新用户项目列表
        userProjects[msg.sender].push(projectId);
        userCollaborations[msg.sender].push(projectId);
        
        // 如果是公开项目,添加到公开列表
        if (_isPublic) {
            publicProjects.push(projectId);
        }
        
        totalProjects++;
        
        emit ProjectCreated(projectId, _name, msg.sender, block.timestamp);
        
        return projectId;
    }
    
    /**
     * @dev 更新项目
     * @param _projectId 项目ID
     * @param _status 项目状态
     * @param _progress 进度
     * @param _budget 预算
     */
    function updateProject(
        bytes32 _projectId,
        ProjectStatus _status,
        uint256 _progress,
        uint256 _budget
    ) external {
        Project storage project = projects[_projectId];
        require(project.createdAt > 0, "Project does not exist");
        require(project.owner == msg.sender, "Only owner can update project");
        require(_progress <= 100, "Progress cannot exceed 100");
        
        project.status = _status;
        project.progress = _progress;
        project.budget = _budget;
        project.updatedAt = block.timestamp;
        
        emit ProjectUpdated(_projectId, _status, _progress, block.timestamp);
    }
    
    /**
     * @dev 添加协作者
     * @param _projectId 项目ID
     * @param _collaborator 协作者地址
     * @param _role 角色
     */
    function addCollaborator(
        bytes32 _projectId,
        address _collaborator,
        string memory _role
    ) external {
        Project storage project = projects[_projectId];
        require(project.createdAt > 0, "Project does not exist");
        require(project.owner == msg.sender, "Only owner can add collaborators");
        require(_collaborator != address(0), "Invalid collaborator address");
        
        // 检查是否已经是协作者
        Collaborator[] storage collaborators = projectCollaborators[_projectId];
        for (uint i = 0; i < collaborators.length; i++) {
            require(
                collaborators[i].collaboratorAddress != _collaborator,
                "Already a collaborator"
            );
        }
        
        // 添加协作者
        collaborators.push(Collaborator({
            collaboratorAddress: _collaborator,
            role: _role,
            joinedAt: block.timestamp,
            isActive: true,
            contribution: 0
        }));
        
        // 更新用户参与的项目列表
        userCollaborations[_collaborator].push(_projectId);
        
        emit CollaboratorAdded(_projectId, _collaborator, _role, block.timestamp);
    }
    
    /**
     * @dev 移除协作者
     * @param _projectId 项目ID
     * @param _collaborator 协作者地址
     */
    function removeCollaborator(
        bytes32 _projectId,
        address _collaborator
    ) external {
        Project storage project = projects[_projectId];
        require(project.createdAt > 0, "Project does not exist");
        require(project.owner == msg.sender, "Only owner can remove collaborators");
        require(_collaborator != project.owner, "Cannot remove project owner");
        
        // 查找并移除协作者
        Collaborator[] storage collaborators = projectCollaborators[_projectId];
        for (uint i = 0; i < collaborators.length; i++) {
            if (collaborators[i].collaboratorAddress == _collaborator) {
                collaborators[i].isActive = false;
                emit CollaboratorRemoved(_projectId, _collaborator, block.timestamp);
                return;
            }
        }
        
        revert("Collaborator not found");
    }
    
    /**
     * @dev 添加里程碑
     * @param _projectId 项目ID
     * @param _title 标题
     * @param _description 描述
     * @param _dueDate 截止日期
     * @param _reward 奖励金额
     * @return milestoneId 里程碑ID
     */
    function addMilestone(
        bytes32 _projectId,
        string memory _title,
        string memory _description,
        uint256 _dueDate,
        uint256 _reward
    ) external payable returns (bytes32) {
        Project storage project = projects[_projectId];
        require(project.createdAt > 0, "Project does not exist");
        require(_isCollaborator(_projectId, msg.sender), "Not a collaborator");
        require(_dueDate > block.timestamp, "Due date must be in the future");
        require(msg.value >= _reward, "Insufficient reward amount");
        
        // 生成里程碑ID
        bytes32 milestoneId = keccak256(
            abi.encodePacked(
                _projectId,
                _title,
                block.timestamp
            )
        );
        
        // 添加里程碑
        projectMilestones[_projectId].push(Milestone({
            milestoneId: milestoneId,
            title: _title,
            description: _description,
            dueDate: _dueDate,
            completedAt: 0,
            isCompleted: false,
            reward: _reward
        }));
        
        emit MilestoneAdded(_projectId, milestoneId, _title, _dueDate);
        
        return milestoneId;
    }
    
    /**
     * @dev 完成里程碑
     * @param _projectId 项目ID
     * @param _milestoneIndex 里程碑索引
     */
    function completeMilestone(
        bytes32 _projectId,
        uint256 _milestoneIndex
    ) external {
        Project storage project = projects[_projectId];
        require(project.createdAt > 0, "Project does not exist");
        require(project.owner == msg.sender, "Only owner can complete milestones");
        
        Milestone[] storage milestones = projectMilestones[_projectId];
        require(_milestoneIndex < milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = milestones[_milestoneIndex];
        require(!milestone.isCompleted, "Milestone already completed");
        
        milestone.isCompleted = true;
        milestone.completedAt = block.timestamp;
        
        emit MilestoneCompleted(_projectId, milestone.milestoneId, block.timestamp);
    }
    
    /**
     * @dev 添加资源
     * @param _projectId 项目ID
     * @param _resourceType 资源类型
     * @param _name 资源名称
     * @param _description 描述
     * @return resourceId 资源ID
     */
    function addResource(
        bytes32 _projectId,
        string memory _resourceType,
        string memory _name,
        string memory _description
    ) external returns (bytes32) {
        Project storage project = projects[_projectId];
        require(project.createdAt > 0, "Project does not exist");
        require(_isCollaborator(_projectId, msg.sender), "Not a collaborator");
        
        // 生成资源ID
        bytes32 resourceId = keccak256(
            abi.encodePacked(
                _projectId,
                _resourceType,
                _name,
                block.timestamp
            )
        );
        
        // 添加资源
        projectResources[_projectId].push(Resource({
            resourceId: resourceId,
            resourceType: _resourceType,
            name: _name,
            description: _description,
            provider: msg.sender,
            addedAt: block.timestamp,
            isAvailable: true
        }));
        
        emit ResourceAdded(_projectId, resourceId, _resourceType, msg.sender);
        
        return resourceId;
    }
    
    /**
     * @dev 检查是否为协作者
     * @param _projectId 项目ID
     * @param _user 用户地址
     * @return bool 是否为协作者
     */
    function _isCollaborator(bytes32 _projectId, address _user) private view returns (bool) {
        Collaborator[] storage collaborators = projectCollaborators[_projectId];
        for (uint i = 0; i < collaborators.length; i++) {
            if (collaborators[i].collaboratorAddress == _user && collaborators[i].isActive) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev 获取项目详情
     * @param _projectId 项目ID
     * @return Project 项目结构
     */
    function getProject(bytes32 _projectId) external view returns (Project memory) {
        Project memory project = projects[_projectId];
        require(project.createdAt > 0, "Project does not exist");
        require(
            project.isPublic || _isCollaborator(_projectId, msg.sender),
            "Not authorized to view this project"
        );
        
        return project;
    }
    
    /**
     * @dev 获取项目协作者列表
     * @param _projectId 项目ID
     * @return Collaborator[] 协作者列表
     */
    function getProjectCollaborators(bytes32 _projectId) external view returns (Collaborator[] memory) {
        require(projects[_projectId].createdAt > 0, "Project does not exist");
        return projectCollaborators[_projectId];
    }
    
    /**
     * @dev 获取项目里程碑列表
     * @param _projectId 项目ID
     * @return Milestone[] 里程碑列表
     */
    function getProjectMilestones(bytes32 _projectId) external view returns (Milestone[] memory) {
        require(projects[_projectId].createdAt > 0, "Project does not exist");
        return projectMilestones[_projectId];
    }
    
    /**
     * @dev 获取项目资源列表
     * @param _projectId 项目ID
     * @return Resource[] 资源列表
     */
    function getProjectResources(bytes32 _projectId) external view returns (Resource[] memory) {
        require(projects[_projectId].createdAt > 0, "Project does not exist");
        return projectResources[_projectId];
    }
    
    /**
     * @dev 获取用户创建的项目列表
     * @param _user 用户地址
     * @return bytes32[] 项目ID列表
     */
    function getUserProjects(address _user) external view returns (bytes32[] memory) {
        return userProjects[_user];
    }
    
    /**
     * @dev 获取用户参与的项目列表
     * @param _user 用户地址
     * @return bytes32[] 项目ID列表
     */
    function getUserCollaborations(address _user) external view returns (bytes32[] memory) {
        return userCollaborations[_user];
    }
    
    /**
     * @dev 获取所有公开项目
     * @return bytes32[] 项目ID列表
     */
    function getPublicProjects() external view returns (bytes32[] memory) {
        return publicProjects;
    }
}

