// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GroupChatV2
 * @dev 群组聊天管理合约 - 支持群组创建、成员管理、权限控制
 * @notice 配合 MessageStorageV2 使用，提供完整的群聊功能
 */
contract GroupChatV2 {
    
    // 群组角色
    enum Role {
        MEMBER,     // 普通成员
        ADMIN,      // 管理员
        OWNER       // 群主
    }
    
    // 群组设置
    struct GroupSettings {
        bool isPublic;              // 是否公开群组
        bool allowMemberInvite;     // 允许成员邀请
        bool requireApproval;       // 需要审批加入
        uint256 maxMembers;         // 最大成员数
        bool muteAll;               // 全员禁言
    }
    
    // 群组信息
    struct Group {
        string groupId;             // 群组ID
        string groupName;           // 群组名称
        string groupAvatar;         // 群组头像 IPFS Hash
        string description;         // 群组描述
        address owner;              // 群主
        address[] members;          // 成员列表
        address[] admins;           // 管理员列表
        GroupSettings settings;     // 群组设置
        uint256 createdAt;          // 创建时间
        uint256 memberCount;        // 成员数量
        bool isActive;              // 是否活跃
    }
    
    // 成员信息
    struct Member {
        address memberAddress;      // 成员地址
        string displayName;         // 显示名称
        Role role;                  // 角色
        uint256 joinedAt;           // 加入时间
        bool isMuted;               // 是否被禁言
        bool isBanned;              // 是否被封禁
    }
    
    // 加入请求
    struct JoinRequest {
        address requester;          // 请求者
        string groupId;             // 群组ID
        string message;             // 申请消息
        uint256 requestedAt;        // 请求时间
        bool isPending;             // 是否待处理
    }
    
    // 存储所有群组
    mapping(string => Group) public groups;
    
    // 群组成员详情 (群组ID => 成员地址 => 成员信息)
    mapping(string => mapping(address => Member)) public groupMembers;
    
    // 用户加入的群组列表 (用户地址 => 群组ID列表)
    mapping(address => string[]) public userGroups;
    
    // 加入请求 (群组ID => 请求者地址 => 请求信息)
    mapping(string => mapping(address => JoinRequest)) public joinRequests;
    
    // 群组计数器
    uint256 public groupCounter;
    
    // 事件
    event GroupCreated(
        string indexed groupId,
        string groupName,
        address indexed owner,
        uint256 timestamp
    );
    
    event MemberJoined(
        string indexed groupId,
        address indexed member,
        uint256 timestamp
    );
    
    event MemberLeft(
        string indexed groupId,
        address indexed member,
        uint256 timestamp
    );
    
    event MemberRemoved(
        string indexed groupId,
        address indexed member,
        address indexed removedBy,
        uint256 timestamp
    );
    
    event RoleChanged(
        string indexed groupId,
        address indexed member,
        Role newRole,
        uint256 timestamp
    );
    
    event GroupSettingsUpdated(
        string indexed groupId,
        address indexed updatedBy,
        uint256 timestamp
    );
    
    event JoinRequestCreated(
        string indexed groupId,
        address indexed requester,
        uint256 timestamp
    );
    
    event JoinRequestApproved(
        string indexed groupId,
        address indexed requester,
        address indexed approver,
        uint256 timestamp
    );
    
    /**
     * @dev 创建群组
     */
    function createGroup(
        string memory _groupName,
        string memory _groupAvatar,
        string memory _description,
        bool _isPublic,
        uint256 _maxMembers
    ) external returns (string memory) {
        require(bytes(_groupName).length > 0, "Group name required");
        require(_maxMembers >= 2 && _maxMembers <= 1000, "Invalid max members");
        
        groupCounter++;
        string memory groupId = string(abi.encodePacked("group_", uint2str(groupCounter)));
        
        // 初始化成员数组
        address[] memory initialMembers = new address[](1);
        initialMembers[0] = msg.sender;
        
        address[] memory initialAdmins = new address[](0);
        
        // 创建群组
        groups[groupId] = Group({
            groupId: groupId,
            groupName: _groupName,
            groupAvatar: _groupAvatar,
            description: _description,
            owner: msg.sender,
            members: initialMembers,
            admins: initialAdmins,
            settings: GroupSettings({
                isPublic: _isPublic,
                allowMemberInvite: true,
                requireApproval: !_isPublic,
                maxMembers: _maxMembers,
                muteAll: false
            }),
            createdAt: block.timestamp,
            memberCount: 1,
            isActive: true
        });
        
        // 添加群主为成员
        groupMembers[groupId][msg.sender] = Member({
            memberAddress: msg.sender,
            displayName: "",
            role: Role.OWNER,
            joinedAt: block.timestamp,
            isMuted: false,
            isBanned: false
        });
        
        // 添加到用户群组列表
        userGroups[msg.sender].push(groupId);
        
        emit GroupCreated(groupId, _groupName, msg.sender, block.timestamp);
        
        return groupId;
    }
    
    /**
     * @dev 加入群组 (公开群组直接加入)
     */
    function joinGroup(string memory _groupId) external {
        Group storage group = groups[_groupId];
        require(group.isActive, "Group not active");
        require(group.memberCount < group.settings.maxMembers, "Group is full");
        require(!isMember(_groupId, msg.sender), "Already a member");
        require(!groupMembers[_groupId][msg.sender].isBanned, "You are banned");
        
        if (group.settings.requireApproval) {
            // 需要审批，创建加入请求
            joinRequests[_groupId][msg.sender] = JoinRequest({
                requester: msg.sender,
                groupId: _groupId,
                message: "",
                requestedAt: block.timestamp,
                isPending: true
            });
            
            emit JoinRequestCreated(_groupId, msg.sender, block.timestamp);
        } else {
            // 直接加入
            _addMember(_groupId, msg.sender, Role.MEMBER);
        }
    }
    
    /**
     * @dev 邀请成员加入
     */
    function inviteMember(string memory _groupId, address _member) external {
        Group storage group = groups[_groupId];
        require(group.isActive, "Group not active");
        require(isMember(_groupId, msg.sender), "Not a member");
        require(!isMember(_groupId, _member), "Already a member");
        require(group.memberCount < group.settings.maxMembers, "Group is full");
        
        Member storage inviter = groupMembers[_groupId][msg.sender];
        
        // 检查邀请权限
        if (!group.settings.allowMemberInvite) {
            require(inviter.role == Role.ADMIN || inviter.role == Role.OWNER, "No permission");
        }
        
        _addMember(_groupId, _member, Role.MEMBER);
    }
    
    /**
     * @dev 批准加入请求
     */
    function approveJoinRequest(string memory _groupId, address _requester) external {
        require(isMember(_groupId, msg.sender), "Not a member");
        
        Member storage approver = groupMembers[_groupId][msg.sender];
        require(approver.role == Role.ADMIN || approver.role == Role.OWNER, "No permission");
        
        JoinRequest storage request = joinRequests[_groupId][_requester];
        require(request.isPending, "No pending request");
        
        request.isPending = false;
        _addMember(_groupId, _requester, Role.MEMBER);
        
        emit JoinRequestApproved(_groupId, _requester, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 拒绝加入请求
     */
    function rejectJoinRequest(string memory _groupId, address _requester) external {
        require(isMember(_groupId, msg.sender), "Not a member");
        
        Member storage rejecter = groupMembers[_groupId][msg.sender];
        require(rejecter.role == Role.ADMIN || rejecter.role == Role.OWNER, "No permission");
        
        JoinRequest storage request = joinRequests[_groupId][_requester];
        require(request.isPending, "No pending request");
        
        request.isPending = false;
    }
    
    /**
     * @dev 离开群组
     */
    function leaveGroup(string memory _groupId) external {
        require(isMember(_groupId, msg.sender), "Not a member");
        
        Member storage member = groupMembers[_groupId][msg.sender];
        require(member.role != Role.OWNER, "Owner cannot leave");
        
        _removeMember(_groupId, msg.sender);
        
        emit MemberLeft(_groupId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 移除成员
     */
    function removeMember(string memory _groupId, address _member) external {
        require(isMember(_groupId, msg.sender), "Not a member");
        require(isMember(_groupId, _member), "Target not a member");
        
        Member storage remover = groupMembers[_groupId][msg.sender];
        Member storage target = groupMembers[_groupId][_member];
        
        // 权限检查
        require(remover.role == Role.ADMIN || remover.role == Role.OWNER, "No permission");
        require(target.role != Role.OWNER, "Cannot remove owner");
        
        if (remover.role == Role.ADMIN) {
            require(target.role == Role.MEMBER, "Admin can only remove members");
        }
        
        _removeMember(_groupId, _member);
        
        emit MemberRemoved(_groupId, _member, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 设置管理员
     */
    function setAdmin(string memory _groupId, address _member, bool _isAdmin) external {
        Group storage group = groups[_groupId];
        require(group.owner == msg.sender, "Only owner can set admin");
        require(isMember(_groupId, _member), "Not a member");
        
        Member storage member = groupMembers[_groupId][_member];
        
        if (_isAdmin) {
            require(member.role == Role.MEMBER, "Already admin or owner");
            member.role = Role.ADMIN;
            group.admins.push(_member);
        } else {
            require(member.role == Role.ADMIN, "Not an admin");
            member.role = Role.MEMBER;
            
            // 从管理员列表移除
            for (uint256 i = 0; i < group.admins.length; i++) {
                if (group.admins[i] == _member) {
                    group.admins[i] = group.admins[group.admins.length - 1];
                    group.admins.pop();
                    break;
                }
            }
        }
        
        emit RoleChanged(_groupId, _member, member.role, block.timestamp);
    }
    
    /**
     * @dev 转让群主
     */
    function transferOwnership(string memory _groupId, address _newOwner) external {
        Group storage group = groups[_groupId];
        require(group.owner == msg.sender, "Not the owner");
        require(isMember(_groupId, _newOwner), "New owner not a member");
        
        // 原群主变为管理员
        groupMembers[_groupId][msg.sender].role = Role.ADMIN;
        group.admins.push(msg.sender);
        
        // 新群主
        Member storage newOwner = groupMembers[_groupId][_newOwner];
        
        // 如果新群主是管理员，从管理员列表移除
        if (newOwner.role == Role.ADMIN) {
            for (uint256 i = 0; i < group.admins.length; i++) {
                if (group.admins[i] == _newOwner) {
                    group.admins[i] = group.admins[group.admins.length - 1];
                    group.admins.pop();
                    break;
                }
            }
        }
        
        newOwner.role = Role.OWNER;
        group.owner = _newOwner;
        
        emit RoleChanged(_groupId, _newOwner, Role.OWNER, block.timestamp);
    }
    
    /**
     * @dev 禁言/解除禁言成员
     */
    function muteMember(string memory _groupId, address _member, bool _mute) external {
        require(isMember(_groupId, msg.sender), "Not a member");
        require(isMember(_groupId, _member), "Target not a member");
        
        Member storage operator = groupMembers[_groupId][msg.sender];
        Member storage target = groupMembers[_groupId][_member];
        
        require(operator.role == Role.ADMIN || operator.role == Role.OWNER, "No permission");
        require(target.role == Role.MEMBER, "Cannot mute admin or owner");
        
        target.isMuted = _mute;
    }
    
    /**
     * @dev 更新群组设置
     */
    function updateGroupSettings(
        string memory _groupId,
        bool _isPublic,
        bool _allowMemberInvite,
        bool _requireApproval,
        uint256 _maxMembers,
        bool _muteAll
    ) external {
        Group storage group = groups[_groupId];
        require(group.owner == msg.sender, "Only owner can update settings");
        require(_maxMembers >= group.memberCount, "Max members too low");
        
        group.settings = GroupSettings({
            isPublic: _isPublic,
            allowMemberInvite: _allowMemberInvite,
            requireApproval: _requireApproval,
            maxMembers: _maxMembers,
            muteAll: _muteAll
        });
        
        emit GroupSettingsUpdated(_groupId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 更新群组信息
     */
    function updateGroupInfo(
        string memory _groupId,
        string memory _groupName,
        string memory _groupAvatar,
        string memory _description
    ) external {
        Group storage group = groups[_groupId];
        
        Member storage member = groupMembers[_groupId][msg.sender];
        require(member.role == Role.ADMIN || member.role == Role.OWNER, "No permission");
        
        if (bytes(_groupName).length > 0) {
            group.groupName = _groupName;
        }
        if (bytes(_groupAvatar).length > 0) {
            group.groupAvatar = _groupAvatar;
        }
        if (bytes(_description).length > 0) {
            group.description = _description;
        }
    }
    
    /**
     * @dev 解散群组
     */
    function dissolveGroup(string memory _groupId) external {
        Group storage group = groups[_groupId];
        require(group.owner == msg.sender, "Only owner can dissolve");
        
        group.isActive = false;
    }
    
    /**
     * @dev 检查是否为成员
     */
    function isMember(string memory _groupId, address _user) public view returns (bool) {
        return groupMembers[_groupId][_user].memberAddress != address(0);
    }
    
    /**
     * @dev 获取群组信息
     */
    function getGroup(string memory _groupId) external view returns (Group memory) {
        return groups[_groupId];
    }
    
    /**
     * @dev 获取成员信息
     */
    function getMember(string memory _groupId, address _member) external view returns (Member memory) {
        return groupMembers[_groupId][_member];
    }
    
    /**
     * @dev 获取用户加入的群组列表
     */
    function getUserGroups(address _user) external view returns (string[] memory) {
        return userGroups[_user];
    }
    
    /**
     * @dev 获取群组成员列表
     */
    function getGroupMembers(string memory _groupId) external view returns (address[] memory) {
        return groups[_groupId].members;
    }
    
    /**
     * @dev 内部函数: 添加成员
     */
    function _addMember(string memory _groupId, address _member, Role _role) internal {
        Group storage group = groups[_groupId];
        
        group.members.push(_member);
        group.memberCount++;
        
        groupMembers[_groupId][_member] = Member({
            memberAddress: _member,
            displayName: "",
            role: _role,
            joinedAt: block.timestamp,
            isMuted: false,
            isBanned: false
        });
        
        userGroups[_member].push(_groupId);
        
        emit MemberJoined(_groupId, _member, block.timestamp);
    }
    
    /**
     * @dev 内部函数: 移除成员
     */
    function _removeMember(string memory _groupId, address _member) internal {
        Group storage group = groups[_groupId];
        
        // 从成员列表移除
        for (uint256 i = 0; i < group.members.length; i++) {
            if (group.members[i] == _member) {
                group.members[i] = group.members[group.members.length - 1];
                group.members.pop();
                break;
            }
        }
        
        group.memberCount--;
        
        // 从用户群组列表移除
        string[] storage userGroupList = userGroups[_member];
        for (uint256 i = 0; i < userGroupList.length; i++) {
            if (keccak256(bytes(userGroupList[i])) == keccak256(bytes(_groupId))) {
                userGroupList[i] = userGroupList[userGroupList.length - 1];
                userGroupList.pop();
                break;
            }
        }
        
        delete groupMembers[_groupId][_member];
    }
    
    /**
     * @dev 辅助函数: uint 转 string
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }
}
