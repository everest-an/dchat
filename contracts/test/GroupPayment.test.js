const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GroupPayment", function () {
  async function deployFixture() {
    const [owner, organizer, member1, member2, member3, other] = await ethers.getSigners();
    const GroupPayment = await ethers.getContractFactory("GroupPayment");
    const groupPayment = await GroupPayment.deploy();
    return { groupPayment, owner, organizer, member1, member2, member3, other };
  }

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      const { groupPayment, owner } = await loadFixture(deployFixture);
      expect(await groupPayment.owner()).to.equal(owner.address);
    });

    it("should have correct MAX_PARTICIPANTS constant", async function () {
      const { groupPayment } = await loadFixture(deployFixture);
      expect(await groupPayment.MAX_PARTICIPANTS()).to.equal(200);
    });
  });

  describe("createGroupCollection", function () {
    it("should create a group collection", async function () {
      const { groupPayment, organizer, member1, member2 } = await loadFixture(deployFixture);
      const targetAmount = ethers.parseEther("3.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", targetAmount,
        [member1.address, member2.address],
        "Group dinner", deadline
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      expect(event).to.not.be.undefined;
    });

    it("should reject zero target amount", async function () {
      const { groupPayment, organizer, member1 } = await loadFixture(deployFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        groupPayment.connect(organizer).createGroupCollection(
          "group1", 0, [member1.address], "Test", deadline
        )
      ).to.be.revertedWith("Invalid target amount");
    });

    it("should reject empty participants list", async function () {
      const { groupPayment, organizer } = await loadFixture(deployFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        groupPayment.connect(organizer).createGroupCollection(
          "group1", ethers.parseEther("1.0"), [], "Test", deadline
        )
      ).to.be.revertedWith("Invalid participant count");
    });

    it("should reject past deadline", async function () {
      const { groupPayment, organizer, member1 } = await loadFixture(deployFixture);
      const pastDeadline = Math.floor(Date.now() / 1000) - 86400;

      await expect(
        groupPayment.connect(organizer).createGroupCollection(
          "group1", ethers.parseEther("1.0"), [member1.address], "Test", pastDeadline
        )
      ).to.be.revertedWith("Invalid deadline");
    });
  });

  describe("createAAPayment", function () {
    it("should create an AA (split) payment", async function () {
      const { groupPayment, organizer, member1, member2 } = await loadFixture(deployFixture);
      const totalAmount = ethers.parseEther("2.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createAAPayment(
        "group1", totalAmount,
        [member1.address, member2.address],
        "Split dinner", deadline
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      expect(event).to.not.be.undefined;
    });
  });

  describe("contribute", function () {
    async function createCollectionFixture() {
      const fixture = await deployFixture();
      const { groupPayment, organizer, member1, member2 } = fixture;
      const targetAmount = ethers.parseEther("2.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", targetAmount,
        [member1.address, member2.address],
        "Group dinner", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      const paymentId = event.args[0];

      return { ...fixture, paymentId, targetAmount };
    }

    it("should accept contribution from participant", async function () {
      const { groupPayment, member1, paymentId } = await loadFixture(createCollectionFixture);
      const contribution = ethers.parseEther("1.0");

      const tx = await groupPayment.connect(member1).contribute(paymentId, { value: contribution });
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentContributed"
      );
      expect(event).to.not.be.undefined;
    });

    it("should reject zero contribution", async function () {
      const { groupPayment, member1, paymentId } = await loadFixture(createCollectionFixture);

      await expect(
        groupPayment.connect(member1).contribute(paymentId, { value: 0 })
      ).to.be.revertedWith("Invalid amount");
    });

    it("should reject contribution from non-participant", async function () {
      const { groupPayment, other, paymentId } = await loadFixture(createCollectionFixture);

      await expect(
        groupPayment.connect(other).contribute(paymentId, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Not a participant");
    });

    it("should reject contribution after deadline", async function () {
      const { groupPayment, member1, paymentId } = await loadFixture(createCollectionFixture);

      await time.increase(86401);

      await expect(
        groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Payment expired");
    });

    it("should reject double payment from same participant", async function () {
      const { groupPayment, member1, paymentId } = await loadFixture(createCollectionFixture);

      await groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") });

      await expect(
        groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Already paid");
    });

    it("should auto-complete when target is reached", async function () {
      const { groupPayment, member1, member2, paymentId } = await loadFixture(createCollectionFixture);

      await groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") });
      const tx = await groupPayment.connect(member2).contribute(paymentId, { value: ethers.parseEther("1.0") });
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCompleted"
      );
      expect(event).to.not.be.undefined;
    });
  });

  describe("withdrawFunds", function () {
    it("should allow initiator to withdraw after completion", async function () {
      const { groupPayment, organizer, member1, member2 } = await loadFixture(deployFixture);
      const targetAmount = ethers.parseEther("2.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", targetAmount,
        [member1.address, member2.address],
        "Group dinner", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      const paymentId = event.args[0];

      // Both members contribute to reach target
      await groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") });
      await groupPayment.connect(member2).contribute(paymentId, { value: ethers.parseEther("1.0") });

      const balBefore = await ethers.provider.getBalance(organizer.address);
      await groupPayment.connect(organizer).withdrawFunds(paymentId);
      const balAfter = await ethers.provider.getBalance(organizer.address);

      expect(balAfter).to.be.gt(balBefore);
    });

    it("should reject withdrawal from non-initiator", async function () {
      const { groupPayment, organizer, member1, member2, other } = await loadFixture(deployFixture);
      const targetAmount = ethers.parseEther("2.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", targetAmount,
        [member1.address, member2.address],
        "Test", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      const paymentId = event.args[0];

      await groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") });
      await groupPayment.connect(member2).contribute(paymentId, { value: ethers.parseEther("1.0") });

      await expect(
        groupPayment.connect(other).withdrawFunds(paymentId)
      ).to.be.revertedWith("Not initiator");
    });

    it("should reject double withdrawal", async function () {
      const { groupPayment, organizer, member1, member2 } = await loadFixture(deployFixture);
      const targetAmount = ethers.parseEther("2.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", targetAmount,
        [member1.address, member2.address],
        "Test", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      const paymentId = event.args[0];

      await groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") });
      await groupPayment.connect(member2).contribute(paymentId, { value: ethers.parseEther("1.0") });

      await groupPayment.connect(organizer).withdrawFunds(paymentId);

      await expect(
        groupPayment.connect(organizer).withdrawFunds(paymentId)
      ).to.be.revertedWith("Funds already withdrawn");
    });
  });

  describe("cancelPayment (pull-payment refund)", function () {
    it("should cancel payment and credit refunds", async function () {
      const { groupPayment, organizer, member1, member2 } = await loadFixture(deployFixture);
      const targetAmount = ethers.parseEther("2.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", targetAmount,
        [member1.address, member2.address],
        "Test", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      const paymentId = event.args[0];

      // Member1 contributes
      await groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") });

      // Organizer cancels
      await groupPayment.connect(organizer).cancelPayment(paymentId);

      // Check pending refund
      const pending = await groupPayment.pendingRefunds(member1.address);
      expect(pending).to.equal(ethers.parseEther("1.0"));
    });

    it("should allow participant to claim refund after cancellation", async function () {
      const { groupPayment, organizer, member1, member2 } = await loadFixture(deployFixture);
      const targetAmount = ethers.parseEther("2.0");
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", targetAmount,
        [member1.address, member2.address],
        "Test", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      const paymentId = event.args[0];

      await groupPayment.connect(member1).contribute(paymentId, { value: ethers.parseEther("1.0") });
      await groupPayment.connect(organizer).cancelPayment(paymentId);

      const balBefore = await ethers.provider.getBalance(member1.address);
      await groupPayment.connect(member1).claimRefund();
      const balAfter = await ethers.provider.getBalance(member1.address);

      expect(balAfter).to.be.gt(balBefore);
      expect(await groupPayment.pendingRefunds(member1.address)).to.equal(0);
    });

    it("should reject cancel from non-initiator", async function () {
      const { groupPayment, organizer, member1, other } = await loadFixture(deployFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createGroupCollection(
        "group1", ethers.parseEther("1.0"),
        [member1.address],
        "Test", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PaymentCreated"
      );
      const paymentId = event.args[0];

      await expect(
        groupPayment.connect(other).cancelPayment(paymentId)
      ).to.be.revertedWith("Not initiator");
    });
  });

  describe("Crowdfunding", function () {
    it("should create a crowdfunding campaign", async function () {
      const { groupPayment, organizer } = await loadFixture(deployFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createCrowdfunding(
        "group1", ethers.parseEther("10.0"), ethers.parseEther("0.1"),
        "Build a DAO", "Let's build together", deadline
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "CrowdfundingCreated"
      );
      expect(event).to.not.be.undefined;
    });

    it("should accept backing above minimum contribution", async function () {
      const { groupPayment, organizer, member1 } = await loadFixture(deployFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createCrowdfunding(
        "group1", ethers.parseEther("10.0"), ethers.parseEther("0.1"),
        "Build a DAO", "Description", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "CrowdfundingCreated"
      );
      const fundingId = event.args[0];

      await groupPayment.connect(member1).backCrowdfunding(fundingId, { value: ethers.parseEther("1.0") });

      const contribution = await groupPayment.getCrowdfundingContribution(fundingId, member1.address);
      expect(contribution).to.equal(ethers.parseEther("1.0"));
    });

    it("should reject backing below minimum", async function () {
      const { groupPayment, organizer, member1 } = await loadFixture(deployFixture);
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await groupPayment.connect(organizer).createCrowdfunding(
        "group1", ethers.parseEther("10.0"), ethers.parseEther("0.1"),
        "Build a DAO", "Description", deadline
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "CrowdfundingCreated"
      );
      const fundingId = event.args[0];

      await expect(
        groupPayment.connect(member1).backCrowdfunding(fundingId, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Below minimum contribution");
    });
  });

  describe("Pause", function () {
    it("should prevent creating payments when paused", async function () {
      const { groupPayment, owner, organizer, member1 } = await loadFixture(deployFixture);
      await groupPayment.connect(owner).pause();

      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await expect(
        groupPayment.connect(organizer).createGroupCollection(
          "group1", ethers.parseEther("1.0"), [member1.address], "Test", deadline
        )
      ).to.be.reverted;
    });

    it("should allow operations after unpause", async function () {
      const { groupPayment, owner, organizer, member1 } = await loadFixture(deployFixture);
      await groupPayment.connect(owner).pause();
      await groupPayment.connect(owner).unpause();

      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await expect(
        groupPayment.connect(organizer).createGroupCollection(
          "group1", ethers.parseEther("1.0"), [member1.address], "Test", deadline
        )
      ).to.not.be.reverted;
    });
  });
});
