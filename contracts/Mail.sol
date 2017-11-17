pragma solidity ^0.4.15;

contract Mail {

    mapping (address => string) public pubKeyRegistry;

    event Mail(address indexed to, address indexed from, string hash);

    function getPub(address receiver) public returns (string) {
        return pubKeyRegistry[receiver];
    }

    function updatePubRegistry(string pubKey) public {
        pubKeyRegistry[msg.sender] = pubKey;
    }

    function sendMail(address recipient, string hash) public {
        require(bytes(pubKeyRegistry[recipient]).length != 0);
        Mail(recipient, msg.sender, hash);
    }

}
