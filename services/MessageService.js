const axios = require('axios');

const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const { CardFactory, UserState } = require('botbuilder');
const UserRepository = require('../repository/UserRepository');
const CardService = require('./CardService');

class MessageService {
    async sendToUser(conversationId, message, teamsUserId = null) {
        const appId = process.env.MicrosoftAppId;
        const appPassword = process.env.MicrosoftAppPassword;
        const tenantId = process.env.MicrosoftAppTenantId;

        const credentials = new MicrosoftAppCredentials(appId, appPassword);
        const connectorClient = new ConnectorClient(credentials, {
            baseUri: 'https://smba.trafficmanager.net/emea/'
        });

        if (conversationId) {
            console.log("Using existing conversation ID: " + conversationId);
            try {
                const response = await connectorClient.conversations.sendToConversation(conversationId, message);
                console.log(`✅ Message sent successfully with conversation ID: ${conversationId}`);
                return response;
            } catch (error) {
                console.error('Error sending message:', error.response?.data || error.message);
                throw error;
            }
        } else {
            if (!teamsUserId) {
                throw new Error("TeamsUserId is required to create a new conversation");
            }

            const conversationParams = {
                isGroup: false,
                bot: { id: appId },
                members: [{ id: teamsUserId }],
                channelData: {
                    tenant: { id: tenantId }
                }
            };

            try {
                const conversationResponse = await connectorClient.conversations.createConversation(conversationParams);
                console.log(`💬 New chat started with conversation ID: ${conversationResponse.id}`);

                const msgResponse = await connectorClient.conversations.sendToConversation(conversationResponse.id, message);
                console.log(`MessageResponse: `, JSON.stringify(msgResponse));
                console.log(`✅ Message sent successfully to conversation ID: ${conversationResponse.id}`);
                return msgResponse;
            } catch (error) {
                console.error('❌ Error creating conversation or sending message:', error.response?.data || error.message);
                throw error;
            }
        }
    }


