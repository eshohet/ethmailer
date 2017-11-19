// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css'
import * as $ from 'jquery'
// Import libraries we need.
import { default as Web3 } from 'web3'
import { default as contract } from 'truffle-contract'
import { default as ipfs } from 'ipfs-js'
import { default as NodeRSA } from 'node-rsa'

// Import our contract artifacts and turn them into usable abstractions.
import mail_artifacts from './../Mail.json'

import swal from 'sweetalert2'

require('sweetalert2/dist/sweetalert2.min.css')

// MetaCoin is our usable abstraction, which we'll use through the code below.
let Mail = contract(mail_artifacts)
let messages = {}

function allEvents (_to, ev, cb) {
  ev({ to: _to }, { fromBlock: '0', toBlock: 'pending' }).get((error, results) => {
    if (error) return cb(error)
    results.forEach(result => cb(null, result))
    ev().watch(cb)
  })
}

window.App = {

  start: async () => {
    Mail.setProvider(web3.currentProvider)
    let mail
    let isConnected = true
    try {
      mail = await Mail.deployed();
    }
    catch (e) {
      swal('Incorrect Network', 'Please connect to the rinkeby network to continue', 'error')
      isConnected = false
    }

    if (isConnected) {
      App.getPublicKey()
    }
  },

  getPublicKey: async () => {
    web3.eth.getAccounts(async (err, accounts) => {
      const account = accounts[0]
      const mail = await Mail.deployed()
      const pubKey = await mail.getPub.call(account, { from: account })
      const priv = window.localStorage.getItem('private');
      if(priv === null || pubKey === '') {
        swal('Welcome!', 'Please click new key to generate a keypair locally, you may have lost your old one, or you may be a new user', 'info')
      }
      else {
        $('#navEthereumAddress').html(accounts[0])
        App.getMail();
      }
    })
  },
  registerPubKey: async (pubKey) => {
    web3.eth.getAccounts(async (err, accounts) => {
      const account = accounts[0]
      const mail = await Mail.deployed()
      await mail.updatePubRegistry(pubKey, { from: account })
      $('#public_key').html(pubKey)
      App.getMail()
    })
  },
  newUser: async () => {
    const key = new NodeRSA({ b: 512 })
    const priv = key.exportKey('pkcs1-private')
    const pub = key.exportKey('pkcs1-public')
    window.localStorage.setItem('private', priv)
    App.registerPubKey(pub)
  },

  view: async (address) => {
    $("#response_section").css('display', 'block');
    web3.eth.getAccounts(async (err, accounts) => {
      const mail = await Mail.deployed()
      $("#message_text").html('');
      mail.Mail({ to: accounts[0], from: address }, { fromBlock: '0', toBlock: 'pending' }).get((error, results) => {
        results.forEach((result) => {
          const hash = result.args.hash
          ipfs.setProvider({ host: '34.228.168.120', port: '5001' })
          ipfs.catText(hash, (err, data) => {
            if (data) {
              App.decrypt(data).then((decrypted) => {
                $("#message_address").html(address);
                $('#message_text').append(`<p>> ${decrypted}</p>`);
              });
            }
            if (err) {
              console.log(err)
            }
          })
        })
      })
    })

  },

  getMail: async () => {
    web3.eth.getAccounts(async (err, accounts) => {
      const mail = await Mail.deployed()
      allEvents(accounts[0], mail.Mail, (err, email) => {
        console.log(email.args.from);
        if ($('#inbox_' + email.args.from).length === 0) {
          $('#content-l').append(`
							<li id="inbox_${email.args.from}" onclick="App.view('${email.args.from}');" class="income-box-mail collection-item avatar new-mail bold">
									<a href="#!">
											<i class="material-icons circle green">face</i>
											<span class="income-box-sender title">${email.args.from}</span>
											<p class=" grey-text">
													<span id="message_${email.args.from}" class="income-box-text truncate">encrypted communication</span>
											</p>
									</a>
							</li>`)
        }
      })
    })
  },

  sendMail: async (to, message, ipfsHost) => {
    web3.eth.getAccounts(async (err, accounts) => {
      const mail = await Mail.deployed()
      const pubKey = await mail.getPub.call(to, { from: accounts[0] })
      ipfs.setProvider({ host: ipfsHost, port: '5001' })
      App.encrypt(message, pubKey).then((encrypted => {
        ipfs.add(encrypted, (err, hash) => {
          if (hash) {
            mail.sendMail(to, hash, { from: accounts[0] }).then((result) => {
              console.log(result);
            })
          }
          if (err) console.log(err)
        })
      }))
    })
  },

  encrypt:

    async function (msg, pubKey) {
      let key = new NodeRSA()
      key.importKey(pubKey, 'pkcs1-public')
      return await key.encrypt(msg, 'base64')
    }

  ,
  decrypt: async function (msg) {
    let key = new NodeRSA()
    const priv = window.localStorage.getItem('private')
    key.importKey(priv, 'pkcs1-private')
    let dec

    try {
      dec = await key.decrypt(msg, 'utf8')
    }
    catch (e) {
    }
    if (dec !== undefined)
      return dec
    else
      return 'unable to decrypt communication'
  },

  sendMsg: () => {
    App.sendMail($("#message_address")[0].html(), $("#response").val(), '34.228.168.120');
  },

  showInfo: function () {

  }

}

window.addEventListener('load', function () {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider)
    App.start()
  } else {
    swal('Metamask/Mist not detected', 'Please install either to continue', 'error')
  }

})
