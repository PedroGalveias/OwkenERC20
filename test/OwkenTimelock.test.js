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
  expectRevert,
  balance,
  time,
  constants,
} = require("@openzeppelin/test-helpers");

// *** Load compiled artifacts ***
const Owken = artifacts.require("Owken");
const Conversion = artifacts.require("OwkenConversion");
const Lock = artifacts.require("OwkenTimelock");

let openingTime;
let closingTime;

require("chai").use(require("chai-as-promised")).should();

contract("Owken Timelock", ([creator, investor, wallet]) => {
  let conversion;
  let lock;
  let token;
  const supply = new BN(Web3.utils.toWei("2000000", "ether"));
  let amount = new BN(1);

  before(async () => {
    token = await deployProxy(Owken, { initializer: "initialize" });

    openingTime = new BN(await time.latest()).add(time.duration.seconds(100));
    closingTime = openingTime.add(time.duration.days(8));

    try {
      lock = await Lock.new(investor, { from: creator });
    } catch (error) {
      expect(error.reason).to.be.equal(
        "ERROR_TIMELOCK: Not a contract address"
      );
    }

    lock = await Lock.new(token.address, { from: creator });
    conversion = await Conversion.new(
      token.address,
      lock.address,
      openingTime,
      closingTime,
      { from: creator }
    );

    token.approve(conversion.address, supply);

    conversion.grantOperatorRole(token.address);
    conversion.grantOperatorRole(lock.address);
  });

  it("has token", async () => {
    expect(await lock.getToken()).to.be.equal(token.address);
  });

  describe("Conversion - Deposits - Closed", async () => {
    it("deposits referral conversion is closed", async () => {
      await expectRevert.unspecified(
        conversion.depositReferral(investor, 1, { from: creator })
      );
    });

    it("deposits direct conversion is closed", async () => {
      await expectRevert.unspecified(
        conversion.depositDirect(investor, 1, { from: creator })
      );
    });

    it("deposits purchase conversion is closed", async () => {
      await expectRevert.unspecified(
        conversion.depositPurchase(investor, 1, { from: creator })
      );
    });
  });

  describe("Conversion - Deposit tokens - Open", async () => {
    before(async () => {
      await time.increaseTo(openingTime.add(time.duration.seconds(5)));
    });

    it("deposit referral", async () => {
      expect(conversion.isOpen());

      try {
        await conversion.depositReferral(constants.ZERO_ADDRESS, amount, {
          from: creator,
        });
      } catch (error) {
        expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid address");
      }

      try {
        await conversion.depositReferral(investor, 0, { from: creator });
      } catch (error) {
        expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
      }

      expect(
        await conversion.depositReferral(investor, amount, { from: creator })
      );
      expect(
        await conversion.getBalanceReferral(investor)
      ).to.be.bignumber.equal(amount);
    });

    it("deposit direct", async () => {
      expect(conversion.isOpen());

      try {
        await conversion.depositDirect(constants.ZERO_ADDRESS, amount, {
          from: creator,
        });
      } catch (error) {
        expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid address");
      }

      try {
        await conversion.depositDirect(investor, 0, { from: creator });
      } catch (error) {
        expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
      }

      expect(
        await conversion.depositDirect(investor, amount, { from: creator })
      );
      expect(await conversion.getBalanceDirect(investor)).to.be.bignumber.equal(
        amount
      );
    });

    it("deposit purchase", async () => {
      expect(conversion.isOpen());

      try {
        await conversion.depositPurchase(constants.ZERO_ADDRESS, amount, {
          from: creator,
        });
      } catch (error) {
        expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid address");
      }

      try {
        await conversion.depositPurchase(investor, 0, { from: creator });
      } catch (error) {
        expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
      }

      expect(
        await conversion.depositPurchase(investor, amount, { from: creator })
      );
      expect(
        await conversion.getBalancePurchase(investor)
      ).to.be.bignumber.equal(amount);
    });
  });

  describe("Conversion - Withdraw - Open", async () => {
    it("cannot send referral conversion to timelock contract", async () => {
      await expectRevert.unspecified(
        conversion.withdrawReferral(investor, { from: creator })
      );
    });

    it("cannot send direct conversion to timelock contract", async () => {
      await expectRevert.unspecified(
        conversion.withdrawDirect(investor, { from: creator })
      );
    });

    it("cannot send purchase tokens to timelock contract", async () => {
      await expectRevert.unspecified(
        conversion.withdrawPurchase(investor, { from: creator })
      );
    });
  });

  describe("Conversion - Withdraw tokens - Closed", async () => {
    before(async () => {
      await time.increaseTo(closingTime.add(time.duration.seconds(15)));
    });

    it("withdraw referral", async () => {
      expect(conversion.hasClosed());
      expect(await conversion.withdrawReferral(investor));
      let balance = await conversion.getBalanceReferral(investor);
      expect(balance).to.be.bignumber.equal(new BN(0));
    });

    it("withdraw direct", async () => {
      expect(conversion.hasClosed());
      expect(await conversion.withdrawDirect(investor));
      let balance = await conversion.getBalanceDirect(investor);
      expect(balance).to.be.bignumber.equal(new BN(0));
    });

    it("withdraw purchase", async () => {
      expect(conversion.hasClosed());
      expect(await conversion.withdrawPurchase(investor));
      let balance = await conversion.getBalanceDirect(investor);
      expect(balance).to.be.bignumber.equal(new BN(0));
    });
  });

  describe("Timelock", async () => {
    describe("Testing requires", async () => {
      it("lock direct", async () => {
        try {
          await lock.lockDirect(constants.ZERO_ADDRESS, 1);
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid address");
        }

        try {
          await lock.lockDirect(investor, 0);
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid amount");
        }
      });

      it("lock referral", async () => {
        try {
          await lock.lockReferral(constants.ZERO_ADDRESS, 1);
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid address");
        }

        try {
          await lock.lockReferral(investor, 0);
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid amount");
        }
      });

      it("lock purchase", async () => {
        try {
          await lock.lockPurchase(constants.ZERO_ADDRESS, 1);
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid address");
        }

        try {
          await lock.lockPurchase(investor, 0);
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid amount");
        }
      });
      describe("Tokens are locked", async () => {
        it("referral are locked", async () => {
          let lockAddress = await lock.getLockedTokensAddress(0);
          let lockTokenAmount = new BN(await lock.getLockedTokens(0));
          expect(lockAddress).to.equal(investor);
          expect(lockTokenAmount).to.be.bignumber.equal(new BN(1));
        });

        it("direct are locked", async () => {
          let lockAddress = await lock.getLockedTokensAddress(1);
          let lockTokenAmount = new BN(await lock.getLockedTokens(1));
          expect(lockAddress).to.equal(investor);
          expect(lockTokenAmount).to.be.bignumber.equal(new BN(1));
        });

        it("purchase are locked", async () => {
          let lockAddress = await lock.getLockedTokensAddress(2);
          let lockTokenAmount = new BN(await lock.getLockedTokens(2));
          expect(lockAddress).to.equal(investor);
          expect(lockTokenAmount).to.be.bignumber.equal(new BN(1));
        });

        it("get locks array", async () => {
          expect(await lock.getLocks()).to.be.a("array");
        });
      });

      describe("Withdraw before locking period ends", async () => {
        it("withdraw referral", async () => {
          await expectRevert.unspecified(lock.withdraw(0, { from: investor }));
        });

        it("withdraw direct", async () => {
          await expectRevert.unspecified(lock.withdraw(1, { from: investor }));
        });

        it("withdraw purchase", async () => {
          await expectRevert.unspecified(lock.withdraw(2, { from: investor }));
        });
      });

      describe("Withdraw", async () => {
        let deletedElements = new BN(0);

        it("withdraw referral", async () => {
          await time.increase(time.duration.days(95));
          const tracker = await balance.tracker(investor, "wei");
          const currentBalance = await tracker.get();
          let lockAddress;
          let length = new BN(await lock.getLocksLength());

          try {
            await lock.withdraw(-1, { from: investor });
          } catch (error) {
            expect(error.reason).to.be.equal("value out-of-bounds");
          }

          expect(await lock.withdraw(0, { from: investor }));
          deletedElements++;
          lockAddress = new BN(
            await lock.getLockedTokensAddress(length - deletedElements)
          );
          expect(
            lockAddress == constants.ZERO_ADDRESS,
            "ERROR: Lock address is not a ZERO ADDRESS"
          );
          currentBalance.should.be.equal(currentBalance.iadd(amount));
        });

        it("withdraw direct", async () => {
          await time.increase(time.duration.days(185));
          const tracker = await balance.tracker(investor, "wei");
          const currentBalance = await tracker.get();
          let lockAddress;
          let length = new BN(await lock.getLocksLength());
          expect(await lock.withdraw(0, { from: investor }));
          deletedElements++;
          lockAddress = new BN(
            await lock.getLockedTokensAddress(length - deletedElements)
          );
          expect(
            lockAddress == constants.ZERO_ADDRESS,
            "ERROR: Lock address is not a ZERO ADDRESS"
          );
          currentBalance.should.be.equal(currentBalance.iadd(amount));
        });

        it("withdraw purchase", async () => {
          await time.increase(time.duration.years(1));
          const tracker = await balance.tracker(investor, "wei");
          const currentBalance = await tracker.get();
          let lockAddress;
          let length = new BN(await lock.getLocksLength());
          expect(await lock.withdraw(0, { from: investor }));
          deletedElements++;
          lockAddress = new BN(
            await lock.getLockedTokensAddress(length - deletedElements)
          );
          expect(
            lockAddress == constants.ZERO_ADDRESS,
            "ERROR: Lock address is not a ZERO ADDRESS"
          );
          currentBalance.should.be.equal(currentBalance.iadd(amount));
        });
      });

      describe("Generic lock", async () => {
        it("Testing requirements", async () => {
          let lockTime = openingTime.add(time.duration.seconds(100));
          let errorLockTime = openingTime.sub(time.duration.seconds(10000));

          await token.increaseAllowance(lock.address, 100, { from: creator });

          try {
            await lock.lock(constants.ZERO_ADDRESS, 1, lockTime);
          } catch (error) {
            expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid address");
          }

          try {
            await lock.lock(investor, 0, lockTime);
          } catch (error) {
            expect(error.reason).to.be.equal("ERROR_TIMELOCK: Invalid amount");
          }

          try {
            await lock.lock(investor, 1, errorLockTime);
          } catch (error) {
            expect(error.reason).to.be.equal(
              "ERROR_TIMELOCK: Lock time is before current time"
            );
          }
        });

        it("create", async () => {
          let lockTime = openingTime.add(time.duration.seconds(100));
          expect(await lock.lock(investor, 1, lockTime));
        });
      });
    });
  });
});
