// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css';
import * as $ from 'jquery';
// Import libraries we need.
import {default as Web3} from 'web3';
import {default as contract} from 'truffle-contract';
import {default as ipfs} from 'ipfs-js';
import {default as NodeRSA} from 'node-rsa';


// Import our contract artifacts and turn them into usable abstractions.
import mail_artifacts from '../../build/contracts/Mail.json';

import swal from 'sweetalert2';

require('sweetalert2/dist/sweetalert2.min.css');

// MetaCoin is our usable abstraction, which we'll use through the code below.
let Mail = contract(mail_artifacts);

function allEvents(_to, ev, cb) {
	ev({to: _to}, {fromBlock: '0', toBlock: 'latest'}).get((error, results) => {
		if (error) return cb(error);
		results.forEach(result => cb(null, result));
		ev().watch(cb);
	});
}

window.App = {

	start: () => {
		Mail.setProvider(web3.currentProvider);
		App.getPublicKey();
	},

	getPublicKey: async () => {
		web3.eth.getAccounts(async (err, accounts) => {
			const account = accounts[0];
			const mail = await Mail.deployed();
			const pubKey = await mail.getPub.call(account, {from: account});
			if(pubKey === '') {
				swal('Welcome!', 'Please click new key to generate a keypair locally', 'info');
			}
			$('#public_key').html(pubKey);
			this.publicKey = pubKey;
			App.getMail();
		});
	},
	registerPubKey: async (pubKey) => {
		web3.eth.getAccounts(async (err, accounts) => {
			const account = accounts[0];
			const mail = await Mail.deployed();
			mail.updatePubRegistry(pubKey, {from: account});
		});
	},
	newUser: async() => {
    const key = new NodeRSA({b: 512});
    const priv = key.exportKey('pkcs1-private');
    const pub = key.exportKey('pkcs1-public');
    window.localStorage.setItem('private', priv);
    App.registerPubKey(pub);
	},

	getMail: async () => {
		web3.eth.getAccounts(async (err, accounts) => {
			const mail = await Mail.deployed();
			allEvents(accounts[0], mail.Mail, (err, email) => {
				const hash = email.args.hash;
        ipfs.setProvider({host: $('#ipfsHost').val(), port: '5001'});
        ipfs.catText(hash, (err, data) => {
        	if(data) {
        		App.decrypt(data).then((decrypted) => {
              $("#messages").append(`<tr><td> ${email.args.from}: ${decrypted} </td></tr>`);
            });
					}
				})
      });
		});
	},

	sendMail: async() => {
		web3.eth.getAccounts(async (err, accounts) => {
			const to = $('#to').val();
			const message = $('#message').val();
      const mail = await Mail.deployed();
      const pubKey = await mail.getPub.call(to, {from: accounts[0]});
      ipfs.setProvider({host: $('#ipfsHost').val(), port: '5001'});
      App.encrypt(message, pubKey).then((encrypted => {
        ipfs.add(encrypted, (err, hash) => {
          if(hash) {
            mail.sendMail(to, hash, {from: accounts[0]});
          }
        });
			}));
		});
	},

	encrypt: async function (msg, pubKey) {
    let key = new NodeRSA();
    key.importKey(pubKey, 'pkcs1-public');
    return await key.encrypt(msg, 'base64');
	},
	decrypt: async function (msg) {
    let key = new NodeRSA();
    const priv = window.localStorage.getItem('private');
    key.importKey(priv, 'pkcs1-private');
    return await key.decrypt(msg, 'utf8');
	},


};

window.addEventListener('load', function () {
	// Checking if Web3 has been injected by the browser (Mist/MetaMask)
	if (typeof web3 !== 'undefined') {
		// Use Mist/MetaMask's provider
		window.web3 = new Web3(web3.currentProvider);
	} else {
		console.warn('No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it\'s inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask');
		// fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
		window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:9545'));
	}

	App.start();
});
