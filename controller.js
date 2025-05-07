const axios = require('axios');

const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const { CardFactory } = require('botbuilder');
const TicketService = require('./services/TicketService');

async function sendTeamsReply(parentMessageId, ticket, from) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });
    const activity = createTicketCard(ticket, true);
    if(parentMessageId != null){
        try {
            const response = await connectorClient.conversations.sendToConversation(parentMessageId,activity);
            console.log(`Message sent successfully with conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error sending message:', error.response?.data || error.message);
        }
    }
    else { 
        const conversationParams = {
            isGroup: false,
            bot: { id: appId },
            members: [{ id : from }],
            activity: {
                type: 'message',
                text: 'created'
            },
            tenantId: process.env.MicrosoftAppTenantId,
            channelData: {}
        };
        try {
            const response = await connectorClient.conversations.createConversation(conversationParams);
            console.log(`New chat started with conversation ID: ${response.id}`);
    
            await connectorClient.conversations.sendToConversation(response.id, activity);
            console.log(`Message sent successfully to conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error creating conversation:', error.response?.data || error.message);
        }
    }
}

async function sendMessageToChannel(channelId, ticketId) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;
    const tenantId = process.env.MicrosoftAppTenantId;
    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    const activity = await buildTechnicianTicketCard(ticketId);
    const conversationParams = {
        isGroup: true,
        channelData: {
            channel: {
                id: channelId
            }
        },
        activity: activity,
        bot: {
            id: appId
        },
        tenantId : tenantId
    };
    try {
        const response = await connectorClient.conversations.createConversation(conversationParams);
        console.log(`Message sent to Teams channel. Conversation ID: ${response.id}`);
        console.log("Channel response: ", JSON.stringify(response));
        return { conversationId: response.id, activityId: response.activityId };
    } catch (error) {
        console.error('Error sending message to Teams channel:', error.response?.data || error.message);
    }
    
}
async function buildRequesterTicketCard(ticketId) {
        const ticket = (await axios.get(`${process.env.BackEndBaseUrl}/tickets/${ticketId}`)).data;
        return {
            type: "message",
            attachments: [
                {
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                        version: "1.5",
                        body: [
                            {
                                type: "TextBlock",
                                text: "🎫 Ticket Created",
                                weight: "Bolder",
                                size: "Large",
                                color: "Accent"
                            },
                            {
                                type: "FactSet",
                                facts: [
                                    { title: "Ticket ID:", value: ticket.id},
                                    { title: "Status:", value: ticket.status },
                                    { title: "Subject:", value: ticket.subject },
                                    { title: "Priority:", value: ticket.priority },
                                    { title: "Created By:", value: ticket.email },
                                    { title: "Technician:", value: ticket.technician }
                                ]
                            }
                        ],
                        actions: [
                            {
                                type: "Action.Submit",
                                title: "✏️ Update Ticket",
                                data: {
                                    msteams: {
                                        type: "task/fetch"
                                    },
                                    action: "updateTicket",
                                    ticketId: ticket.id,
                                    data: "updateTicket"
                                }
                            }
                        ]
                    }
                }
            ]
        };
    }

async function requesterCreateTicketCard(ticketId, context) {
    console.log("Ticket ID inside createTicketCard: ", ticketId);
    const ticketCard = buildRequesterTicketCard(ticketId);
    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    type: "AdaptiveCard",
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    version: "1.5",
                    body: [
                        {
                            type: "TextBlock",
                            text: "🎫 Ticket Created",
                            weight: "Bolder",
                            size: "Large",
                            color: "Accent"
                        },
                        {
                            type: "FactSet",
                            facts: [
                                { title: "Ticket ID:", value: String(ticketId) },
                                { title: "Subject:", value: "Sample title" || "N/A" },
                                { title: "Message:", value: context.activity.text || "N/A" },
                                { title: "From:", value: context.activity.from.name || "N/A" }
                            ]
                        }
                    ],
                    actions: [
                        {
                            type: "Action.Submit",
                            title: "✏️ Update Ticket",
                            data: {
                              msteams: {
                                type: "task/fetch"
                              },
                              action: "updateTicket",
                              ticketId: ticketId,
                              data: 'updateTicket'
                            }
                        }
                    ]
                }
            }
        ]
    };
}

