const HDWalletProvider = require("truffle-hdwallet-provider");

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
const _provider = new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/");
// console.log(_provider);

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: _provider,
      network_id: 4
    }
  }
};