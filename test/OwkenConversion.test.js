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
const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");
const constants = require("@openzeppelin/test-helpers/src/constants");

// *** Load compiled artifacts ***
const Owken = artifacts.require("Owken");
const Conversion = artifacts.require("OwkenConversion");
const Lock = artifacts.require("OwkenTimelock");

let openingTime;
let closingTime;

require("chai").use(require("chai-as-promised")).should();

contract("Owken Conversion", ([creator, investor]) => {
  let conversion;
  let lock;
  let token;
  const supply = new BN(Web3.utils.toWei("2000000", "ether"));

  before(async () => {
    token = await deployProxy(Owken, { initializer: "initialize" });

    openingTime = new BN(await time.latest()).add(time.duration.seconds(100));
    closingTime = openingTime.add(time.duration.weeks(1));

    lock = await Lock.new(token.address, { from: creator });

    let errorOpeningTime = new BN(await time.latest()).sub(
      time.duration.seconds(100)
    );

    try {
      conversion = await Conversion.new(
        token.address,
        lock.address,
        errorOpeningTime,
        closingTime,
        { from: creator }
      );
    } catch (error) {
      expect(error.reason).to.be.equal(
        "ERROR_CONVERSION: Opening time is before current time"
      );
    }

    try {
      conversion = await Conversion.new(
        token.address,
        lock.address,
        closingTime,
        openingTime,
        { from: creator }
      );
    } catch (error) {
      expect(error.reason).to.be.equal(
        "ERROR_CONVERSION: Opening time is not before closing time"
      );
    }

    try {
      conversion = await Conversion.new(
        creator,
        lock.address,
        openingTime,
        closingTime,
        { from: creator }
      );
    } catch (error) {
      expect(error.reason).to.be.equal(
        "ERROR_CONVERSION: Not a contract address"
      );
    }

    try {
      conversion = await Conversion.new(
        token.address,
        creator,
        openingTime,
        closingTime,
        { from: creator }
      );
    } catch (error) {
      expect(error.reason).to.be.equal(
        "ERROR_CONVERSION: Not a contract address"
      );
    }

    conversion = await Conversion.new(
      token.address,
      lock.address,
      openingTime,
      closingTime,
      { from: creator }
    );

    token.approve(conversion.address, supply);
  });

  it("has token", async () => {
    expect(await conversion.getToken()).to.be.equal(token.address);
  });

  it("grants operator role", async function () {
    await conversion.grantOperatorRole(investor, { from: creator });
    expect(await conversion.hasOperatorRole(investor));
  });

  it("revokes operator role", async function () {
    await conversion.revokeOperatorRole(investor, { from: creator });
    expect(!(await conversion.hasOperatorRole(investor)));
  });

  it("only admin can grant role", async function () {
    await expectRevert.unspecified(
      conversion.grantOperatorRole(investor, { from: investor })
    );
  });

  it("has opening time", async () => {
    expect(await conversion.getOpeningTime()).to.be.bignumber.equal(
      openingTime
    );
  });

  it("has closing time", async () => {
    expect(await conversion.getClosingTime()).to.be.bignumber.equal(
      closingTime
    );
  });

  describe("Deposits - Closed", async () => {
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

    it("deposits direct/referral conversion is closed", async () => {
      await expectRevert.unspecified(
        conversion.depositDirectReferral(investor, 1, 1, { from: creator })
      );
    });

    it("deposits direct/purchase conversion is closed", async () => {
      await expectRevert.unspecified(
        conversion.depositDirectPurchase(investor, 1, 1, { from: creator })
      );
    });

    it("deposits referral/purchase conversion is closed", async () => {
      await expectRevert.unspecified(
        conversion.depositReferralPurchase(investor, 1, 1, { from: creator })
      );
    });

    it("deposits durect/referral/purchase conversion is closed", async () => {
      await expectRevert.unspecified(
        conversion.depositDirectReferralPurchase(investor, 1, 1, 1, {
          from: creator,
        })
      );
    });
  });

  describe("Deposits - Open", async () => {
    before(async () => {
      await time.increaseTo(openingTime.add(time.duration.seconds(5)));
    });

    describe("testing requires", async () => {
      it("deposit direct", async () => {
        try {
          await conversion.depositDirect(constants.ZERO_ADDRESS, 1, {
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

        try {
          await conversion.depositDirect(investor, 1, { from: investor });
        } catch (error) {
          expect(error.reason).to.be.equal(
            "ERROR_CONVERSION: Caller is not a operator"
          );
        }
      });

      it("deposit referral", async () => {
        try {
          await conversion.depositReferral(constants.ZERO_ADDRESS, 1, {
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

        try {
          await conversion.depositReferral(investor, 1, { from: investor });
        } catch (error) {
          expect(error.reason).to.be.equal(
            "ERROR_CONVERSION: Caller is not a operator"
          );
        }
      });

      it("deposit purchase", async () => {
        try {
          await conversion.depositPurchase(constants.ZERO_ADDRESS, 1, {
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

        try {
          await conversion.depositPurchase(investor, 1, { from: investor });
        } catch (error) {
          expect(error.reason).to.be.equal(
            "ERROR_CONVERSION: Caller is not a operator"
          );
        }
      });

      it("deposit direct/referral", async () => {
        try {
          await conversion.depositDirectReferral(constants.ZERO_ADDRESS, 1, 1, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid address");
        }

        try {
          await conversion.depositDirectReferral(investor, 0, 1, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositDirectReferral(investor, 1, 0, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositDirectReferral(investor, 1, 1, {
            from: investor,
          });
        } catch (error) {
          expect(error.reason).to.be.equal(
            "ERROR_CONVERSION: Caller is not a operator"
          );
        }
      });

      it("deposit direct/purchase", async () => {
        try {
          await conversion.depositDirectPurchase(constants.ZERO_ADDRESS, 1, 1, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid address");
        }

        try {
          await conversion.depositDirectPurchase(investor, 0, 1, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositDirectPurchase(investor, 1, 0, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositDirectPurchase(investor, 1, 1, {
            from: investor,
          });
        } catch (error) {
          expect(error.reason).to.be.equal(
            "ERROR_CONVERSION: Caller is not a operator"
          );
        }
      });

      it("deposit referral/purchase", async () => {
        try {
          await conversion.depositReferralPurchase(
            constants.ZERO_ADDRESS,
            1,
            1,
            { from: creator }
          );
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid address");
        }

        try {
          await conversion.depositReferralPurchase(investor, 0, 1, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositReferralPurchase(investor, 1, 0, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositReferralPurchase(investor, 1, 1, {
            from: investor,
          });
        } catch (error) {
          expect(error.reason).to.be.equal(
            "ERROR_CONVERSION: Caller is not a operator"
          );
        }
      });

      it("deposit direct/referral/purchase", async () => {
        try {
          await conversion.depositDirectReferralPurchase(
            constants.ZERO_ADDRESS,
            1,
            1,
            1,
            { from: creator }
          );
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid address");
        }

        try {
          await conversion.depositDirectReferralPurchase(investor, 0, 1, 1, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositDirectReferralPurchase(investor, 1, 0, 1, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositDirectReferralPurchase(investor, 1, 1, 0, {
            from: creator,
          });
        } catch (error) {
          expect(error.reason).to.be.equal("ERROR_CONVERSION: Invalid amount");
        }

        try {
          await conversion.depositDirectReferralPurchase(investor, 1, 1, 1, {
            from: investor,
          });
        } catch (error) {
          expect(error.reason).to.be.equal(
            "ERROR_CONVERSION: Caller is not a operator"
          );
        }
      });
    });

    it("deposits referral conversion", async () => {
      expect(await conversion.isOpen()).to.be.true;
      expect(await conversion.depositReferral(investor, 1, { from: creator }));
      expect(
        await conversion.getBalanceReferral(investor)
      ).to.be.bignumber.equal(new BN(1));
    });

    it("deposits direct conversion", async () => {
      expect(await conversion.isOpen()).to.be.true;
      expect(await conversion.depositDirect(investor, 1, { from: creator }));
      expect(await conversion.getBalanceDirect(investor)).to.be.bignumber.equal(
        new BN(1)
      );
    });

    it("deposits purchase conversion", async () => {
      expect(await conversion.isOpen()).to.be.true;
      expect(await conversion.depositPurchase(investor, 1, { from: creator }));
      expect(
        await conversion.getBalancePurchase(investor)
      ).to.be.bignumber.equal(new BN(1));
    });

    it("deposits direct and referral conversion", async () => {
      expect(await conversion.isOpen()).to.be.true;
      await conversion.depositDirectReferral(investor, 1, 1, { from: creator });
      expect(await conversion.getBalanceDirect(investor)).to.be.bignumber.equal(
        new BN(2)
      );
      expect(
        await conversion.getBalanceReferral(investor)
      ).to.be.bignumber.equal(new BN(2));
    });

    it("deposits direct and purchase conversion", async () => {
      expect(await conversion.isOpen()).to.be.true;
      await conversion.depositDirectPurchase(investor, 1, 1, { from: creator });
      expect(await conversion.getBalanceDirect(investor)).to.be.bignumber.equal(
        new BN(3)
      );
      expect(
        await conversion.getBalancePurchase(investor)
      ).to.be.bignumber.equal(new BN(2));
    });

    it("deposits referral and purchase conversion", async () => {
      expect(await conversion.isOpen()).to.be.true;
      await conversion.depositReferralPurchase(investor, 1, 1, {
        from: creator,
      });
      expect(
        await conversion.getBalanceReferral(investor)
      ).to.be.bignumber.equal(new BN(3));
      expect(
        await conversion.getBalancePurchase(investor)
      ).to.be.bignumber.equal(new BN(3));
    });

    it("deposits direct, referral and purchase conversion", async () => {
      expect(await conversion.isOpen()).to.be.true;
      await conversion.depositDirectReferralPurchase(investor, 1, 1, 1, {
        from: creator,
      });
      expect(await conversion.getBalanceDirect(investor)).to.be.bignumber.equal(
        new BN(4)
      );
      expect(
        await conversion.getBalanceReferral(investor)
      ).to.be.bignumber.equal(new BN(4));
      expect(
        await conversion.getBalancePurchase(investor)
      ).to.be.bignumber.equal(new BN(4));
    });
  });

  describe("Withdraw - Open", async () => {
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

    it("cannot send tokens to timelock contract", async () => {
      await expectRevert.unspecified(
        conversion.withdraw(investor, { from: creator })
      );
    });
  });

  describe("Withdraw - Closed", async () => {
    before(async () => {
      await time.increaseTo(closingTime.add(time.duration.seconds(10)));
    });

    it("sends conversion to timelock contract", async () => {
      expect(await conversion.hasClosed()).to.be.true;

      await conversion.withdraw(investor, { from: creator });

      // REFERRAL
      expect(
        await conversion.getBalanceReferral(investor)
      ).to.be.bignumber.equal(new BN(0));
      // DIRECT
      expect(await conversion.getBalanceDirect(investor)).to.be.bignumber.equal(
        new BN(0)
      );
      // PURCHASE
      expect(
        await conversion.getBalancePurchase(investor)
      ).to.be.bignumber.equal(new BN(0));

      expect(await token.balanceOf(lock.address)).to.be.bignumber.equal(
        new BN(12)
      );
    });

    it("cannot withdraw with no balance", async () => {
      expect(await conversion.hasClosed()).to.be.true;
      expect(await conversion.withdrawDirect(investor, { from: creator })).to
        .not.be.true;
      expect(await conversion.withdrawReferral(investor, { from: creator })).to
        .not.be.true;
      expect(await conversion.withdrawPurchase(investor, { from: creator })).to
        .not.be.true;
    });

    describe("Cannot send Ether to conversion contract", async () => {
      it("Revert transaction", async function () {
        try {
          await web3.eth.sendTransaction({
            from: creator,
            to: conversion.address,
            value: Web3.utils.toWei("1", "ether"),
          });
        } catch (error) {
          expect(error.toString()).to.be.equal(
            "Error: Returned error: VM Exception while processing transaction: revert"
          );
        }
      });
    });
  });
});
