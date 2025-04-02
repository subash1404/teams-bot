
const { ActivityHandler, MessageFactory, ConsoleTranscriptLogger } = require('botbuilder');
const { Ticket } = require('./models');

class EchoBot extends ActivityHandler {
    constructor() {
        super();
        const { MessageFactory, CardFactory } = require('botbuilder');
        const TicketService = require('./services/TicketService');

        this.onMessage(async (context, next) => {
            console.log('id = ' , context.activity.from.id)
            if(context.activity.conversation.conversationType === 'channel'){
                if (context.activity.value && context.activity.value.action === 'submit_update') {
                    const { status, technician, ticketId } = context.activity.value;
            
                    const updateDetails = `✅ **Ticket #${ticketId} Updated Successfully**\n\n` +
                                        `📌 **Status:** ${status}\n` +
                                        `👨‍🔧 **Technician:** ${technician || 'Not Assigned'}`;
                    
                    await context.sendActivity(updateDetails);
                }
                else if (context.activity.value && context.activity.value.action === 'view_ticket') {
            
                    const ticketDetails = await isReplyMessage(context.activity.conversation.id);

                    const detailsMessage = `📄 **Ticket Details**\n\n` +
                                        `🆔 **ID:** ${ticketDetails.id}\n` +
                                        `📋 **Description:** ${ticketDetails.body}\n` +
                                        `📌 **Status:** ${"in progress"}\n` +
                                        `👨‍🔧 **Technician:** ${"subash" || 'Not Assigned'}\n` +
                                        `🕒 **Created At:** ${ticketDetails.createdAt}`;
            
                    await context.sendActivity(detailsMessage);
                }
                else if (await isReplyMessage(context.activity.conversation.id)==null) {
                    const ticketId = '12345'; 
                    const description = context.activity.text || 'No description provided.';
                    const messageId = context.activity.id; 
            
                    await TicketService.saveTicket({
                        name: context.activity.from.name,
                        messageId,
                        body: description,
                        conversationId: context.activity.conversation.id
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
                            {
                                "type": "Action.ShowCard",
                                "title": "Update Ticket",
                                "card": {
                                    "type": "AdaptiveCard",
                                    "body": [
                                        {
                                            "type": "Input.ChoiceSet",
                                            "id": "status",
                                            "label": "Status",
                                            "isRequired": true,
                                            "choices": [
                                                { "title": "Open", "value": "open" },
                                                { "title": "In Progress", "value": "in_progress" },
                                                { "title": "Closed", "value": "closed" }
                                            ]
                                        },
                                        {
                                            "type": "Input.Text",
                                            "id": "technician",
                                            "label": "Assign Technician",
                                            "placeholder": "Enter technician name"
                                        }
                                    ],
                                    "actions": [
                                        {
                                            "type": "Action.Submit",
                                            "title": "Submit",
                                            "data": {
                                                "action": "submit_update",
                                                "ticketId": ticketId
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "type": "Action.Submit",
                                "title": "View Ticket",
                                "data": {
                                    "action": "view_ticket",
                                    "ticketId": ticketId
                                }
                            }
                        ]
                    };                                
            
                    await context.sendActivity({
                        attachments: [CardFactory.adaptiveCard(adaptiveCard)]
                    });
                }
            
                await next();
            }
            else{
                await context.sendActivity('send the message in a channel')
            }
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
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
                return ticket
            } else {
                console.log("Message ID not found in thread id.");
                return null;
            }
        }
    }
}

module.exports.EchoBot = EchoBot;
