const Web3 = require("web3");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

require("@openzeppelin/test-helpers/configure")({
  provider: web3.currentProvider,
  singletons: {
    abstraction: "truffle",
  },
});

const { BN, time } = require("@openzeppelin/test-helpers");

// *** Require Contracts ***
const Owken = artifacts.require("Owken");
const OwkenConversion = artifacts.require("OwkenConversion");
const OwkenTimelock = artifacts.require("OwkenTimelock");
const VestingVault12 = artifacts.require("VestingVault12");

module.exports = async function (deployer, network, accounts) {
  console.log("=== STARTING DEPLOY ===");
  accounts = await web3.eth.getAccounts();

  openingTime = new BN(await time.latest()).add(time.duration.seconds(800));
  closingTime = openingTime.add(time.duration.days(3));

  const supply = new BN(Web3.utils.toWei("200000", "ether"));

  // *** Vesting Address Recipients ***
  // const earlyInvestors = '0xcD62398801587b10402445DF6d0847140e81DD72';
  // const privateSale = '0x19D6089eE250Ab3B0D759489e864976FFBc658e0'
  // const foundersFund = '0x4f829C79C6DFE08AD549a2c255EB104A734DB40C';
  // const adoptionMarketingFund = '0xa36D62A9A810DcCB3A969308C9d78AcE70286210';
  // const team = '0x6E356BC56F5C92c68504e4992B5f92e1845651e2';
  // const liquidity = '0x8D6Cc119D798624250BbdFaFB4314Fe33CFf1A6a';

  const earlyInvestors = accounts[1];
  const privateSale = accounts[2];
  const foundersFund = accounts[3];
  const adoptionMarketingFund = accounts[4];
  const team = accounts[5];
  const liquidity = accounts[6];

  // *** Vesting Amounts ***
  const earlyInvestorsAmount = Web3.utils.toWei("156514.5", "ether");
  const privateSaleAmount = Web3.utils.toWei("105579.15", "ether");
  const foundersFundAmount = Web3.utils.toWei("3000000", "ether");
  const adoptionMarketingFundAmount = Web3.utils.toWei("800000", "ether");
  const teamAmount = Web3.utils.toWei("1000000", "ether");
  const liquidityAmount = Web3.utils.toWei("1800000", "ether");

  // *** Vesting Duration in days ***
  const earlyInvestorsDuration = 6;
  const privateSaleDuration = 6;
  const foundersFundDuration = 12;
  const adoptionMarketingFundDuration = 18;
  const teamDuration = 12;
  const liquidityDuration = 9;

  // *** Vesting Cliff in days ***
  const earlyInvestorsCliff = 1;
  const privateSaleCliff = 1;
  const foundersFundCliff = 1;
  const adoptionMarketingFundCliff = 1;
  const teamCliff = 1;
  const liquidityCliff = 1;

  // *** Vesting Start Time in days ***
  const earlyInvestorsStartTime = openingTime;
  const privateSaleStartTime = openingTime;
  const foundersFundStartTime = openingTime.add(time.duration.days(24));
  const adoptionMarketingFundStartTime = openingTime;
  const teamStartTime = openingTime.add(time.duration.days(12));
  const liquidityStartTime = openingTime;

  // *** Total tokens that need to be approved to Vest contract ***
  const totalVest = Web3.utils.toWei("8719093.65", "ether");

  // *** Deploy Owken ***
  console.log("Deploying Owken...");
  const token = await deployProxy(Owken, { deployer });

  console.log(`Deployed? ${Owken.isDeployed()}`);
  console.log(`My address: ${token.address}`);

  console.log("=== Owken ERC20 FINISHED ===");

  // *** Deploy OwkenTimelock ***
  console.log("Deploying OwkenTimelock...");
  await deployer.deploy(OwkenTimelock, token.address);
  const lock = await OwkenTimelock.deployed();

  console.log(`Deployed? ${OwkenTimelock.isDeployed()}`);
  console.log(`My address: ${lock.address}`);

  console.log("=== OwkenTimelock FINISHED ===");

  // *** Deploy OwkenConversion ***
  console.log("Deploying OwkenConversion...");
  await deployer.deploy(
    OwkenConversion,
    token.address,
    lock.address,
    openingTime,
    closingTime
  );
  const offers = await OwkenConversion.deployed();

  console.log(`Deployed? ${OwkenConversion.isDeployed()}`);
  console.log(`My address: ${offers.address}`);

  token.approve(offers.address, supply);
  token.approve(lock.address, supply);

  console.log("Offers contract funded with success!");

  console.log("=== OwkenConversion FINISHED ===.");

  // *** Deploy VestingVault12 ***
  console.log("Deploying Vesting Contract...");
  await deployer.deploy(VestingVault12, token.address);
  const vest = await VestingVault12.deployed();

  console.log(`Deployed? ${VestingVault12.isDeployed()}`);
  console.log(`My address: ${vest.address}`);

  // *** Transfer funds to vesting contract ***
  console.log("Approving tokens to vesting contract...");
  await token.approve(vest.address, totalVest);
  console.log("Done");
  console.log("Creating token grants...");
  await vest.addTokenGrant(
    earlyInvestors,
    earlyInvestorsStartTime,
    earlyInvestorsAmount,
    earlyInvestorsDuration,
    earlyInvestorsCliff
  );
  console.log("Early Investors grand DONE");
  await vest.addTokenGrant(
    privateSale,
    privateSaleStartTime,
    privateSaleAmount,
    privateSaleDuration,
    privateSaleCliff
  );
  console.log("Private Sale grand DONE");
  await vest.addTokenGrant(
    foundersFund,
    foundersFundStartTime,
    foundersFundAmount,
    foundersFundDuration,
    foundersFundCliff
  );
  console.log("Founders Fund grand DONE");
  await vest.addTokenGrant(
    adoptionMarketingFund,
    adoptionMarketingFundStartTime,
    adoptionMarketingFundAmount,
    adoptionMarketingFundDuration,
    adoptionMarketingFundCliff
  );
  console.log("Adoption Fund / Marketing grand DONE");
  await vest.addTokenGrant(
    team,
    teamStartTime,
    teamAmount,
    teamDuration,
    teamCliff
  );
  console.log("Team grand DONE");
  await vest.addTokenGrant(
    liquidity,
    liquidityStartTime,
    liquidityAmount,
    liquidityDuration,
    liquidityCliff
  );
  console.log("Liquidity grand DONE");

  console.log("All token grants are created with success");

  console.log("=== Vesting FINISHED ===");

  // *** Grant roles to contracts *** ==>  REVIEW TO SEE IF ALL GRANTS ARE NECESSARY
  console.log("Granting roles to the contracts...");
  offers.grantOperatorRole(token.address);
  offers.grantOperatorRole(lock.address);
  console.log("=== Grating roles FINISHED ===");

  console.log("*** === FINISHED DEPLOY === ***");
};
