/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

// *** Requires ***
const HDWalletProvider = require("@truffle/hdwallet-provider");
const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");

const fs = require("fs");
const mnemonic = fs.readFileSync(".secret").toString().trim();

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  plugins: ["solidity-coverage"],

  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 7545, // Standard Ethereum port (default: none)
      network_id: "5777", // Any network (default: none)
      gasPrice: 27000000000,
    },
    // Another network with more advanced options...
    // advanced: {
    // port: 8777,             // Custom port
    // network_id: 1342,       // Custom network
    // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
    // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
    // from: <address>,        // Account to send txs from (default: accounts[0])
    // websocket: true        // Enable EventEmitter interface for web3 (default: false)
    // },
    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    mainnet: {
      provider: () => {
        var provider = new HDWalletProvider(
          mnemonic,
          `https://eth-mainnet.alchemyapi.io/v2/IdtcL55fpQ3W2womIMsWYXyf_rXPaqg0`,
          0
        );
        var nonceTracker = new NonceTrackerSubprovider();
        provider.engine._providers.unshift(nonceTracker);
        nonceTracker.setEngine(provider.engine);
        return provider;
      },
      network_id: 1, // Ropsten's id
      gas: 14092615, // Ropsten has a lower block limit than mainnet
      gasPrice: 100000000000, // gas price (1 GWEI)
      confirmations: 4, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 800, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: false, // Skip dry run before migrations? (default: false for public nets )
    },
    ropsten: {
      provider: () => {
        var provider = new HDWalletProvider(
          mnemonic,
          `https://eth-ropsten.alchemyapi.io/v2/IdtcL55fpQ3W2womIMsWYXyf_rXPaqg0`,
          0
        );
        var nonceTracker = new NonceTrackerSubprovider();
        provider.engine._providers.unshift(nonceTracker);
        nonceTracker.setEngine(provider.engine);
        return provider;
      },
      network_id: 3, // Ropsten's id
      gas: 8000000, // Ropsten has a lower block limit than mainnet
      gasPrice: 200000000000, // gas price (1 GWEI)
      confirmations: 4, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    kovan: {
      // provider: () => new HDWalletProvider(mnemonic, `https://kovan.infura.io/v3/c10098b98115472b86c1810b97a60a5f`, 0),
      provider: () => {
        var provider = new HDWalletProvider(
          mnemonic,
          `https://kovan.infura.io/v3/c10098b98115472b86c1810b97a60a5f`,
          0
        );
        var nonceTracker = new NonceTrackerSubprovider();
        provider.engine._providers.unshift(nonceTracker);
        nonceTracker.setEngine(provider.engine);
        return provider;
      },
      network_id: 42, // Kovan's id
      gas: 20000000, // Taken from kovan etherscan
      gasPrice: 200000000000,
      confirmations: 3, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    rinkeby: {
      // provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/4bdd2bc45a5743a99ddc0d3587c6a800`, 1),
      provider: () =>
        new HDWalletProvider({
          mnemonic,
          providerOrUrl:
            "wss://eth-rinkeby.ws.alchemyapi.io/v2/IdtcL55fpQ3W2womIMsWYXyf_rXPaqg0",
          chainId: 3,
        }),
      websocket: true,
      network_id: 4, // Rinkeby's id
      gas: 10000000, // Taken from stats.rinkeby.io
      gasPrice: 50000000000, // Taken from stats.rinkeby.io
      confirmations: 3, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    matic: {
      // provider: () => new HDWalletProvider(maticMnemonic, `https://polygon-mumbai.infura.io/v3/c10098b98115472b86c1810b97a60a5f`, 0),
      // provider: () => new HDWalletProvider(maticMnemonic, `https://rpc-mumbai.maticvigil.com`),
      provider: () =>
        new HDWalletProvider(mnemonic, `https://rpc-mumbai.matic.today`),
      network_id: 80001,
      confirmations: 3,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    // Useful for private networks
    // private: {
    // provider: () => new HDWalletProvider(mnemonic, `https://network.io`),
    // network_id: 2111,   // This network is yours, in the cloud.
    // production: true    // Treats this network as if it was a public net. (default: false)
    // }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.6", // Fetch exact version from solc-bin (default: truffle's version)
      parser: "solcjs",
      docker: false, // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 500,
        },
        evmVersion: "istanbul",
      },
    },
  },

  // Truffle DB is currently disabled by default; to enable it, change enabled: false to enabled: true
  //
  // Note: if you migrated your contracts prior to enabling this field in your Truffle project and want
  // those previously migrated contracts available in the .db directory, you will need to run the following:
  // $ truffle migrate --reset --compile-all

  db: {
    enabled: false,
  },
};
