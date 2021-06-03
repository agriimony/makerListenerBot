
const dotenv = require("dotenv");
dotenv.config();

const Discord = require("discord.js");
const client = new Discord.Client;

const ethers = require("ethers");
const utils = require("ethers").utils;
const LightContract = require("@airswap/light/build/contracts/Light.json");

const provider = ethers.getDefaultProvider("homestead", {
    infura: process.env.INFURA_PROJECT_ID,
});

// make an object to hold all the timeouts
const makerTimeouts = {};

// make an object to hold last trade timestamps
const makerLastTrade = {};

// set timeout in minutes
var timeout = 1/6;

// set maker expiry in minutes
var expiry = 1;

// set up client
client.once('ready', () => {
	console.log('Ready!');
  channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
});

// client login
client.login(process.env.DISCORD_BOT_TOKEN);

// define light contract
const lightContract = new ethers.Contract(
    "0xc549a5c701cb6e6cbc091007a80c089c49595468",
    LightContract.abi,
    provider
);

// create a function to be called when timeout
function onTimeout(signerWallet) {
  // message discord
  console.log(signerWallet + " has not had a trade in the last " + Math.round(timeout) + " minutes.");
  channel.send(signerWallet + " has not had a trade in the last " + Math.round(timeout) + " minutes.");

  // check if maker timeout has expired
  if (Date.now() - makerLastTrade[signerWallet] < expiry * 60 * 1000) {
    // if not expired, reset timer
     makerTimeouts[signerWallet] = setTimeout( function() { onTimeout(signerWallet) }, timeout * 60 * 1000);
  };
};

// makerbot response
client.on('message', message => {
  if (message.content === '!makerbot ping') {
    message.channel.send('Pong.');
  }
});

// listen for swaps:
lightContract.on('Swap', function (nonce, timestamp, signerWallet) {

  makerLastTrade[signerWallet] = timestamp;

    // check if there's an existing timeout:
    if (makerTimeouts[signerWallet]) {
      // clear it if there is
      clearTimeout(makerTimeouts[signerWallet]);
    }
    // in all cases, set a new timeout
    makerTimeouts[signerWallet] = setTimeout( function() { onTimeout(signerWallet) }, timeout * 60 * 1000);
  });
