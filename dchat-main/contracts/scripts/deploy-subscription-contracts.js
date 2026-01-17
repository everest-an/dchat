const hre = require("hardhat");

/**
 * Deploy Subscription and NFT Avatar contracts
 * 
 * This script deploys:
 * 1. SubscriptionManager - Manages subscriptions and NFT memberships
 * 2. NFTAvatarManager - Manages NFT avatars for user profiles
 */
async function main() {
  console.log("🚀 Starting deployment of Subscription contracts...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Get balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy SubscriptionManager
  console.log("📦 Deploying SubscriptionManager...");
  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const subscriptionManager = await SubscriptionManager.deploy();
  await subscriptionManager.waitForDeployment();
  const subscriptionAddress = await subscriptionManager.getAddress();
  console.log("✅ SubscriptionManager deployed to:", subscriptionAddress);

  // Deploy NFTAvatarManager
  console.log("\n📦 Deploying NFTAvatarManager...");
  const NFTAvatarManager = await hre.ethers.getContractFactory("NFTAvatarManager");
  const nftAvatarManager = await NFTAvatarManager.deploy();
  await nftAvatarManager.waitForDeployment();
  const nftAvatarAddress = await nftAvatarManager.getAddress();
  console.log("✅ NFTAvatarManager deployed to:", nftAvatarAddress);

  // Save deployment addresses
  const fs = require('fs');
  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SubscriptionManager: subscriptionAddress,
      NFTAvatarManager: nftAvatarAddress
    }
  };

  fs.writeFileSync(
    'deployment-subscription-contracts.json',
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n📄 Deployment data saved to deployment-subscription-contracts.json");

  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment Summary");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("\nContract Addresses:");
  console.log("  SubscriptionManager:", subscriptionAddress);
  console.log("  NFTAvatarManager:", nftAvatarAddress);
  console.log("\nEtherscan Links:");
  console.log("  SubscriptionManager:", `https://sepolia.etherscan.io/address/${subscriptionAddress}`);
  console.log("  NFTAvatarManager:", `https://sepolia.etherscan.io/address/${nftAvatarAddress}`);
  console.log("=".repeat(60));

  // Verify contracts on Etherscan (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: subscriptionAddress,
        constructorArguments: [],
      });
      console.log("✅ SubscriptionManager verified");
    } catch (error) {
      console.log("❌ SubscriptionManager verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: nftAvatarAddress,
        constructorArguments: [],
      });
      console.log("✅ NFTAvatarManager verified");
    } catch (error) {
      console.log("❌ NFTAvatarManager verification failed:", error.message);
    }
  }

  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
