import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, polygon, polygonMumbai } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

// WalletConnect Project ID (需要从 https://cloud.walletconnect.com/ 获取)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

// 配置支持的区块链网络
export const chains = [mainnet, sepolia, polygon, polygonMumbai];

// 配置钱包连接器
export const config = createConfig({
  chains,
  connectors: [
    injected({ shimDisconnect: true }), // MetaMask, Brave, etc.
    walletConnect({
      projectId,
      metadata: {
        name: 'Dchat',
        description: 'Secure Business Communication Platform',
        url: 'https://dchat.pro',
        icons: ['https://dchat.pro/logo.png']
      },
      showQrModal: true
    }),
    coinbaseWallet({
      appName: 'Dchat',
      appLogoUrl: 'https://dchat.pro/logo.png'
    })
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http()
  }
});

// 导出常用的合约地址（根据实际部署更新）
export const contracts = {
  redPacket: {
    [mainnet.id]: '0x0000000000000000000000000000000000000000',
    [sepolia.id]: '0x0000000000000000000000000000000000000000',
    [polygon.id]: '0x0000000000000000000000000000000000000000',
    [polygonMumbai.id]: '0x0000000000000000000000000000000000000000'
  }
};
