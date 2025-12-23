const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of Dchat V2 contracts...\n");

  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // 部署 UserIdentityV2
  console.log("📦 Deploying UserIdentityV2...");
  const UserIdentityV2 = await hre.ethers.getContractFactory("UserIdentityV2");
  const userIdentityV2 = await UserIdentityV2.deploy();
  await userIdentityV2.waitForDeployment();
  const userIdentityV2Address = await userIdentityV2.getAddress();
  console.log("✅ UserIdentityV2 deployed to:", userIdentityV2Address);
  console.log("");

  // 部署 MessageStorageV2
  console.log("📦 Deploying MessageStorageV2...");
  const MessageStorageV2 = await hre.ethers.getContractFactory("MessageStorageV2");
  const messageStorageV2 = await MessageStorageV2.deploy();
  await messageStorageV2.waitForDeployment();
  const messageStorageV2Address = await messageStorageV2.getAddress();
  console.log("✅ MessageStorageV2 deployed to:", messageStorageV2Address);
  console.log("");

  // 保存部署地址
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      UserIdentityV2: userIdentityV2Address,
      MessageStorageV2: messageStorageV2Address
    }
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-v2-addresses.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📝 Deployment information saved to deployment-v2-addresses.json\n");

  // 显示部署摘要
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("  UserIdentityV2:     ", userIdentityV2Address);
  console.log("  MessageStorageV2:   ", messageStorageV2Address);
  console.log("\n🔗 Etherscan URLs:");
  console.log("  UserIdentityV2:     ", `https://sepolia.etherscan.io/address/${userIdentityV2Address}`);
  console.log("  MessageStorageV2:   ", `https://sepolia.etherscan.io/address/${messageStorageV2Address}`);
  console.log("\n");

  // 验证合约 (如果有 Etherscan API key)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("⏳ Waiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: userIdentityV2Address,
        constructorArguments: [],
      });
      console.log("✅ UserIdentityV2 verified");
    } catch (error) {
      console.log("❌ UserIdentityV2 verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: messageStorageV2Address,
        constructorArguments: [],
      });
      console.log("✅ MessageStorageV2 verified");
    } catch (error) {
      console.log("❌ MessageStorageV2 verification failed:", error.message);
    }
  }

  console.log("\n✨ All done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

