const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("PaymentEscrow", function () {
  async function deployFixture() {
    const [owner, sender, recipient, other] = await ethers.getSigners();
    const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
    const escrow = await PaymentEscrow.deploy();
    return { escrow, owner, sender, recipient, other };
  }

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("should initialize with 0.5% platform fee", async function () {
      const { escrow } = await loadFixture(deployFixture);
      expect(await escrow.platformFee()).to.equal(50);
    });

    it("should not be paused initially", async function () {
      const { escrow } = await loadFixture(deployFixture);
      expect(await escrow.paused()).to.equal(false);
    });
  });

  describe("createPayment (instant)", function () {
    it("should create a payment and transfer funds to recipient", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");

      const tx = await escrow.connect(sender).createPayment(
        recipient.address, "Test payment",
        { value: amount }
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      expect(event).to.not.be.undefined;
    });

    it("should reject zero-value payments", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(sender).createPayment(recipient.address, "Test", { value: 0 })
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("should reject payments to zero address", async function () {
      const { escrow, sender } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      await expect(
        escrow.connect(sender).createPayment(ethers.ZeroAddress, "Test", { value: amount })
      ).to.be.revertedWith("Invalid recipient");
    });

    it("should reject payments to self", async function () {
      const { escrow, sender } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      await expect(
        escrow.connect(sender).createPayment(sender.address, "Test", { value: amount })
      ).to.be.revertedWith("Cannot pay yourself");
    });

    it("should transfer funds to recipient minus fee", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const fee = amount * 50n / 10000n; // 0.5%

      const balBefore = await ethers.provider.getBalance(recipient.address);
      await escrow.connect(sender).createPayment(recipient.address, "Test", { value: amount });
      const balAfter = await ethers.provider.getBalance(recipient.address);

      expect(balAfter - balBefore).to.equal(amount - fee);
    });

    it("should accumulate platform fees", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const fee = amount * 50n / 10000n;

      await escrow.connect(sender).createPayment(recipient.address, "Test", { value: amount });
      expect(await escrow.collectedFees()).to.equal(fee);
    });

    it("should reject when paused", async function () {
      const { escrow, owner, sender, recipient } = await loadFixture(deployFixture);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(sender).createPayment(recipient.address, "Test", { value: ethers.parseEther("1.0") })
      ).to.be.reverted;
    });
  });

  describe("createEscrow", function () {
    it("should create an escrow with locked funds", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      await escrow.connect(sender).createEscrow(
        recipient.address, releaseTime, "Escrow terms",
        { value: amount }
      );

      const contractBal = await escrow.getContractBalance();
      expect(contractBal).to.be.gte(amount);
    });

    it("should reject escrow with past release time", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const pastTime = Math.floor(Date.now() / 1000) - 86400;

      await expect(
        escrow.connect(sender).createEscrow(recipient.address, pastTime, "Terms", { value: amount })
      ).to.be.revertedWith("Release time must be future");
    });

    it("should reject escrow to self", async function () {
      const { escrow, sender } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        escrow.connect(sender).createEscrow(sender.address, releaseTime, "Terms", { value: amount })
      ).to.be.revertedWith("Cannot escrow with yourself");
    });

    it("should reject zero-value escrow", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        escrow.connect(sender).createEscrow(recipient.address, releaseTime, "Terms", { value: 0 })
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("releaseEscrow", function () {
    it("should release escrow when both parties approve", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      const tx = await escrow.connect(sender).createEscrow(
        recipient.address, releaseTime, "Terms",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "EscrowCreated"
      );
      const escrowId = event.args[0];

      // Both parties approve
      await escrow.connect(sender).releaseEscrow(escrowId);

      const balBefore = await ethers.provider.getBalance(recipient.address);
      await escrow.connect(recipient).releaseEscrow(escrowId);
      const balAfter = await ethers.provider.getBalance(recipient.address);

      expect(balAfter).to.be.gt(balBefore);
    });

    it("should reject release from unauthorized party", async function () {
      const { escrow, sender, recipient, other } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      const tx = await escrow.connect(sender).createEscrow(
        recipient.address, releaseTime, "Terms",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "EscrowCreated"
      );
      const escrowId = event.args[0];

      await expect(
        escrow.connect(other).releaseEscrow(escrowId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("refundEscrow", function () {
    it("should refund escrow to payer", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      const tx = await escrow.connect(sender).createEscrow(
        recipient.address, releaseTime, "Terms",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "EscrowCreated"
      );
      const escrowId = event.args[0];

      const balBefore = await ethers.provider.getBalance(sender.address);
      await escrow.connect(sender).refundEscrow(escrowId);
      const balAfter = await ethers.provider.getBalance(sender.address);

      // Sender should get refund (minus gas)
      expect(balAfter).to.be.gt(balBefore - ethers.parseEther("0.01"));
    });

    it("should reject refund from non-payer", async function () {
      const { escrow, sender, recipient, other } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      const tx = await escrow.connect(sender).createEscrow(
        recipient.address, releaseTime, "Terms",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "EscrowCreated"
      );
      const escrowId = event.args[0];

      await expect(
        escrow.connect(other).refundEscrow(escrowId)
      ).to.be.revertedWith("Only payer can refund");
    });

    it("should reject refund after payee approved", async function () {
      const { escrow, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");
      const releaseTime = Math.floor(Date.now() / 1000) + 86400;

      const tx = await escrow.connect(sender).createEscrow(
        recipient.address, releaseTime, "Terms",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "EscrowCreated"
      );
      const escrowId = event.args[0];

      // Payee approves
      await escrow.connect(recipient).releaseEscrow(escrowId);

      await expect(
        escrow.connect(sender).refundEscrow(escrowId)
      ).to.be.revertedWith("Payee already approved");
    });
  });

  describe("Admin functions", function () {
    it("should allow owner to set platform fee", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await escrow.connect(owner).setPlatformFee(100); // 1%
      expect(await escrow.platformFee()).to.equal(100);
    });

    it("should reject fee > 10%", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(owner).setPlatformFee(1001)
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("should reject non-owner setting fee", async function () {
      const { escrow, other } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(other).setPlatformFee(100)
      ).to.be.reverted;
    });

    it("should allow owner to withdraw fees", async function () {
      const { escrow, owner, sender, recipient } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10.0");

      await escrow.connect(sender).createPayment(recipient.address, "Test", { value: amount });

      const fees = await escrow.collectedFees();
      expect(fees).to.be.gt(0);

      const balBefore = await ethers.provider.getBalance(owner.address);
      await escrow.connect(owner).withdrawFees();
      const balAfter = await ethers.provider.getBalance(owner.address);

      expect(balAfter).to.be.gt(balBefore);
      expect(await escrow.collectedFees()).to.equal(0);
    });

    it("should allow owner to pause and unpause", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await escrow.connect(owner).pause();
      expect(await escrow.paused()).to.equal(true);
      await escrow.connect(owner).unpause();
      expect(await escrow.paused()).to.equal(false);
    });
  });
});
