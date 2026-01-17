/**
 * Deployment script for Dchat smart contracts
 * Deploy to Sepolia testnet using Hardhat
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Dchat smart contract deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString(), "\n");

  // Deploy UserRegistry
  console.log("📦 Deploying UserRegistry...");
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.deployed();
  console.log("✅ UserRegistry deployed to:", userRegistry.address, "\n");

  // Deploy MessageStorage
  console.log("📦 Deploying MessageStorage...");
  const MessageStorage = await hre.ethers.getContractFactory("MessageStorage");
  const messageStorage = await MessageStorage.deploy();
  await messageStorage.deployed();
  console.log("✅ MessageStorage deployed to:", messageStorage.address, "\n");

  // Deploy PaymentChannel
  console.log("📦 Deploying PaymentChannel...");
  const PaymentChannel = await hre.ethers.getContractFactory("PaymentChannel");
  const paymentChannel = await PaymentChannel.deploy();
  await paymentChannel.deployed();
  console.log("✅ PaymentChannel deployed to:", paymentChannel.address, "\n");

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log(`UserRegistry:    ${userRegistry.address}`);
  console.log(`MessageStorage:  ${messageStorage.address}`);
  console.log(`PaymentChannel:  ${paymentChannel.address}`);
  console.log("\n📝 Add these to your .env file:\n");
  console.log(`REACT_APP_USER_REGISTRY_ADDRESS=${userRegistry.address}`);
  console.log(`REACT_APP_MESSAGE_STORAGE_ADDRESS=${messageStorage.address}`);
  console.log(`REACT_APP_PAYMENT_CHANNEL_ADDRESS=${paymentChannel.address}`);
  console.log("\n" + "=".repeat(60) + "\n");

  // Verify on Etherscan (optional)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await userRegistry.deployTransaction.wait(6);
    await messageStorage.deployTransaction.wait(6);
    await paymentChannel.deployTransaction.wait(6);

    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: userRegistry.address,
        constructorArguments: [],
      });
      console.log("✅ UserRegistry verified");
    } catch (e) {
      console.log("❌ UserRegistry verification failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: messageStorage.address,
        constructorArguments: [],
      });
      console.log("✅ MessageStorage verified");
    } catch (e) {
      console.log("❌ MessageStorage verification failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: paymentChannel.address,
        constructorArguments: [],
      });
      console.log("✅ PaymentChannel verified");
    } catch (e) {
      console.log("❌ PaymentChannel verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
