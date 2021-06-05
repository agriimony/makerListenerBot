# makerListenerBot
Listens for Maker trades on AirSwap and pings discord in the event where no trades have been emitted for a period of time

AirSwap Maker Monitor Bot
It will message the discord every ${timeout} minutes of inactivity for each maker address
It will stop messaging the discord if a maker has gone offline for more than ${expiry} minutes

Valid commands:
!mmbot ping - pings the bot
!mmbot timeout <timeout> - sets the threshold to message the discord if a maker has been inactive for <timeout> minutes
!mmbot expiry <expiry> - sets the threshold to stop messaging the discord if a maker has been inactive for more than <expiry> minutes

# How to
Fork this on repl.it (https://replit.com/@agrimony/makerListenerBot)
Add the following secrets:
INFURA_PROJECT_ID (Create an account on infura to get this)
DICORD_CHANNEL_ID (id of the discord channel to post to)
DISCORD_BOT_TOKEN (token of your discord bot)
