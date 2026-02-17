const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("RedPacket", function () {
  async function deployFixture() {
    const [owner, creator, claimer1, claimer2, claimer3, other] = await ethers.getSigners();
    const RedPacket = await ethers.getContractFactory("RedPacket");
    const redPacket = await RedPacket.deploy();
    return { redPacket, owner, creator, claimer1, claimer2, claimer3, other };
  }

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      const { redPacket, owner } = await loadFixture(deployFixture);
      expect(await redPacket.owner()).to.equal(owner.address);
    });

    it("should have correct constants", async function () {
      const { redPacket } = await loadFixture(deployFixture);
      expect(await redPacket.MIN_AMOUNT()).to.equal(ethers.parseEther("0.001"));
      expect(await redPacket.MAX_COUNT()).to.equal(100);
      expect(await redPacket.EXPIRATION_TIME()).to.equal(86400);
    });
  });

  describe("createRandomRedPacket", function () {
    it("should create a random red packet", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1.0");

      const tx = await redPacket.connect(creator).createRandomRedPacket(
        "group1", 5, "Happy New Year!",
        { value: amount }
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      expect(event).to.not.be.undefined;
      expect(event.args[2]).to.equal(creator.address);
    });

    it("should reject amount below minimum", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);

      await expect(
        redPacket.connect(creator).createRandomRedPacket(
          "group1", 5, "Test",
          { value: ethers.parseEther("0.0001") }
        )
      ).to.be.revertedWith("Amount too small");
    });

    it("should reject zero count", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);

      await expect(
        redPacket.connect(creator).createRandomRedPacket(
          "group1", 0, "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Invalid count");
    });

    it("should reject count exceeding MAX_COUNT", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);

      await expect(
        redPacket.connect(creator).createRandomRedPacket(
          "group1", 101, "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Invalid count");
    });

    it("should reject amount too small for count", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);

      await expect(
        redPacket.connect(creator).createRandomRedPacket(
          "group1", 10, "Test",
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("Amount too small for count");
    });
  });

  describe("createFixedRedPacket", function () {
    it("should create a fixed red packet", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.5");

      const tx = await redPacket.connect(creator).createFixedRedPacket(
        "group1", 5, "Fixed packet!",
        { value: amount }
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      expect(event).to.not.be.undefined;
    });

    it("should reject non-divisible amount", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);

      await expect(
        redPacket.connect(creator).createFixedRedPacket(
          "group1", 3, "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Amount must be divisible by count");
    });
  });

  describe("createExclusiveRedPacket", function () {
    it("should create an exclusive red packet", async function () {
      const { redPacket, creator, claimer1, claimer2 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.2");

      const tx = await redPacket.connect(creator).createExclusiveRedPacket(
        "group1", [claimer1.address, claimer2.address], "Exclusive!",
        { value: amount }
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      expect(event).to.not.be.undefined;
    });
  });

  describe("claimRedPacket", function () {
    async function createRandomPacketFixture() {
      const fixture = await deployFixture();
      const { redPacket, creator } = fixture;
      const amount = ethers.parseEther("0.3");

      const tx = await redPacket.connect(creator).createRandomRedPacket(
        "group1", 3, "Test",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      const packetId = event.args[0];

      return { ...fixture, packetId, amount };
    }

    it("should allow a user to claim a red packet", async function () {
      const { redPacket, claimer1, packetId } = await loadFixture(createRandomPacketFixture);

      const balBefore = await ethers.provider.getBalance(claimer1.address);
      await redPacket.connect(claimer1).claimRedPacket(packetId);
      const balAfter = await ethers.provider.getBalance(claimer1.address);

      expect(balAfter).to.be.gt(balBefore - ethers.parseEther("0.01"));
    });

    it("should reject double claim from same address", async function () {
      const { redPacket, claimer1, packetId } = await loadFixture(createRandomPacketFixture);

      await redPacket.connect(claimer1).claimRedPacket(packetId);
      await expect(
        redPacket.connect(claimer1).claimRedPacket(packetId)
      ).to.be.revertedWith("Already claimed");
    });

    it("should reject claim from creator", async function () {
      const { redPacket, creator, packetId } = await loadFixture(createRandomPacketFixture);

      await expect(
        redPacket.connect(creator).claimRedPacket(packetId)
      ).to.be.revertedWith("Cannot claim own red packet");
    });

    it("should reject claim after all claimed", async function () {
      const { redPacket, claimer1, claimer2, claimer3, other, packetId } =
        await loadFixture(createRandomPacketFixture);

      await redPacket.connect(claimer1).claimRedPacket(packetId);
      await redPacket.connect(claimer2).claimRedPacket(packetId);
      await redPacket.connect(claimer3).claimRedPacket(packetId);

      // After all claims, status becomes COMPLETED so it reverts with "Red packet not active"
      await expect(
        redPacket.connect(other).claimRedPacket(packetId)
      ).to.be.revertedWith("Red packet not active");
    });

    it("should reject claim after expiry", async function () {
      const { redPacket, claimer1, packetId } = await loadFixture(createRandomPacketFixture);

      await time.increase(86401);

      await expect(
        redPacket.connect(claimer1).claimRedPacket(packetId)
      ).to.be.revertedWith("Red packet expired");
    });

    it("should mark packet as completed when all claimed", async function () {
      const { redPacket, claimer1, claimer2, claimer3, packetId } =
        await loadFixture(createRandomPacketFixture);

      await redPacket.connect(claimer1).claimRedPacket(packetId);
      await redPacket.connect(claimer2).claimRedPacket(packetId);
      await redPacket.connect(claimer3).claimRedPacket(packetId);

      const info = await redPacket.getRedPacket(packetId);
      // status is index 12, COMPLETED = 1
      expect(info[12]).to.equal(1);
    });

    it("should reject non-exclusive recipient for exclusive packet", async function () {
      const { redPacket, creator, claimer1, other } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.1");

      const tx = await redPacket.connect(creator).createExclusiveRedPacket(
        "group1", [claimer1.address], "Exclusive!",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      const packetId = event.args[0];

      await expect(
        redPacket.connect(other).claimRedPacket(packetId)
      ).to.be.revertedWith("Not an exclusive recipient");
    });
  });

  describe("refundExpiredRedPacket", function () {
    it("should refund remaining funds to creator after expiry", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.3");

      const tx = await redPacket.connect(creator).createRandomRedPacket(
        "group1", 3, "Test",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      const packetId = event.args[0];

      await time.increase(86401);

      const balBefore = await ethers.provider.getBalance(creator.address);
      await redPacket.connect(creator).refundExpiredRedPacket(packetId);
      const balAfter = await ethers.provider.getBalance(creator.address);

      expect(balAfter).to.be.gt(balBefore - ethers.parseEther("0.01"));
    });

    it("should reject refund before expiry", async function () {
      const { redPacket, creator } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.3");

      const tx = await redPacket.connect(creator).createRandomRedPacket(
        "group1", 3, "Test",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      const packetId = event.args[0];

      await expect(
        redPacket.connect(creator).refundExpiredRedPacket(packetId)
      ).to.be.revertedWith("Not expired yet");
    });

    it("should reject refund from non-sender", async function () {
      const { redPacket, creator, other } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.3");

      const tx = await redPacket.connect(creator).createRandomRedPacket(
        "group1", 3, "Test",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      const packetId = event.args[0];

      await time.increase(86401);

      await expect(
        redPacket.connect(other).refundExpiredRedPacket(packetId)
      ).to.be.revertedWith("Not sender");
    });
  });

  describe("View functions", function () {
    it("should track claim records", async function () {
      const { redPacket, creator, claimer1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.3");

      const tx = await redPacket.connect(creator).createRandomRedPacket(
        "group1", 3, "Test",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      const packetId = event.args[0];

      await redPacket.connect(claimer1).claimRedPacket(packetId);

      const records = await redPacket.getClaimRecords(packetId);
      expect(records.length).to.equal(1);
      expect(records[0].claimer).to.equal(claimer1.address);
    });

    it("should check claimability", async function () {
      const { redPacket, creator, claimer1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.3");

      const tx = await redPacket.connect(creator).createRandomRedPacket(
        "group1", 3, "Test",
        { value: amount }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RedPacketCreated"
      );
      const packetId = event.args[0];

      expect(await redPacket.isClaimable(packetId, claimer1.address)).to.equal(true);
      expect(await redPacket.isClaimable(packetId, creator.address)).to.equal(false);
    });
  });

  describe("Pause", function () {
    it("should prevent creating red packets when paused", async function () {
      const { redPacket, owner, creator } = await loadFixture(deployFixture);
      await redPacket.connect(owner).pause();

      await expect(
        redPacket.connect(creator).createRandomRedPacket(
          "group1", 5, "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.reverted;
    });

    it("should allow operations after unpause", async function () {
      const { redPacket, owner, creator } = await loadFixture(deployFixture);
      await redPacket.connect(owner).pause();
      await redPacket.connect(owner).unpause();

      await expect(
        redPacket.connect(creator).createRandomRedPacket(
          "group1", 5, "Test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.not.be.reverted;
    });
  });
});
