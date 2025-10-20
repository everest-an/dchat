const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Dchat Smart Contracts Deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString(), "\n");

  // Deploy MessageStorage
  console.log("📦 Deploying MessageStorage...");
  const MessageStorage = await hre.ethers.getContractFactory("MessageStorage");
  const messageStorage = await MessageStorage.deploy();
  await messageStorage.deployed();
  console.log("✅ MessageStorage deployed to:", messageStorage.address);

  // Deploy PaymentEscrow
  console.log("\n📦 Deploying PaymentEscrow...");
  const PaymentEscrow = await hre.ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await PaymentEscrow.deploy();
  await paymentEscrow.deployed();
  console.log("✅ PaymentEscrow deployed to:", paymentEscrow.address);

  // Deploy UserIdentity
  console.log("\n📦 Deploying UserIdentity...");
  const UserIdentity = await hre.ethers.getContractFactory("UserIdentity");
  const userIdentity = await UserIdentity.deploy();
  await userIdentity.deployed();
  console.log("✅ UserIdentity deployed to:", userIdentity.address);

  // Deploy ProjectCollaboration
  console.log("\n📦 Deploying ProjectCollaboration...");
  const ProjectCollaboration = await hre.ethers.getContractFactory("ProjectCollaboration");
  const projectCollaboration = await ProjectCollaboration.deploy();
  await projectCollaboration.deployed();
  console.log("✅ ProjectCollaboration deployed to:", projectCollaboration.address);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("  MessageStorage:        ", messageStorage.address);
  console.log("  PaymentEscrow:         ", paymentEscrow.address);
  console.log("  UserIdentity:          ", userIdentity.address);
  console.log("  ProjectCollaboration:  ", projectCollaboration.address);
  console.log("\n💾 Save these addresses to your .env file!");
  console.log("=".repeat(60) + "\n");

  // Verify contracts on Etherscan (if not on local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await messageStorage.deployTransaction.wait(6);
    
    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: messageStorage.address,
        constructorArguments: []
      });
      console.log("✅ MessageStorage verified");
    } catch (error) {
      console.log("❌ MessageStorage verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: paymentEscrow.address,
        constructorArguments: []
      });
      console.log("✅ PaymentEscrow verified");
    } catch (error) {
      console.log("❌ PaymentEscrow verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: userIdentity.address,
        constructorArguments: []
      });
      console.log("✅ UserIdentity verified");
    } catch (error) {
      console.log("❌ UserIdentity verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: projectCollaboration.address,
        constructorArguments: []
      });
      console.log("✅ ProjectCollaboration verified");
    } catch (error) {
      console.log("❌ ProjectCollaboration verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

