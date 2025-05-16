// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const dotenv = require('dotenv');
const { adapter, onTurnErrorHandler } = require('./adapter');
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });
const restify = require('restify');
const { TicketBot } = require('./bot');
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
const ticketRoutes = require('./route/TicketRoutes');

const { sequelize } = require('./config/db');
sequelize.sync({ alter: true })
  .then(() => console.log('✅ Ticket table synced'))
  .catch(console.error);

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

adapter.onTurnError = onTurnErrorHandler;

const myBot = new TicketBot();
ticketRoutes.applyRoutes(server);

server.on('upgrade', async (req, socket, head) => {
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    streamingAdapter.onTurnError = onTurnErrorHandler;

    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
});
