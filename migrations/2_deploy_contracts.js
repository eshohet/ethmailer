var Mail = artifacts.require("./Mail.sol");

module.exports = function(deployer) {
  deployer.deploy(Mail);
};
