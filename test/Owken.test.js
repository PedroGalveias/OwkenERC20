// SPDX-License-Identifier: GPLv3
const { expect } = require("chai");
const Web3 = require("web3");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

// *** Import utilities from Test Helpers ***
const { BN } = require("@openzeppelin/test-helpers");

// *** Load compiled artifacts ***
const Owken = artifacts.require("Owken");

require("chai").use(require("chai-as-promised")).should();

// *** Start test block ***
contract("Owken", ([creator]) => {
  const NAME = "Owken";
  const SYMBOL = "OAK";
  const TOTAL_SUPPLY = new BN(Web3.utils.toWei("10000000", "ether"));
  let token;

  before(async function () {
    token = await deployProxy(Owken, { initializer: "initialize" });
  });

  it("has a total supply", async function () {
    expect(await token.totalSupply()).to.be.bignumber.equal(TOTAL_SUPPLY);
  });

  it("has a name", async function () {
    expect(await token.name()).to.be.equal(NAME);
  });

  it("has a symbol", async function () {
    expect(await token.symbol()).to.be.equal(SYMBOL);
  });

  it("assigns the initial total supply to the creator", async function () {
    expect(await token.balanceOf(creator)).to.be.bignumber.equal(TOTAL_SUPPLY);
  });
});
