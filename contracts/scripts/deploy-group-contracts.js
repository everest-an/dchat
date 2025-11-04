const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of Group Functionality Contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString(), "\n");

  // Deploy GroupChatV2
  console.log("📦 Deploying GroupChatV2...");
  const GroupChatV2 = await hre.ethers.getContractFactory("GroupChatV2");
  const groupChat = await GroupChatV2.deploy();
  await groupChat.deployed();
  console.log("✅ GroupChatV2 deployed to:", groupChat.address);

  // Deploy GroupPayment
  console.log("\n📦 Deploying GroupPayment...");
  const GroupPayment = await hre.ethers.getContractFactory("GroupPayment");
  const groupPayment = await GroupPayment.deploy();
  await groupPayment.deployed();
  console.log("✅ GroupPayment deployed to:", groupPayment.address);

  // Deploy RedPacket
  console.log("\n📦 Deploying RedPacket...");
  const RedPacket = await hre.ethers.getContractFactory("RedPacket");
  const redPacket = await RedPacket.deploy();
  await redPacket.deployed();
  console.log("✅ RedPacket deployed to:", redPacket.address);

  // Save deployment addresses
  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      GroupChatV2: groupChat.address,
      GroupPayment: groupPayment.address,
      RedPacket: redPacket.address,
    },
    transactionHashes: {
      GroupChatV2: groupChat.deployTransaction.hash,
      GroupPayment: groupPayment.deployTransaction.hash,
      RedPacket: redPacket.deployTransaction.hash,
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
  console.log("  GroupChatV2:   ", groupChat.address);
  console.log("  GroupPayment:  ", groupPayment.address);
  console.log("  RedPacket:     ", redPacket.address);
  console.log("\n🔗 Etherscan Links:");
  const explorerUrl = hre.network.name === "sepolia" 
    ? "https://sepolia.etherscan.io/address/"
    : "https://etherscan.io/address/";
  console.log("  GroupChatV2:   ", explorerUrl + groupChat.address);
  console.log("  GroupPayment:  ", explorerUrl + groupPayment.address);
  console.log("  RedPacket:     ", explorerUrl + redPacket.address);
  console.log("=".repeat(60) + "\n");

  // Verify contracts on Etherscan (if not localhost)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations before verification...");
    await groupChat.deployTransaction.wait(5);
    await groupPayment.deployTransaction.wait(5);
    await redPacket.deployTransaction.wait(5);

    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: groupChat.address,
        constructorArguments: [],
      });
      console.log("✅ GroupChatV2 verified");
    } catch (error) {
      console.log("⚠️  GroupChatV2 verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: groupPayment.address,
        constructorArguments: [],
      });
      console.log("✅ GroupPayment verified");
    } catch (error) {
      console.log("⚠️  GroupPayment verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: redPacket.address,
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
