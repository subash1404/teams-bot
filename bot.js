// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory, ConsoleTranscriptLogger } = require('botbuilder');
const { Ticket } = require('./models');

class EchoBot extends ActivityHandler {
    constructor() {
        super();
        const { MessageFactory, CardFactory } = require('botbuilder');
        const TicketService = require('./services/TicketService');

        this.onMessage(async (context, next) => {
            if (!(await isReplyMessage(context.activity.conversation.id))) {
                const ticketId = '12345'; 
                const description = context.activity.text || 'No description provided.';
                const messageId = context.activity.id; 
        
                await TicketService.saveTicket({
                    name: context.activity.from.name,
                    messageId,
                    body: description
                });
        
                const adaptiveCard = {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.5",
                    "body": [
                        { "type": "TextBlock", "size": "Medium", "weight": "Bolder", "text": "🎫 Ticket Created Successfully!" },
                        { "type": "TextBlock", "text": `**Description:** ${description}`, "wrap": true }
                    ],
                    "actions": [
                        { "type": "Action.Submit", "title": "Update Ticket", "data": { "action": "update_ticket", "ticketId": ticketId } },
                        { "type": "Action.Submit", "title": "View Ticket", "data": { "action": "view_ticket", "ticketId": ticketId } }
                    ]
                };
        
                await context.sendActivity({
                    attachments: [CardFactory.adaptiveCard(adaptiveCard)]
                });
            }
        
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        async function isReplyMessage(id) {
            const pattern = /messageid=([0-9]+)/;
            const match = id.match(pattern);
        
            if (match) {
                const messageId = match[1];
        
                const ticket = await Ticket.findOne({
                    where: { messageId: messageId }
                });
                console.log("Ticket: "+ ticket)
                console.log(!!ticket)
                return !!ticket;
            } else {
                console.log("Message ID not found in thread id.");
                return false;
            }
        }
    }
}

module.exports.EchoBot = EchoBot;
