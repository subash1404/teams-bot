const axios = require('axios');

const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const { CardFactory } = require('botbuilder');
const TicketService = require('./services/TicketService');


async function sendDM(conversationId, message, teamsUserId = null) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;
    const tenantId = process.env.MicrosoftAppTenantId;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    // Build the card first
    // const cardMessage = await buildRequesterTicketCard(ticketId);

    if (conversationId) {
        console.log("Using existing conversation ID: " + conversationId);
        try {
            const response = await connectorClient.conversations.sendToConversation(conversationId, message);
            console.log(`✅ Message sent successfully with conversation ID: ${conversationId}`);
            return response;
        } catch (error) {
            console.error('❌ Error sending message:', error.response?.data || error.message);
            throw error;
        }
    } else {
        if (!teamsUserId) {
            throw new Error("❗ teamsUserId is required to create a new conversation");
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


async function sendMessageToChannel(channelId, ticketId, attachments) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;
    const tenantId = process.env.MicrosoftAppTenantId;
    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    const activity = await buildTechnicianTicketCard(ticketId, attachments);
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
        if (attachments && attachments.length > 0) {
            await sendAttachmentsToChannel(channelId, response.id, attachments);
        }
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
                    version: "1.4",
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

async function buildInitiateApprovalCard(ticketId, message, status = null) {
    const ticket = (await axios.get(`${process.env.BackEndBaseUrl}/tickets/${ticketId}`)).data;

    const body = [
        {
            type: "TextBlock",
            text: "🎫 Approval Request",
            weight: "Bolder",
            size: "Large",
            color: "Accent"
        },
        {
            type: "FactSet",
            facts: [
                { title: "Ticket ID:", value: ticket.id },
                { title: "Status:", value: ticket.status },
                { title: "Subject:", value: ticket.subject },
                { title: "Priority:", value: ticket.priority },
                { title: "Created By:", value: ticket.email },
                { title: "Technician:", value: ticket.technician }
            ]
        },
        {
            type: "TextBlock",
            text: `Approval Message: ${message}`,
            size: "Medium",
            color: "Accent"
        }
    ];

    const actions = [];

    if (status) {
        console.log("Status: ", status);
        body.push({
            type: "TextBlock",
            text: `Ticket has been ${status.toUpperCase()}`,
            size: "Medium",
            weight: "Bolder",
            color: status.toUpperCase() === 'APPROVED' ? "Good" : "Attention"
        });
    } else {
        actions.push(
            {
                type: 'Action.Execute',
                title: 'Approve',
                verb: 'approveTicket',
                data: { ticketId, message }
            },
            {
                type: 'Action.Execute',
                title: 'Reject',
                verb: 'rejectTicket',
                data: { ticketId, message }
            }
        );
    }

    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    type: "AdaptiveCard",
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    version: "1.4",
                    body,
                    actions
                }
            }
        ]
    };
}


