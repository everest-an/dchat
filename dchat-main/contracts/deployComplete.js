const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting complete deployment of Dchat commercial platform...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  const contracts = {};

  // 1. 部署 UserIdentityV2
  console.log("📦 [1/5] Deploying UserIdentityV2...");
  const UserIdentityV2 = await hre.ethers.getContractFactory("UserIdentityV2");
  const userIdentityV2 = await UserIdentityV2.deploy();
  await userIdentityV2.waitForDeployment();
  contracts.UserIdentityV2 = await userIdentityV2.getAddress();
  console.log("✅ UserIdentityV2 deployed to:", contracts.UserIdentityV2);
  console.log("");

  // 2. 部署 MessageStorageV2
  console.log("📦 [2/5] Deploying MessageStorageV2...");
  const MessageStorageV2 = await hre.ethers.getContractFactory("MessageStorageV2");
  const messageStorageV2 = await MessageStorageV2.deploy();
  await messageStorageV2.waitForDeployment();
  contracts.MessageStorageV2 = await messageStorageV2.getAddress();
  console.log("✅ MessageStorageV2 deployed to:", contracts.MessageStorageV2);
  console.log("");

  // 3. 部署 PaymentEscrow
  console.log("📦 [3/5] Deploying PaymentEscrow...");
  const PaymentEscrow = await hre.ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await PaymentEscrow.deploy();
  await paymentEscrow.waitForDeployment();
  contracts.PaymentEscrow = await paymentEscrow.getAddress();
  console.log("✅ PaymentEscrow deployed to:", contracts.PaymentEscrow);
  console.log("");

  // 4. 部署 ProjectCollaboration
  console.log("📦 [4/5] Deploying ProjectCollaboration...");
  const ProjectCollaboration = await hre.ethers.getContractFactory("ProjectCollaboration");
  const projectCollaboration = await ProjectCollaboration.deploy();
  await projectCollaboration.waitForDeployment();
  contracts.ProjectCollaboration = await projectCollaboration.getAddress();
  console.log("✅ ProjectCollaboration deployed to:", contracts.ProjectCollaboration);
  console.log("");

  // 5. 部署 LivingPortfolio
  console.log("📦 [5/5] Deploying LivingPortfolio...");
  const LivingPortfolio = await hre.ethers.getContractFactory("LivingPortfolio");
  const livingPortfolio = await LivingPortfolio.deploy();
  await livingPortfolio.waitForDeployment();
  contracts.LivingPortfolio = await livingPortfolio.getAddress();
  console.log("✅ LivingPortfolio deployed to:", contracts.LivingPortfolio);
  console.log("");

  // 保存部署地址
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: contracts
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-complete-addresses.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📝 Deployment information saved to deployment-complete-addresses.json\n");

  // 显示部署摘要
  console.log("=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE - DCHAT COMMERCIAL PLATFORM!");
  console.log("=".repeat(70));
  console.log("\n📋 Contract Addresses:");
  console.log("  UserIdentityV2:        ", contracts.UserIdentityV2);
  console.log("  MessageStorageV2:      ", contracts.MessageStorageV2);
  console.log("  PaymentEscrow:         ", contracts.PaymentEscrow);
  console.log("  ProjectCollaboration:  ", contracts.ProjectCollaboration);
  console.log("  LivingPortfolio:       ", contracts.LivingPortfolio);
  
  console.log("\n🔗 Etherscan URLs:");
  const baseUrl = "https://sepolia.etherscan.io/address/";
  console.log("  UserIdentityV2:        ", baseUrl + contracts.UserIdentityV2);
  console.log("  MessageStorageV2:      ", baseUrl + contracts.MessageStorageV2);
  console.log("  PaymentEscrow:         ", baseUrl + contracts.PaymentEscrow);
  console.log("  ProjectCollaboration:  ", baseUrl + contracts.ProjectCollaboration);
  console.log("  LivingPortfolio:       ", baseUrl + contracts.LivingPortfolio);
  
  console.log("\n🎯 Key Features Enabled:");
  console.log("  ✅ Living Portfolio - 动态作品集");
  console.log("  ✅ Passive Discovery - 被动发现");
  console.log("  ✅ Opportunity Matching - 机会匹配");
  console.log("  ✅ Verified Credentials - 已验证凭证");
  console.log("  ✅ Real-time Chat - 实时聊天");
  console.log("  ✅ Payment & Escrow - 支付托管");
  console.log("  ✅ Project Collaboration - 项目协作");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

