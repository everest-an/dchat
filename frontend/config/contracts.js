// Dchat Smart Contract Configuration
// Deployed on Sepolia Testnet

export const CHAIN_ID = 11155111; // Sepolia
export const NETWORK_NAME = 'sepolia';

// Contract addresses from deployment files (backend source of truth)
// Last updated: 2025-11-04
export const CONTRACT_ADDRESSES = {
  // Core contracts (deployment-v2-addresses.json)
  UserIdentity: '0x6BCF16f82F8d3A37b7b6fd59DeE9adf95B1BA5a1',  // UserIdentityV2
  MessageStorage: '0x906626694a065bEECf51F2C776f272bDB67Ce174',  // MessageStorageV2

  // Group functionality contracts (deployment-group-contracts.json)
  GroupChat: '0x4f93AEaAE5981fd6C95cFA8096D31D3d92ae2F28',  // GroupChatV2
  GroupPayment: '0x788Ba6e9B0EB746F58E4bab891B9c0add8359541',  // GroupPayment
  RedPacket: '0x0354fCfB243639d37F84E8d00031422655219f75',  // RedPacket

  // Subscription contracts (deployment-subscription-contracts.json)
  SubscriptionManager: '0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8',  // SubscriptionManager
  NFTAvatarManager: '0xF91E0E6afF5A93831F67838539245a44Ca384187',  // NFTAvatarManager

  // Legacy contracts (deprecated)
  PaymentEscrow: '0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6',
  ProjectCollaboration: '0x09668e0764B43E8093a65d33620DeAd9BDa1d85c',
};

export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/NgBhOA3zYpCBd3LopKZ6n-lWXJoN_IUQM'; // WARNING: Fallback specific to this repo, override in production!

export const EXPLORER_URL = 'https://sepolia.etherscan.io';

// Contract ABIs (simplified - add full ABIs from artifacts)
export const CONTRACT_ABIS = {
  MessageStorage: [
    'function storeMessage(address recipient, bytes32 messageHash, string memory ipfsHash) external returns (bytes32)',
    'function getMessage(bytes32 messageId) external view returns (tuple(bytes32 messageId, address sender, address recipient, bytes32 messageHash, string ipfsHash, uint256 timestamp, bool isDeleted))',
    'function getUserSentMessages(address user) external view returns (bytes32[] memory)',
    'function getUserReceivedMessages(address user) external view returns (bytes32[] memory)',
    'function deleteMessage(bytes32 messageId) external',
    'event MessageStored(bytes32 indexed messageId, address indexed sender, address indexed recipient, bytes32 messageHash, string ipfsHash, uint256 timestamp)',
  ],
  PaymentEscrow: [
    'function createPayment(address payee, string memory description) external payable returns (bytes32)',
    'function createEscrow(address payee, uint256 releaseTime, string memory description) external payable returns (bytes32)',
    'function releaseEscrow(bytes32 escrowId) external',
    'function refundEscrow(bytes32 escrowId) external',
    'function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, address payer, address payee, uint256 amount, uint256 timestamp, uint8 status))',
    'function getEscrow(bytes32 escrowId) external view returns (tuple(bytes32 escrowId, address payer, address payee, uint256 amount, uint256 releaseTime, uint8 status))',
    'event PaymentCreated(bytes32 indexed paymentId, address indexed payer, address indexed payee, uint256 amount, uint256 timestamp)',
    'event EscrowCreated(bytes32 indexed escrowId, address indexed payer, address indexed payee, uint256 amount, uint256 releaseTime)',
    'event EscrowReleased(bytes32 indexed escrowId, address indexed payee, uint256 amount)',
  ],
  UserIdentity: [
    'function registerUser(string memory username, string memory emailHash) external',
    'function verifyLinkedIn(string memory linkedInId) external',
    'function verifyEmail() external',
    'function updateReputation(address user, int256 change) external',
    'function getUserProfile(address user) external view returns (tuple(address userAddress, string username, string emailHash, string linkedInId, bool isLinkedInVerified, bool isEmailVerified, uint256 reputationScore, uint256 registrationTime))',
    'function isUserRegistered(address user) external view returns (bool)',
    'event UserRegistered(address indexed userAddress, string username, uint256 timestamp)',
    'event LinkedInVerified(address indexed userAddress, string linkedInId)',
    'event ReputationUpdated(address indexed userAddress, uint256 newScore)',
  ],
  ProjectCollaboration: [
    'function createProject(string memory name, string memory description, bool isPublic) external returns (bytes32)',
    'function addCollaborator(bytes32 projectId, address collaborator, uint8 role) external',
    'function addMilestone(bytes32 projectId, string memory title, string memory description, uint256 dueDate, uint256 reward) external returns (bytes32)',
    'function completeMilestone(bytes32 projectId, bytes32 milestoneId) external',
    'function updateProgress(bytes32 projectId, uint256 progress) external',
    'function getProject(bytes32 projectId) external view returns (tuple(bytes32 projectId, string name, string description, address owner, uint8 status, uint256 progress, uint256 createdAt))',
    'event ProjectCreated(bytes32 indexed projectId, address indexed owner, string name, uint256 timestamp)',
    'event CollaboratorAdded(bytes32 indexed projectId, address indexed collaborator, uint8 role)',
    'event MilestoneCompleted(bytes32 indexed projectId, bytes32 indexed milestoneId, uint256 timestamp)',
  ],
};

// Helper function to get contract instance
export function getContractConfig(contractName) {
  return {
    address: CONTRACT_ADDRESSES[contractName],
    abi: CONTRACT_ABIS[contractName],
  };
}

// Etherscan links
export function getEtherscanLink(address, type = 'address') {
  return `${EXPLORER_URL}/${type}/${address}`;
}

export function getTransactionLink(txHash) {
  return getEtherscanLink(txHash, 'tx');
}

export function getAddressLink(address) {
  return getEtherscanLink(address, 'address');
}