async function sendApprovalCard(ticketId, message, email) {
    const teamsUserId = await TicketService.findTeamsUserIdByEmail(email);
    const activity = await buildInitiateApprovalCard(ticketId, message);
    console.log("Teams User ID: ", teamsUserId);
    try {
        const response = await sendDM(null, activity, teamsUserId);
        console.log(`Approval card sent successfully with conversation ID: ${response.id}`);
    } catch (error) {
        console.error('❌ Error sending approval card:', error.response?.data || error.message);
    }
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

async function buildTechnicianTicketCard(ticketId, attachments) {
    console.log("Ticket ID inside createTicketCard: ", ticketId);
    const ticket = (await axios.get(`${process.env.BackEndBaseUrl}/tickets/${ticketId}`)).data;
    
    // Create the base message with the adaptive card
    const message = {
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
    
    return message;
}

async function sendAttachmentsToChannel(channelId, conversationId, attachments) {
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
// async function buildTechnicianTicketCard(ticketId, attachments) {
//     console.log("Ticket ID inside createTicketCard: ", ticketId);
//     const ticket = (await axios.get(`${process.env.BackEndBaseUrl}/tickets/${ticketId}`)).data;
    
//     // Get message attachments if they exis
    
//     // Determine ticket priority color
//     const getPriorityColor = (priority) => {
//       switch(priority?.toLowerCase()) {
//         case 'high': return 'attention';
//         case 'urgent': return 'warning';
//         case 'critical': return 'warning';
//         case 'low': return 'good';
//         default: return 'default';
//       }
//     };
    
//     // Determine status color
//     const getStatusColor = (status) => {
//       switch(status?.toLowerCase()) {
//         case 'open': return 'attention';
//         case 'in progress': return 'accent';
//         case 'resolved': return 'good';
//         case 'closed': return 'default';
//         default: return 'default';
//       }
//     };
    
//     // Format date for display
//     const formatDate = (dateString) => {
//       if (!dateString) return '';
//       const date = new Date(dateString);
//       return date.toLocaleString('en-US', { 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     };
    
//     // Get file icon based on file extension
//     const getFileIconByName = (filename) => {
//       if (!filename) return '📎';
//       const ext = filename.split('.').pop().toLowerCase();
//       switch(ext) {
//         case 'pdf': return '📄';
//         case 'doc':
//         case 'docx': return '📝';
//         case 'xls':
//         case 'xlsx': return '📊';
//         case 'ppt':
//         case 'pptx': return '📃';
//         case 'jpg':
//         case 'jpeg':
//         case 'png': return '🖼️';
//         case 'json': return '🔧';
//         default: return '📎';
//       }
//     };
    
//     // Check if we have attachments
//     const hasAttachment = attachments && attachments.length > 0;
    
//     return {
//       type: "message",
//       attachments: [
//         {
//           contentType: "application/vnd.microsoft.card.adaptive",
//           content: {
//             type: "AdaptiveCard",
//             $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
//             version: "1.5",
//             body: [
//               {
//                 type: "Container",
//                 style: "emphasis",
//                 items: [
//                   {
//                     type: "ColumnSet",
//                     columns: [
//                       {
//                         type: "Column",
//                         width: "stretch",
//                         items: [
//                           {
//                             type: "TextBlock",
//                             text: `🎫 Ticket #${ticket.id}`,
//                             weight: "Bolder",
//                             size: "Large",
//                             color: "Accent"
//                           }
//                         ]
//                       },
//                       {
//                         type: "Column",
//                         width: "auto",
//                         items: [
//                           {
//                             type: "TextBlock",
//                             text: ticket.status || "New",
//                             color: getStatusColor(ticket.status),
//                             weight: "Bolder"
//                           }
//                         ]
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 type: "Container",
//                 items: [
//                   {
//                     type: "TextBlock",
//                     text: ticket.subject,
//                     weight: "Bolder",
//                     size: "Medium",
//                     wrap: true
//                   },
//                   {
//                     type: "ColumnSet",
//                     spacing: "Medium",
//                     columns: [
//                       {
//                         type: "Column",
//                         width: "stretch",
//                         items: [
//                           {
//                             type: "FactSet",
//                             facts: [
//                               { title: "Created By", value: ticket.email || "Unknown" },
//                               { title: "Priority", value: ticket.priority || "Normal" },
//                               { title: "Created On", value: formatDate(ticket.createdAt) || "Today" }
//                             ]
//                           }
//                         ]
//                       },
//                       {
//                         type: "Column",
//                         width: "stretch",
//                         items: [
//                           {
//                             type: "FactSet",
//                             facts: [
//                               { title: "Technician", value: ticket.technician || "Unassigned" },
//                               { title: "Department", value: ticket.department || "Support" },
//                               { title: "Last Updated", value: formatDate(ticket.updatedAt) || "Today" }
//                             ]
//                           }
//                         ]
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 type: "Container",
//                 style: "emphasis",
//                 items: [
//                   {
//                     type: "TextBlock",
//                     text: "Description",
//                     weight: "Bolder"
//                   },
//                   {
//                     type: "TextBlock",
//                     text: ticket.description || "No description provided.",
//                     wrap: true,
//                     spacing: "Small"
//                   }
//                 ]
//               },
//               {
//                 type: "Container",
//                 visible: hasAttachment,
//                 items: [
//                   {
//                     type: "TextBlock",
//                     text: "Attachments",
//                     weight: "Bolder",
//                     spacing: "Medium"
//                   },
//                   ...(hasAttachment ? attachments.map(attachment => {
//                     const fileName = attachment.name || "Unnamed File";
//                     const fileUrl = attachment.contentUrl || "";
//                     const fileIcon = getFileIconByName(fileName);
//                     const fileType = fileName.split('.').pop().toUpperCase() || "File";
                    
//                     return {
//                       type: "ColumnSet",
//                       spacing: "Small",
//                       columns: [
//                         {
//                           type: "Column",
//                           width: "auto",
//                           items: [
//                             {
//                               type: "TextBlock",
//                               text: fileIcon,
//                               size: "Large"
//                             }
//                           ]
//                         },
//                         {
//                           type: "Column",
//                           width: "stretch",
//                           items: [
//                             {
//                               type: "TextBlock",
//                               text: `[${fileName}](${fileUrl})`,
//                               wrap: true
//                             },
//                             {
//                               type: "TextBlock",
//                               text: `${fileType} • Click to view`,
//                               isSubtle: true,
//                               spacing: "None",
//                               size: "Small"
//                             }
//                           ]
//                         }
//                       ]
//                     };
//                   }) : [])
//                 ]
//               }
//             ],
//             actions: [
//               {
//                 type: "Action.Execute",
//                 title: "💬 Initiate Conversation",
//                 verb: "createGroup",
//                 style: "positive",
//                 data: {
//                   ticketId: ticketId
//                 }
//               },
//               {
//                 type: "Action.Submit",
//                 title: "✏️ Update Ticket",
//                 data: {
//                   msteams: {
//                     type: "task/fetch"
//                   },
//                   action: "updateTicket",
//                   ticketId: ticketId,
//                   data: 'adaptiveCard'
//                 }
//               },
//               {
//                 type: "Action.Submit",
//                 title: "👤 Assign Technician",
//                 data: {
//                   msteams: {
//                     type: "task/fetch"
//                   },
//                   action: "techAssign",
//                   ticketId: ticketId,
//                   data: 'techAssign'
//                 }
//               },
//               {
//                 type: "Action.Submit",
//                 title: "📝 Add Note",
//                 data: {
//                   msteams: {
//                     type: "task/fetch"
//                   },
//                   action: "addNote",
//                   ticketId: ticketId,
//                   data: 'addNote'
//                 }
//               }
//             ]
//           }
//         }
//       ]
//     };
//   }

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