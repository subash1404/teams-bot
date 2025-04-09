const axios = require('axios');

const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');

async function sendTeamsReply(parentMessageId, ticket) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });
    const activity = createTicketCard(ticket);
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
            members: [{ id: '29:1DeZEjrwRfTSF7NXheBylxpcLCRWgqaV_MVLjDaQQR0g9BvMM-giz6t8tnfTIKtK-ZgP_dJRKhenuNW9fshZBSA' }],
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

async function sendTeamsChannelMessage(TeamId, channelId, ticket) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;
    const tenantId = process.env.MicrosoftAppTenantId;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    const activity = createTicketCard(ticket);

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
    } catch (error) {
        console.error('Error sending message to Teams channel:', error.response?.data || error.message);
    }
}

function createTicketCard(ticket) {
    console.log(ticket)
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
                                { title: "Ticket ID:", value: ticket.id },
                                { title: "Subject:", value: ticket.title || "N/A"},
                                { title: "Message:", value: ticket.body || "N/A" },
                                { title: "From:", value: ticket.name || "N/A" }
                            ]
                        }
                    ]
                }
            }
        ]
    };
}

module.exports = { sendTeamsReply , sendTeamsChannelMessage };