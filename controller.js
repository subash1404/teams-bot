const axios = require('axios');

const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const { CardFactory } = require('botbuilder');

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

async function sendTeamsChannelMessage(channelId, ticketId, context) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;
    const tenantId = process.env.MicrosoftAppTenantId;
    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    const activity = await technicianCreateTicketCard(ticketId, context);
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
        return response.id;
    } catch (error) {
        console.error('Error sending message to Teams channel:', error.response?.data || error.message);
    }
    
}

async function requesterCreateTicketCard(ticketId, context) {
    console.log("Ticket ID inside createTicketCard: ", ticketId);
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

async function technicianCreateTicketCard(ticketId, context) {
    console.log("Ticket ID inside createTicketCard: ", ticketId);
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

module.exports = { sendTeamsReply , sendTeamsChannelMessage, sendTicketReply, requesterCreateTicketCard };