
const dotenv = require("dotenv");
dotenv.config();

// Insert truncateEthAddress from gpxl
// Captures 0x + 4 characters, then the last 4 characters.
const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;

/**
 * Truncates an ethereum address to the format 0x0000…0000
 * @param address Full address to truncate
 * @returns Truncated address
 */
const truncateEthAddress = function(address) {
  const match = address.match(truncateRegex);
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};


const Discord = require("discord.js");
const client = new Discord.Client;

const ethers = require("ethers");
const utils = require("ethers").utils;
const LightContract = require("@airswap/light/build/contracts/Light.json");

const provider = ethers.getDefaultProvider("homestead", {
    infura: process.env['INFURA_PROJECT_ID'],
});

// make an object to hold all the timeouts
const makerTimeouts = {};

// make an object to hold last trade timestamps
const makerLastTrade = {};

// make an object to check if maker has been pinged before
const makerPinged = {};

// create a webserver to keep the bot alive
const keepAlive = require('./keepAlive.js');

// set timeout in minutes
var timeout = 60 * 4;

// set maker expiry in minutes
var expiry = 60 * 12;

// set up client
client.once('ready', () => {
	console.log('Ready!');
  channel = client.channels.cache.get(process.env['DISCORD_CHANNEL_ID']);
  console.log("listening on " + channel.name);
});

// client login
client.login(process.env['DISCORD_BOT_TOKEN']);

// define light contract
const lightContract = new ethers.Contract(
    "0xc549a5c701cb6e6cbc091007a80c089c49595468",
    LightContract.abi,
    provider
);

// create a function to be called when timeout
function onTimeout(signerWallet) {

  // calculate time since last trade in minutes
  var timeSinceLastTrade = (Date.now() - makerLastTrade[signerWallet]) / 1000 / 60

  // message discord
  console.log(truncateEthAddress(signerWallet) + " has not had a trade in the last " + Math.round(timeSinceLastTrade) + " minutes.");
  channel.send(truncateEthAddress(signerWallet) + " has not had a trade in the last " + Math.round(timeSinceLastTrade) + " minutes.");

  // set makerPinged to true
  makerPinged[signerWallet] = true;

  // check if maker timeout has expired
  if (timeSinceLastTrade < expiry) {
    // if not expired, reset timer
    makerTimeouts[signerWallet] = setTimeout( function() { onTimeout(signerWallet) },timeout * 60 * 1000);
  } else { // else expires and inform channel
    channel.send("Maker expired: " + truncateEthAddress(signerWallet) + " has been inactive for more than " + expiry + " minutes")
  }
}

// listen for swaps:
lightContract.on('Swap', function (nonce, timestamp, signerWallet) {

  // set last trade to now
  makerLastTrade[signerWallet] = Date.now();

  // check if maker has been pinged before
  if (makerPinged[signerWallet]) {
    channel.send(":tada: " + truncateEthAddress(signerWallet) + " has resumed swaps");

    //reset makerPinged
    makerPinged[signerWallet] = false;
  }

    // check if there's an existing timeout:
    if (makerTimeouts[signerWallet]) {
      // clear it if there is
      clearTimeout(makerTimeouts[signerWallet]);
    }
    // in all cases, set a new timeout
    makerTimeouts[signerWallet] = setTimeout( function() { onTimeout(signerWallet) }, timeout * 60 * 1000);
  });


// makerbot commands
client.on('message', message => {
  prefix = '!mmbot'
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

  if (command === 'ping') {
    message.channel.send("Pong.");
  } else if (command === 'timeout') {
    if (!args.length) {
      message.channel.send("Timeout is currently " + timeout + " minutes")
    } else if (args.length === 1 && !isNaN(args)){
      if (message.member.hasPermission("ADMINISTRATOR")){
        timeout = args;
        message.channel.send("Updated timeout to " + args + " minutes");
      } else {
        message.channel.send("Only admins can change the timeout")
      }
    } else {
      message.channel.send("Please input a valid number in minutes")
    }
    
  } else if (command === 'expiry') {
    if (!args.length) {
      message.channel.send("Expiry is currently " + expiry + " minutes")
    } else if (args.length === 1 && !isNaN(args)){
      if (message.member.hasPermission("ADMINISTRATOR")) {
        expiry = args;
        message.channel.send("Updated expiry to " + args + " minutes");
      } else {
        message.channel.send("Only admins can change the expiry")
      }
    } else {
      message.channel.send("Please input a valid number in minutes")
    }
  } else {
    message.channel.send(`
AirSwap Maker Monitor Bot is currently monitoring swaps
It will message the discord every ${timeout} minutes of inactivity for each maker address
It will stop messaging the discord if a maker has gone offline for more than ${expiry} minutes

Valid commands:
!mmbot ping - pings the bot
!mmbot timeout <timeout> - sets the threshold to message the discord if a maker has been inactive for <timeout> minutes
!mmbot expiry <expiry> - sets the threshold to stop messaging the discord if a maker has been inactive for more than <expiry> minutes
      `);
  }
});

