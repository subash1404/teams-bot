const axios = require('axios');

const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');

async function sendTeamsReply(teamId, channelId, parentMessageId, message) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });
    if(parentMessageId != null){
        const activity = {
            type: 'message',
            text: message
        };
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
            activity: { type: 'message', text: message },
            tenantId: process.env.MicrosoftAppTenantId,
            channelData: {}
        };
    
        try {
            const response = await connectorClient.conversations.createConversation(conversationParams);
            console.log(`New chat started with conversation ID: ${response.id}`);

            const message = {
                type: 'message',
                text: 'This is a follow-up message after creating the conversation.'
            };
    
            await connectorClient.conversations.sendToConversation(response.id, message);
            console.log(`Message sent successfully to conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error creating conversation:', error.response?.data || error.message);
        }
    }
}

module.exports = { sendTeamsReply };