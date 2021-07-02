// SPDX-License-Identifier: GPLv3
const { expect } = require("chai");
const Web3 = require("web3");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

require("@openzeppelin/test-helpers/configure")({
  provider: web3.currentProvider,
  singletons: {
    abstraction: "truffle",
  },
});

// *** Import utilities from Test Helpers ***
const {
  BN,
  expectEvent,
  time,
  constants,
} = require("@openzeppelin/test-helpers");

// *** Load compiled artifacts ***
const Owken = artifacts.require("Owken");
const VestingVault12 = artifacts.require("VestingVault12");

require("chai").use(require("chai-as-promised")).should();

contract("VestingVault12", ([creator, grant1Account, newMultisigAccount]) => {
  let token;
  let vesting;

  // *** Vesting Amounts ***
  const grant1Amount = Web3.utils.toWei("1000", "ether");

  // *** Vesting Duration in days ***
  const grant1Duration = 2;

  // *** Vesting Cliff in days ***
  const grant1Cliff = 1;

  // *** Vesting Start Time in seconds ***
  let grant1StartTime;

  before(async () => {
    // *** Vesting Start Time in seconds ***
    grant1StartTime = new BN(await time.latest()).add(
      time.duration.seconds(800)
    );

    token = await deployProxy(Owken, { initializer: "initialize" });
    vesting = await VestingVault12.new(token.address, { from: creator });

    await token.approve(vesting.address, grant1Amount);
  });

  it("Revert - New instance with 0 address", async () => {
    try {
      await VestingVault12.new(constants.ZERO_ADDRESS, { from: creator });
    } catch (e) {
      expect(e);
    }
  });

  describe("Add grants", async () => {
    it("Revert - Grant Cliff in days is more than 10 years", async () => {
      const grantCliffTime = 3653; // 10 years in days
      try {
        await vesting.addTokenGrant(
          grant1Account,
          grant1StartTime,
          grant1Amount,
          grant1Duration,
          grantCliffTime
        );
      } catch (e) {
        expect(e.reason).to.be.equal("more than 10 years");
      }
    });

    it("Revert - Grant Duration in days is more than 25 years", async () => {
      const grantDuration = 9132; // 25 years in days
      try {
        await vesting.addTokenGrant(
          grant1Account,
          grant1StartTime,
          grant1Amount,
          grantDuration,
          grant1Cliff
        );
      } catch (e) {
        expect(e.reason).to.be.equal("more than 25 years");
      }
    });

    it("Revert - Grant Duration is smaller than Grant cliff", async () => {
      const grantDuration = 1;
      const grantCliffTime = 2;
      try {
        await vesting.addTokenGrant(
          grant1Account,
          grant1StartTime,
          grant1Amount,
          grantDuration,
          grantCliffTime
        );
      } catch (e) {
        expect(e.reason).to.be.equal("Duration < Cliff");
      }
    });

    it("Revert - Grant Amount is Zero", async () => {
      try {
        await vesting.addTokenGrant(
          grant1Account,
          grant1StartTime,
          0,
          grant1Duration,
          grant1Cliff
        );
      } catch (e) {
        expect(e.reason).to.be.equal("amountVestedPerDay > 0");
      }
    });

    it("Success", async () => {
      const receipt = await vesting.addTokenGrant(
        grant1Account,
        grant1StartTime,
        grant1Amount,
        grant1Duration,
        grant1Cliff
      );
      expectEvent(receipt, "GrantAdded");
      expect((await vesting.getActiveGrants(grant1Account)).length).to.be.equal(
        1
      );
    });
  });

  describe("Get Active Grants", async () => {
    it("Grants increase", async () => {
      const newGrantAmmount = Web3.utils.toWei("1", "ether");
      const newGrantCliff = 1; // in Days
      const newGrantDuration = 1; // in Days

      await token.increaseAllowance(vesting.address, newGrantAmmount);

      const receipt = await vesting.addTokenGrant(
        grant1Account,
        grant1StartTime,
        newGrantAmmount,
        newGrantCliff,
        newGrantDuration
      );
      expectEvent(receipt, "GrantAdded");
      expect((await vesting.getActiveGrants(grant1Account)).length).to.be.equal(
        2
      );
    });
  });

  describe("Remove Grant", async () => {
    it("Removal", async () => {
      const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
        parseInt(v.toString())
      );

      const receipt = await vesting.removeTokenGrant(grants[1]);
      expectEvent(receipt, "GrantRemoved");
    });
  });

  describe("Tokens Vested per day", async () => {
    it("Grant 1", async () => {
      const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
        parseInt(v.toString())
      );

      const vestedPerDayCalc = new BN(grant1Amount).div(new BN(grant1Duration));
      const vestedPerDayContract = await vesting.tokensVestedPerDay(grants[0]);

      expect(vestedPerDayContract).to.be.bignumber.equal(vestedPerDayCalc);
    });
  });

  describe("Calculate Grant before cliff", async () => {
    before(
      async () =>
        await time.increaseTo(grant1StartTime.add(time.duration.seconds(100)))
    );

    it("Grant 1", async () => {
      const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
        parseInt(v.toString())
      );

      const vested = await vesting.calculateGrantClaim(grants[0]);

      expect(vested[0]).to.be.bignumber.equal(new BN(0));
      expect(vested[1]).to.be.bignumber.equal(new BN(0));
    });
  });

  describe("Claim vested tokens", async () => {
    it("Revert on claim before cliff", async () => {
      const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
        parseInt(v.toString())
      );

      try {
        await vesting.claimVestedTokens(grants[0]);
      } catch (e) {
        expect(e.reason).to.be.equal("amountVested is 0");
      }
    });

    describe("First claim", async () => {
      before(async () => await time.increase(time.duration.days(1)));

      it("Calculate claim after cliff", async () => {
        const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
          parseInt(v.toString())
        );

        let vested = await vesting.calculateGrantClaim(grants[0]);
        const vestedPerDay = await vesting.tokensVestedPerDay(grants[0]);

        expect(vested[0]).to.be.bignumber.equal(new BN(1));
        expect(vested[1]).to.be.bignumber.equal(vestedPerDay);
      });

      it("Claim grant", async () => {
        const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
          parseInt(v.toString())
        );

        const receipt = await vesting.claimVestedTokens(grants[0]);
        expectEvent(receipt, "GrantTokensClaimed");
      });

      it("Calculate claim after claim", async () => {
        const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
          parseInt(v.toString())
        );

        vested = await vesting.calculateGrantClaim(grants[0]);
        expect(vested[0]).to.be.bignumber.equal(new BN(0));
        expect(vested[1]).to.be.bignumber.equal(new BN(0));
      });
    });

    describe("Second claim", async () => {
      before(async () => await time.increase(time.duration.days(1)));

      it("Claim grant", async () => {
        const grants = (await vesting.getActiveGrants(grant1Account)).map((v) =>
          parseInt(v.toString())
        );

        const receipt = await vesting.claimVestedTokens(grants[0]);
        expectEvent(receipt, "GrantTokensClaimed");
      });
    });

    describe("Change Multisig", async () => {
      it("Revert - Address 0", async () => {
        try {
          await vesting.changeMultiSig(constants.ZERO_ADDRESS);
        } catch (e) {
          expect(e.reason).to.be.equal("not valid _recipient");
        }
      });

      it("Revert - address(this)", async () => {
        try {
          await vesting.changeMultiSig(await vesting.address);
        } catch (e) {
          expect(e.reason).to.be.equal("not valid _recipient");
        }
      });

      it("Revert - token address", async () => {
        try {
          await vesting.changeMultiSig(await token.address);
        } catch (e) {
          expect(e.reason).to.be.equal("not valid _recipient");
        }
      });

      it("Revert - Not current Multisig", async () => {
        try {
          await vesting.changeMultiSig(newMultisigAccount, {
            from: newMultisigAccount,
          });
        } catch (e) {
          expect(e.reason).to.be.equal("not owner");
        }
      });

      it("Multisig Changes", async () => {
        const receipt = await vesting.changeMultiSig(newMultisigAccount, {
          from: creator,
        });
        expectEvent(receipt, "ChangedMultisig");
      });
    });
  });
});