    async sendToChannel(channelId, ticketId, attachments) {
        const appId = process.env.MicrosoftAppId;
        const appPassword = process.env.MicrosoftAppPassword;
        const tenantId = process.env.MicrosoftAppTenantId;
        const credentials = new MicrosoftAppCredentials(appId, appPassword);
        const connectorClient = new ConnectorClient(credentials, {
            baseUri: 'https://smba.trafficmanager.net/emea/'
        });

        const activity = await CardService.buildTechnicianTicketCard(ticketId, attachments);
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
            tenantId: tenantId
        };
        try {
            const response = await connectorClient.conversations.createConversation(conversationParams);
            console.log(`Message sent to Teams channel. Conversation ID: ${response.id}`);
            console.log("Channel response: ", JSON.stringify(response));
            // if (attachments && attachments.length > 0) {
            //     await sendAttachmentsToChannel(channelId, response.id, attachments);
            // }
            return { conversationId: response.id, activityId: response.activityId };
        } catch (error) {
            console.error('Error sending message to Teams channel:', error.response?.data || error.message);
        }

    }

    // async function requesterCreateTicketCard(ticketId, context) {
    //     console.log("Ticket ID inside createTicketCard: ", ticketId);
    //     const ticketCard = buildRequesterTicketCard(ticketId);
    //     return {
    //         type: "message",
    //         attachments: [
    //             {
    //                 contentType: "application/vnd.microsoft.card.adaptive",
    //                 content: {
    //                     type: "AdaptiveCard",
    //                     $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    //                     version: "1.5",
    //                     body: [
    //                         {
    //                             type: "TextBlock",
    //                             text: "🎫 Ticket Created",
    //                             weight: "Bolder",
    //                             size: "Large",
    //                             color: "Accent"
    //                         },
    //                         {
    //                             type: "FactSet",
    //                             facts: [
    //                                 { title: "Ticket ID:", value: String(ticketId) },
    //                                 { title: "Subject:", value: "Sample title" || "N/A" },
    //                                 { title: "Message:", value: context.activity.text || "N/A" },
    //                                 { title: "From:", value: context.activity.from.name || "N/A" }
    //                             ]
    //                         }
    //                     ],
    //                     actions: [
    //                         {
    //                             type: "Action.Submit",
    //                             title: "✏️ Update Ticket",
    //                             data: {
    //                                 msteams: {
    //                                     type: "task/fetch"
    //                                 },
    //                                 action: "updateTicket",
    //                                 ticketId: ticketId,
    //                                 data: 'updateTicket'
    //                             }
    //                         }
    //                     ]
    //                 }
    //             }
    //         ]
    //     };
    // }



    async sendAttachmentsToChannel(channelId, conversationId, attachments) {
        if (!attachments || attachments.length === 0) return;

        const appId = process.env.MicrosoftAppId;
        const appPassword = process.env.MicrosoftAppPassword;
        const credentials = new MicrosoftAppCredentials(appId, appPassword);
        const connectorClient = new ConnectorClient(credentials, {
            baseUri: 'https://smba.trafficmanager.net/emea/'
        });

        // For each attachment, send a separate message with just that file
        for (const attachment of attachments) {
            try {
                const fileActivity = {
                    type: 'message',
                    attachments: [
                        {
                            contentType: attachment.contentType,
                            name: attachment.name,
                            content: attachment.content  // Use the base64 content
                        }
                    ],
                    conversation: {
                        id: conversationId
                    }
                };

                await connectorClient.conversations.sendToConversation(conversationId, fileActivity);
                console.log(`File attachment ${attachment.name} sent successfully`);
            } catch (error) {
                console.error(`Error sending file attachment ${attachment.name}:`, error);
            }
        }
    }

    // async function sendTicketReply(parentMessageId, ticketId, replyMessage, repliedBy) {
    //     const appId = process.env.MicrosoftAppId;
    //     const appPassword = process.env.MicrosoftAppPassword;

    //     const credentials = new MicrosoftAppCredentials(appId, appPassword);
    //     const connectorClient = new ConnectorClient(credentials, {
    //         baseUri: 'https://smba.trafficmanager.net/emea/'
    //     });

    //     const activity = {
    //         type: 'message',
    //         attachments: [
    //             CardFactory.adaptiveCard({
    //                 type: 'AdaptiveCard',
    //                 version: '1.3',
    //                 body: [
    //                     {
    //                         type: 'TextBlock',
    //                         text: `Ticket ID: ${ticketId}`,
    //                         weight: 'bolder',
    //                         size: 'medium'
    //                     },
    //                     {
    //                         type: 'TextBlock',
    //                         text: `Replied By: ${repliedBy}`,
    //                         wrap: true
    //                     },
    //                     {
    //                         type: 'TextBlock',
    //                         text: `Message: ${replyMessage}`,
    //                         wrap: true
    //                     }
    //                 ],
    //                 actions: [
    //                     {
    //                         type: 'Action.Submit',
    //                         title: 'Reply',
    //                         data: {
    //                             msteams: { type: 'task/fetch' },
    //                             data: 'replyTicket',
    //                             ticketId: ticketId
    //                         }
    //                     }
    //                 ]
    //             })
    //         ]
    //     };

    //     if (parentMessageId) {
    //         try {
    //             console.log("Inside parentMessageId");
    //             const response = await connectorClient.conversations.sendToConversation(parentMessageId, activity);
    //             console.log(`Message sent successfully with conversation ID: ${response.id}`);
    //         } catch (error) {
    //             console.error('Error sending message:', error.response?.data || error.message);
    //         }
    //     } else {
    //         console.log("Not Inside parentMessageId");
    //         const conversationParams = {
    //             isGroup: false,
    //             tenantId: process.env.MicrosoftAppTenantId,
    //             botId: appId,
    //             members: [
    //                 {
    //                     id: "29:1IPCeyBzb_nqOVoCZPCbG1gJsO5F8Y7DEef_NL8fEGFxAVKtadZ8cwemYFYm5g2GrD7EBcJGZ-nd10-i5_pR4cA"
    //                 }
    //             ],
    //         };

    //         try {
    //             // First create the conversation
    //             const conversationResponse = await connectorClient.conversations.createConversation(conversationParams);
    //             console.log(`New chat started with conversation ID: ${conversationResponse.id}`);

    //             // Then send your message to the newly created conversation
    //             const messageResponse = await connectorClient.conversations.sendToConversation(
    //                 conversationResponse.id,
    //                 activity
    //             );

    //             console.log(`Message sent successfully to conversation ID: ${conversationResponse.id}`);
    //         } catch (error) {
    //             console.error('Error creating conversation:', error);
    //             // Log the entire error object for debugging
    //             console.log('Full error object:', JSON.stringify(error, null, 2));
    //         }
    //     }
    // }

    async sendTicketReply(parentMessageId, ticketId, replyMessage, repliedBy) {
        const appId = process.env.MicrosoftAppId;
        const appPassword = process.env.MicrosoftAppPassword;

        const credentials = new MicrosoftAppCredentials(appId, appPassword);
        const connectorClient = new ConnectorClient(credentials, {
            baseUri: 'https://smba.trafficmanager.net/emea/'
        });

        const user = await UserRepository.findByEmail(repliedBy);
        const email = "subash@superopsinc1.onmicrosoft.com"
        // TODO: save displayName in the user table
        const userName = "Subash V"
        const profileBase64 = await this.getUserProfilePhotoBase64(email, process.env.AccessToken)
        console.log("After fetching profile")
        const activity = await CardService.createUserProfileCard(userName, replyMessage,profileBase64);

        if (parentMessageId) {
            try {
                console.log("Inside parentMessageId");
                const response = await connectorClient.conversations.sendToConversation(parentMessageId, activity);
                console.log(`Message sent successfully with conversation ID: ${response.id}`);
            } catch (error) {
                console.error('Error sending message:', error.response?.data || error.message);
            }
        }
    }

        // TODO: Move this to userService
        async getUserProfilePhotoBase64(email, accessToken) {
            try {
                const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${email}/photo/$value`, {
                    responseType: 'arraybuffer',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                const contentType = response.headers['content-type'];
                const base64Image = Buffer.from(response.data, 'binary').toString('base64');
                return `data:${contentType};base64,${base64Image}`;
            } catch (error) {
                console.error(`⚠️ Failed to fetch profile photo for ${email}:`, error.response?.status, error.message);
                // Fallback to a default avatar if needed
                return 'https://adaptivecards.io/content/PersonPlaceholder.png';
            }
        }

    async sendApprovalCard(ticketId, message, email) {
        const teamsUserId = await UserRepository.findByEmail(email).userId;
        const activity = await CardService.buildInitiateApprovalCard(ticketId, message);
        console.log("Teams User ID: ", teamsUserId);
        try {
            const response = await sendToUser(null, activity, teamsUserId);
            console.log(`Approval card sent successfully with conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error sending approval card:', error.response?.data || error.message);
        }
    }
}




module.exports = new MessageService();