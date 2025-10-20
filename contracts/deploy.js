const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Dchat Smart Contracts Deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy MessageStorage
  console.log("📦 Deploying MessageStorage...");
  const MessageStorage = await hre.ethers.getContractFactory("MessageStorage");
  const messageStorage = await MessageStorage.deploy();
  await messageStorage.waitForDeployment();
  const messageStorageAddress = await messageStorage.getAddress();
  console.log("✅ MessageStorage deployed to:", messageStorageAddress);

  // Deploy PaymentEscrow
  console.log("\n📦 Deploying PaymentEscrow...");
  const PaymentEscrow = await hre.ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await PaymentEscrow.deploy();
  await paymentEscrow.waitForDeployment();
  const paymentEscrowAddress = await paymentEscrow.getAddress();
  console.log("✅ PaymentEscrow deployed to:", paymentEscrowAddress);

  // Deploy UserIdentity
  console.log("\n📦 Deploying UserIdentity...");
  const UserIdentity = await hre.ethers.getContractFactory("UserIdentity");
  const userIdentity = await UserIdentity.deploy();
  await userIdentity.waitForDeployment();
  const userIdentityAddress = await userIdentity.getAddress();
  console.log("✅ UserIdentity deployed to:", userIdentityAddress);

  // Deploy ProjectCollaboration
  console.log("\n📦 Deploying ProjectCollaboration...");
  const ProjectCollaboration = await hre.ethers.getContractFactory("ProjectCollaboration");
  const projectCollaboration = await ProjectCollaboration.deploy();
  await projectCollaboration.waitForDeployment();
  const projectCollaborationAddress = await projectCollaboration.getAddress();
  console.log("✅ ProjectCollaboration deployed to:", projectCollaborationAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("  MessageStorage:        ", messageStorageAddress);
  console.log("  PaymentEscrow:         ", paymentEscrowAddress);
  console.log("  UserIdentity:          ", userIdentityAddress);
  console.log("  ProjectCollaboration:  ", projectCollaborationAddress);
  console.log("\n💾 Save these addresses to your .env file!");
  console.log("=".repeat(60) + "\n");

  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MessageStorage: messageStorageAddress,
      PaymentEscrow: paymentEscrowAddress,
      UserIdentity: userIdentityAddress,
      ProjectCollaboration: projectCollaborationAddress
    }
  };
  
  fs.writeFileSync(
    'deployment-addresses.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("📄 Deployment info saved to deployment-addresses.json\n");

  // Verify contracts on Etherscan (if not on local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    console.log("(This may take a few minutes...)\n");
    
    // Wait for 6 block confirmations
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    
    console.log("🔍 Verifying contracts on Etherscan...");
    
    const contractsToVerify = [
      { name: "MessageStorage", address: messageStorageAddress },
      { name: "PaymentEscrow", address: paymentEscrowAddress },
      { name: "UserIdentity", address: userIdentityAddress },
      { name: "ProjectCollaboration", address: projectCollaborationAddress }
    ];

    for (const contract of contractsToVerify) {
      try {
        await hre.run("verify:verify", {
          address: contract.address,
          constructorArguments: []
        });
        console.log(`✅ ${contract.name} verified`);
      } catch (error) {
        if (error.message.includes("Already Verified")) {
          console.log(`✅ ${contract.name} already verified`);
        } else {
          console.log(`❌ ${contract.name} verification failed:`, error.message);
        }
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

