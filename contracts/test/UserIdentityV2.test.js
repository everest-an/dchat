const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("UserIdentityV2", function () {
  async function deployFixture() {
    const [owner, user1, user2, other] = await ethers.getSigners();
    const UserIdentityV2 = await ethers.getContractFactory("UserIdentityV2");
    const identity = await UserIdentityV2.deploy();
    return { identity, owner, user1, user2, other };
  }

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      const { identity, owner } = await loadFixture(deployFixture);
      expect(await identity.owner()).to.equal(owner.address);
    });

    it("should have correct constants", async function () {
      const { identity } = await loadFixture(deployFixture);
      expect(await identity.MAX_NAME_LENGTH()).to.equal(128);
      expect(await identity.MAX_BIO_LENGTH()).to.equal(1024);
      expect(await identity.MAX_SKILLS()).to.equal(50);
    });
  });

  describe("registerUser", function () {
    it("should register a new user", async function () {
      const { identity, user1 } = await loadFixture(deployFixture);

      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");

      const profile = await identity.getUserProfile(user1.address);
      expect(profile.username).to.equal("alice");
      expect(profile.displayName).to.equal("Alice");
      expect(profile.isActive).to.equal(true);
      expect(profile.reputationScore).to.equal(100);
    });

    it("should reject duplicate username", async function () {
      const { identity, user1, user2 } = await loadFixture(deployFixture);

      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");

      await expect(
        identity.connect(user2).registerUser("alice", "Bob", "bob@test.com")
      ).to.be.revertedWith("Username already taken");
    });

    it("should reject double registration", async function () {
      const { identity, user1 } = await loadFixture(deployFixture);

      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");

      await expect(
        identity.connect(user1).registerUser("alice2", "Alice2", "alice2@test.com")
      ).to.be.revertedWith("User already registered");
    });

    it("should reject empty username", async function () {
      const { identity, user1 } = await loadFixture(deployFixture);

      await expect(
        identity.connect(user1).registerUser("", "Alice", "alice@test.com")
      ).to.be.revertedWith("Invalid username");
    });

    it("should lookup user by username", async function () {
      const { identity, user1 } = await loadFixture(deployFixture);

      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");

      const addr = await identity.getUserByUsername("alice");
      expect(addr).to.equal(user1.address);
    });

    it("should increment totalUsers", async function () {
      const { identity, user1, user2 } = await loadFixture(deployFixture);

      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");
      expect(await identity.totalUsers()).to.equal(1);

      await identity.connect(user2).registerUser("bob", "Bob", "bob@test.com");
      expect(await identity.totalUsers()).to.equal(2);
    });
  });

  describe("updateProfile", function () {
    async function registeredFixture() {
      const fixture = await deployFixture();
      const { identity, user1, user2 } = fixture;
      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");
      await identity.connect(user2).registerUser("bob", "Bob", "bob@test.com");
      return fixture;
    }

    it("should update profile for registered user", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).updateProfile("Alice Updated", "ipfs://new-avatar", "New bio");

      const profile = await identity.getUserProfile(user1.address);
      expect(profile.displayName).to.equal("Alice Updated");
      expect(profile.avatar).to.equal("ipfs://new-avatar");
      expect(profile.bio).to.equal("New bio");
    });

    it("should reject update from unregistered user", async function () {
      const { identity, other } = await loadFixture(registeredFixture);

      await expect(
        identity.connect(other).updateProfile("Name", "avatar", "Bio")
      ).to.be.revertedWith("User not registered");
    });
  });

  describe("Skills", function () {
    async function registeredFixture() {
      const fixture = await deployFixture();
      const { identity, user1, user2 } = fixture;
      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");
      await identity.connect(user2).registerUser("bob", "Bob", "bob@test.com");
      return fixture;
    }

    it("should add a skill", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addSkill("Solidity", "Programming", 3);

      const skills = await identity.getUserSkills(user1.address);
      expect(skills.length).to.equal(1);
      expect(skills[0].name).to.equal("Solidity");
      expect(skills[0].category).to.equal("Programming");
      expect(skills[0].level).to.equal(3);
    });

    it("should reject empty skill name", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await expect(
        identity.connect(user1).addSkill("", "Programming", 3)
      ).to.be.revertedWith("Invalid skill name");
    });

    it("should reject invalid skill level", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await expect(
        identity.connect(user1).addSkill("Solidity", "Programming", 0)
      ).to.be.revertedWith("Level must be 1-5");

      await expect(
        identity.connect(user1).addSkill("Solidity", "Programming", 6)
      ).to.be.revertedWith("Level must be 1-5");
    });

    it("should update a skill", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addSkill("Solidity", "Programming", 3);
      await identity.connect(user1).updateSkill(0, "Solidity", "Blockchain", 5);

      const skills = await identity.getUserSkills(user1.address);
      expect(skills[0].level).to.equal(5);
      expect(skills[0].category).to.equal("Blockchain");
    });

    it("should remove a skill", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addSkill("Solidity", "Programming", 3);
      await identity.connect(user1).addSkill("JavaScript", "Programming", 4);
      await identity.connect(user1).removeSkill(0);

      const skills = await identity.getUserSkills(user1.address);
      expect(skills.length).to.equal(1);
      // Last element replaces removed one
      expect(skills[0].name).to.equal("JavaScript");
    });

    it("should allow endorsing another user's skill", async function () {
      const { identity, user1, user2 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addSkill("Solidity", "Programming", 3);
      await identity.connect(user2).endorseSkill(user1.address, 0);

      const skills = await identity.getUserSkills(user1.address);
      expect(skills[0].endorsements).to.equal(1);
    });

    it("should reject self-endorsement", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addSkill("Solidity", "Programming", 3);

      await expect(
        identity.connect(user1).endorseSkill(user1.address, 0)
      ).to.be.revertedWith("Cannot endorse yourself");
    });

    it("should reject double endorsement", async function () {
      const { identity, user1, user2 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addSkill("Solidity", "Programming", 3);
      await identity.connect(user2).endorseSkill(user1.address, 0);

      await expect(
        identity.connect(user2).endorseSkill(user1.address, 0)
      ).to.be.revertedWith("Already endorsed");
    });
  });

  describe("Work Experience", function () {
    async function registeredFixture() {
      const fixture = await deployFixture();
      const { identity, user1 } = fixture;
      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");
      return fixture;
    }

    it("should add work experience", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addWorkExperience(
        "comp1", "Ethereum Foundation", "Developer", "Engineering", "Remote",
        1640000000, 0, true
      );

      const experiences = await identity.getUserWorkExperiences(user1.address);
      expect(experiences.length).to.equal(1);
      expect(experiences[0].companyName).to.equal("Ethereum Foundation");
      expect(experiences[0].position).to.equal("Developer");
      expect(experiences[0].isCurrent).to.equal(true);
    });

    it("should get current work", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addWorkExperience(
        "comp1", "Old Company", "Dev", "Eng", "NYC",
        1600000000, 1630000000, false
      );
      await identity.connect(user1).addWorkExperience(
        "comp2", "Current Company", "Senior Dev", "Eng", "Remote",
        1640000000, 0, true
      );

      const current = await identity.getCurrentWork(user1.address);
      expect(current.companyName).to.equal("Current Company");
    });

    it("should reject empty company name", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await expect(
        identity.connect(user1).addWorkExperience(
          "comp1", "", "Developer", "Eng", "Remote",
          1640000000, 0, true
        )
      ).to.be.revertedWith("Company name required");
    });

    it("should reject empty position", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await expect(
        identity.connect(user1).addWorkExperience(
          "comp1", "Company", "", "Eng", "Remote",
          1640000000, 0, true
        )
      ).to.be.revertedWith("Position required");
    });

    it("should update work experience", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).addWorkExperience(
        "comp1", "Company", "Dev", "Eng", "Remote",
        1640000000, 0, true
      );

      await identity.connect(user1).updateWorkExperience(
        0, "Senior Dev", "Platform", 1700000000, false
      );

      const experiences = await identity.getUserWorkExperiences(user1.address);
      expect(experiences[0].position).to.equal("Senior Dev");
      expect(experiences[0].department).to.equal("Platform");
      expect(experiences[0].isCurrent).to.equal(false);
    });
  });

  describe("LinkedIn Integration", function () {
    async function registeredFixture() {
      const fixture = await deployFixture();
      const { identity, user1 } = fixture;
      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");
      return fixture;
    }

    it("should connect LinkedIn account", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await identity.connect(user1).connectLinkedIn("linkedin123", "https://linkedin.com/in/alice");

      const profile = await identity.getUserProfile(user1.address);
      expect(profile.linkedInId).to.equal("linkedin123");
      expect(profile.isLinkedInVerified).to.equal(true);
    });

    it("should reject empty LinkedIn ID", async function () {
      const { identity, user1 } = await loadFixture(registeredFixture);

      await expect(
        identity.connect(user1).connectLinkedIn("", "https://linkedin.com")
      ).to.be.revertedWith("LinkedIn ID required");
    });
  });

  describe("Pause", function () {
    it("should prevent registration when paused", async function () {
      const { identity, owner, user1 } = await loadFixture(deployFixture);
      await identity.connect(owner).pause();

      await expect(
        identity.connect(user1).registerUser("alice", "Alice", "alice@test.com")
      ).to.be.reverted;
    });

    it("should allow registration after unpause", async function () {
      const { identity, owner, user1 } = await loadFixture(deployFixture);
      await identity.connect(owner).pause();
      await identity.connect(owner).unpause();

      await identity.connect(user1).registerUser("alice", "Alice", "alice@test.com");
      expect(await identity.isUserRegistered(user1.address)).to.equal(true);
    });
  });
});
