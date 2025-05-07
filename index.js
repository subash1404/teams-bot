// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const dotenv = require('dotenv');
const TicketService = require('./services/TicketService');
const {initiateConversation} = require('./controller');
// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const {
    CloudAdapter,
    ConfigurationBotFrameworkAuthentication
} = require('botbuilder');

// This bot's main dialog.
const { EchoBot } = require('./bot');

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights. See https://aka.ms/bottelemetry for telemetry
    //       configuration instructions.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Set the onTurnError for the singleton CloudAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create the main dialog.
const myBot = new EchoBot();
const { sendTeamsReply, sendTicketReply } = require('./controller');

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => myBot.run(context));
});

server.post('/api/sendReply', async (req, res) => {
    const { ticketId, message, email } = req.body;
    console.log("TicketId: ", ticketId);
    console.log("Message: ", message);
    console.log("Email: ", email);
    try {
        const ticket = await TicketService.findByTicketId(ticketId);
        console.log("Ticket: "+ JSON.stringify(ticket));
        await sendTicketReply(ticket.requestChannelConversationId, ticketId, message, email);
        console.log("techChannelConversationId: ", ticket.techChannelConversationId);
        await sendTicketReply(ticket.techChannelConversationId, ticketId, message, email);
        res.send(200, { success: true, message: 'Reply sent successfully!' });
    } catch (error) {
        console.error(' Error sending reply:', error.message);
        res.send(500, { error: 'Failed to send reply.', details: error.message });
    }
});

server.post('/api/updateTicket', async (req, res) => {
    const { ticketId, subject, email } = req.body;
    try {
        console.log("Subject: ", subject);
        const ticket = await TicketService.findById(ticketId);
        ticket.body = subject || ticket.subject;
        const technician = await TicketService.findTechnicianByemail(email);
        ticket.technicianId = technician.id;
        await ticket.save();
        await technician.save()
        res.send(200, { success: true, message: 'Ticket updated successfully!' });
    } catch (error) {
        console.error('❌ Error sending reply:', error.message);
        res.send(500, { error: 'Failed to send reply.', details: error.message });
    }
});

server.post('/initiate-conversation' , async (req , res) => {
    const {technicianEmail , requesterEmail , ticketId} = req.body;

    try{
        await initiateConversation(requesterEmail , technicianEmail , ticketId);
        res.send(200, { success: true, message: 'Group chat created' });
    }

    catch{
        res.send(500, { error: 'Failed to create chat.', details: error.message });
    }
    
})

server.post('/webhook/reply', async (req, res) => {
    try {
        const { ticketId, replyMessage, repliedBy} = req.body;
        await sendTicketReply(null, ticketId, replyMessage, repliedBy)
        res.send(200, { success: true, message: 'Ticketreply sent successfully!' });
    }
    catch (error) {
        console.error('❌ Error sending Ticketreply:', error.message);
        res.send(500, { error: 'Failed to send Ticketreply.', details: error.message });
    }
  });  

// Listen for Upgrade requests for Streaming.
server.on('upgrade', async (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    // Set onTurnError for the CloudAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;

    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
});
