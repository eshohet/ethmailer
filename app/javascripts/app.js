// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css';
import * as $ from 'jquery';
// Import libraries we need.
import {default as Web3} from 'web3';
import {default as contract} from 'truffle-contract';
import {default as crypto} from 'crypto';
import {default as eccrypto} from 'eccrypto';
import {default as WebTorrent} from 'webtorrent';

// Import our contract artifacts and turn them into usable abstractions.
import mail_artifacts from '../../build/contracts/Mail.json';

// import swal from 'sweetalert2';

// require('sweetalert2/dist/sweetalert2.min.css');

// MetaCoin is our usable abstraction, which we'll use through the code below.
let Mail = contract(mail_artifacts);
let client = new WebTorrent();

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
		App.autoSeed();
	},

	getPublicKey: async () => {
		web3.eth.getAccounts(async (err, accounts) => {
			const account = accounts[0];
			const mail = await Mail.deployed();
			const pubKey = await mail.getPub.call(account, {from: account});
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
		const privateKey = crypto.randomBytes(32);
		const publicKey = eccrypto.getPublic(privateKey);
		window.localStorage.setItem('private', privateKey);
		App.registerPubKey(Buffer.from(publicKey).toString('hex'));
	},

	getMail: async () => {
		web3.eth.getAccounts(async (err, accounts) => {
			const mail = await Mail.deployed();
			allEvents(accounts[0], mail.Mail, (err, email) => {
				const magnet = email.args.hash;
				console.log(magnet);
				client.add(magnet, function (torrent) {
					// Torrents can contain many files. Let's use the .mp4 file
					console.log(torrent);
					// Render all files into to the page
					torrent.files.forEach(function (file) {
						file.renderTo('#files');
					})

				})
			});
		});
	},

	sendMail: async(to, message) => {
		web3.eth.getAccounts(async (err, accounts) => {
			const client = new WebTorrent();
			client.seed(new Buffer(message), async (torrent) => {
				const mail = await Mail.deployed();
				const pubKey = await mail.getPub.call(to, {from: accounts[0]});
				mail.sendMail(to, torrent.magnetURI, {from: accounts[0]});
			});
		});
	},

	autoSeed: async () => {

	},

	encrypt: async function (msg, publicKey) {
		//encrypts photo
		return eccrypto.encrypt(publicKey, new Buffer(msg));
	},
	decrypt: function (msg, privateKey) {
		//decrypts photo
		return eccrypto.decrypt(privateKey, msg);
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