async function buildTechnicianTicketCard(ticketId, context) {
    console.log("Ticket ID inside createTicketCard: ", ticketId);
    const ticket = (await axios.get(`${process.env.BackEndBaseUrl}/tickets/${ticketId}`)).data;
    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.5",
            body: [
              {
                type: "TextBlock",
                text: "🎫 Ticket Created",
                weight: "Bolder",
                size: "Large",
                color: "Accent"
              },
              {
                type: "FactSet",
                facts: [
                    { title: "Ticket ID:", value: ticket.id},
                    { title: "Status:", value: ticket.status },
                    { title: "Subject:", value: ticket.subject },
                    { title: "Priority:", value: ticket.priority },
                    { title: "Created By:", value: ticket.email },
                    { title: "Technician:", value: ticket.technician }
                ]
              }
            ],
            actions: [
                    {
                      type: "Action.Execute",
                      title: "Initiate conversation",
                      verb: "createGroup",
                      data: {
                        ticketId: ticketId
                      }
                    },
              {
                type: "Action.Submit",
                title: "✏️ Update Ticket",
                data: {
                  msteams: {
                    type: "task/fetch"
                  },
                  action: "updateTicket",
                  ticketId: ticketId,
                  data: 'adaptiveCard'
                }
              },
              {
                type: "Action.Submit",
                title: "✏️ Assign Technician",
                data: {
                  msteams: {
                    type: "task/fetch"
                  },
                  action: "techAssign",
                  ticketId: ticketId,
                  data: 'techAssign'
                }
              },
              {
                type: "Action.Submit",
                title: "✏️ Add Note",
                data: {
                  msteams: {
                    type: "task/fetch"
                  },
                  action: "addNote",
                  ticketId: ticketId,
                  data: 'addNote'
                }
              }
            ]
          }
        }
      ]
    };
  }

async function sendTicketReply(parentMessageId, ticketId, replyMessage, repliedBy) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    const activity = {
        type: 'message',
        attachments: [
            CardFactory.adaptiveCard({
                type: 'AdaptiveCard',
                version: '1.3',
                body: [
                    {
                        type: 'TextBlock',
                        text: `Ticket ID: ${ticketId}`,
                        weight: 'bolder',
                        size: 'medium'
                    },
                    {
                        type: 'TextBlock',
                        text: `Replied By: ${repliedBy}`,
                        wrap: true
                    },
                    {
                        type: 'TextBlock',
                        text: `Message: ${replyMessage}`,
                        wrap: true
                    }
                ],
                actions: [
                    {
                        type: 'Action.Submit',
                        title: 'Reply',
                        data: {
                            msteams: { type: 'task/fetch' },
                            data: 'replyTicket',
                            ticketId: ticketId
                        }
                    }
                ]
            })
        ]
    };

    if (parentMessageId) {
        try {
            console.log("Inside parentMessageId");
            const response = await connectorClient.conversations.sendToConversation(parentMessageId, activity);
            console.log(`Message sent successfully with conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error sending message:', error.response?.data || error.message);
        }
    } else {
        console.log("Not Inside parentMessageId");
        const conversationParams = {
            isGroup: false,
            tenantId: process.env.MicrosoftAppTenantId,
            botId: appId,
            members: [
                {
                    id: "29:1IPCeyBzb_nqOVoCZPCbG1gJsO5F8Y7DEef_NL8fEGFxAVKtadZ8cwemYFYm5g2GrD7EBcJGZ-nd10-i5_pR4cA"
                }
            ],
        };
    
        try {
            // First create the conversation
            const conversationResponse = await connectorClient.conversations.createConversation(conversationParams);
            console.log(`New chat started with conversation ID: ${conversationResponse.id}`);
            
            // Then send your message to the newly created conversation
            const messageResponse = await connectorClient.conversations.sendToConversation(
                conversationResponse.id, 
                activity
            );
            
            console.log(`Message sent successfully to conversation ID: ${conversationResponse.id}`);
        } catch (error) {
            console.error('Error creating conversation:', error);
            // Log the entire error object for debugging
            console.log('Full error object:', JSON.stringify(error, null, 2));
        }
    }
}

async function initiateConversation( requesterEmail , technicianEmail , ticketId){

        const requesterId = await TicketService.findTeamsObjectIdByEmail(requesterEmail);
        const technicianId = await TicketService.findTeamsObjectIdByEmail(technicianEmail);
        const members = [
            {
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            "roles": ["owner"],
            "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${requesterId}`
            },
            {
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            "roles": ["owner"],
            "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${technicianId}`
            }
        ];
        
        const chatResponse = await axios.post(
            "https://graph.microsoft.com/v1.0/chats",
            { chatType: "group", members },
            {
            headers: {
                Authorization: `Bearer ${process.env.AccessToken}`,
                'Content-Type': 'application/json'
            }
            }
        );
        
        const chatId = chatResponse.data.id;
        
        const botPayload = {
            "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/d23b825d-56b0-4513-8bf5-ca30cf290056",
            "consentedPermissionSet": {
            "resourceSpecificPermissions": [
                {
                "permissionValue": "ChatMessage.Read.Chat",
                "permissionType": "Application"
                }
            ]
            }
        };
        console.log("Before installing bot");
        await axios.post(
            `https://graph.microsoft.com/v1.0/chats/${chatId}/installedApps`,
            botPayload,
            {
            headers: {
                Authorization: `Bearer ${process.env.AccessToken}`,
                'Content-Type': 'application/json'
            }
            }
        );

        await TicketService.updateTicket(ticketId, {
            privateChannelConversationId: chatId
        });
    }

module.exports = { sendTeamsReply , sendMessageToChannel, sendTicketReply, requesterCreateTicketCard, buildRequesterTicketCard, buildTechnicianTicketCard , initiateConversation};