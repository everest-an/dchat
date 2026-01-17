// Web3 TODO: Translate '配置文件'
export const NETWORKS = {
  sepolia: {
    chainId: '0xaa36a7', // 11155111 in hex
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia.infura.io/v3/', 'https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  mainnet: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io']
  }
}

// TODO: Translate '默认网络'
export const DEFAULT_NETWORK = 'sepolia'

// TODO: Translate '智能合约地址'
export const CONTRACT_ADDRESSES = {
  sepolia: {
    UserIdentityV2: '0xa9403dCaBE90076e5aB9d942A2076f50ba96Ac2A',
    MessageStorageV2: '0x026371EA6a59Fc1B42551f44cd1fedA9521b09F5',
    PaymentEscrow: '0x199e4e527e625b7BF816a56Dbe65635EFf653500',
    ProjectCollaboration: '0x6Cb92a0D491e3316091e4C8680dFAD8009785579',
    LivingPortfolio: '0x1B57F4fA3fdc02b1F6c7F1b9646Ddfa6d7f86B48'
  },
  mainnet: {
    // TODO: TODO: Translate '部署到主网后填写'
    UserIdentityV2: '',
    MessageStorageV2: '',
    PaymentEscrow: '',
    ProjectCollaboration: '',
    LivingPortfolio: ''
  }
}

// RPC TODO: Translate '端点'
export const RPC_URLS = {
  sepolia: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  mainnet: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
}

// TODO: Translate '区块浏览器' URL
export const EXPLORER_URLS = {
  sepolia: 'https://sepolia.etherscan.io',
  mainnet: 'https://etherscan.io'
}

// TODO: Translate '获取合约地址'
export const getContractAddress = (contractName, network = DEFAULT_NETWORK) => {
  return CONTRACT_ADDRESSES[network]?.[contractName] || ''
}

// TODO: Translate '获取区块浏览器链接'
export const getExplorerUrl = (type, value, network = DEFAULT_NETWORK) => {
  const baseUrl = EXPLORER_URLS[network]
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${value}`
    case 'address':
      return `${baseUrl}/address/${value}`
    case 'block':
      return `${baseUrl}/block/${value}`
    case 'token':
      return `${baseUrl}/token/${value}`
    default:
      return baseUrl
  }
}

// TODO: Translate '格式化地址'
export const formatAddress = (address, length = 4) => {
  if (!address) return ''
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`
}

// TODO: Translate '格式化余额'
export const formatBalance = (balance, decimals = 4) => {
  if (!balance) return '0'
  const num = parseFloat(balance)
  return num.toFixed(decimals)
}
