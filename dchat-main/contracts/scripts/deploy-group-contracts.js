const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of Group Functionality Contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy GroupChatV2
  console.log("📦 Deploying GroupChatV2...");
  const GroupChatV2 = await hre.ethers.getContractFactory("GroupChatV2");
  const groupChat = await GroupChatV2.deploy();
  await groupChat.waitForDeployment();
  const groupChatAddress = await groupChat.getAddress();
  console.log("✅ GroupChatV2 deployed to:", groupChatAddress);

  // Deploy GroupPayment
  console.log("\n📦 Deploying GroupPayment...");
  const GroupPayment = await hre.ethers.getContractFactory("GroupPayment");
  const groupPayment = await GroupPayment.deploy();
  await groupPayment.waitForDeployment();
  const groupPaymentAddress = await groupPayment.getAddress();
  console.log("✅ GroupPayment deployed to:", groupPaymentAddress);

  // Deploy RedPacket
  console.log("\n📦 Deploying RedPacket...");
  const RedPacket = await hre.ethers.getContractFactory("RedPacket");
  const redPacket = await RedPacket.deploy();
  await redPacket.waitForDeployment();
  const redPacketAddress = await redPacket.getAddress();
  console.log("✅ RedPacket deployed to:", redPacketAddress);

  // Save deployment addresses
  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      GroupChatV2: groupChatAddress,
      GroupPayment: groupPaymentAddress,
      RedPacket: redPacketAddress,
    },
    transactionHashes: {
      GroupChatV2: groupChat.deploymentTransaction().hash,
      GroupPayment: groupPayment.deploymentTransaction().hash,
      RedPacket: redPacket.deploymentTransaction().hash,
    },
  };

  const deploymentPath = path.join(__dirname, "../deployment-group-contracts.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log("\n📄 Deployment data saved to:", deploymentPath);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("\n📝 Contract Addresses:");
  console.log("  GroupChatV2:   ", groupChatAddress);
  console.log("  GroupPayment:  ", groupPaymentAddress);
  console.log("  RedPacket:     ", redPacketAddress);
  console.log("\n🔗 Etherscan Links:");
  const explorerUrl = hre.network.name === "sepolia" 
    ? "https://sepolia.etherscan.io/address/"
    : "https://etherscan.io/address/";
  console.log("  GroupChatV2:   ", explorerUrl + groupChatAddress);
  console.log("  GroupPayment:  ", explorerUrl + groupPaymentAddress);
  console.log("  RedPacket:     ", explorerUrl + redPacketAddress);
  console.log("=".repeat(60) + "\n");

  // Verify contracts on Etherscan (if not localhost)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations before verification...");
    await groupChat.deploymentTransaction().wait(5);
    await groupPayment.deploymentTransaction().wait(5);
    await redPacket.deploymentTransaction().wait(5);

    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: groupChatAddress,
        constructorArguments: [],
      });
      console.log("✅ GroupChatV2 verified");
    } catch (error) {
      console.log("⚠️  GroupChatV2 verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: groupPaymentAddress,
        constructorArguments: [],
      });
      console.log("✅ GroupPayment verified");
    } catch (error) {
      console.log("⚠️  GroupPayment verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: redPacketAddress,
        constructorArguments: [],
      });
      console.log("✅ RedPacket verified");
    } catch (error) {
      console.log("⚠️  RedPacket verification failed:", error.message);
    }
  }

  console.log("\n✨ Deployment completed successfully!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
