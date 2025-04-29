const { TeamsActivityHandler, MessageFactory, CardFactory } = require('botbuilder');
const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const TicketService = require('./services/TicketService');
const { sendTeamsReply, sendTeamsChannelMessage } = require('./controller'); // adjust path as needed
const { TurnContext } = require('botbuilder');
const { Ticket } = require('./models');
const { TeamsInfo } = require('botbuilder');
const axios = require('axios');
const { Op } = require('sequelize');


class EchoBot extends TeamsActivityHandler {
    constructor() {
        super();
        this.baseUrl = process.env.BaseUrl;
        const appId = process.env.MicrosoftAppId;
        const appPassword = process.env.MicrosoftAppPassword;
        const credentials = new MicrosoftAppCredentials(appId, appPassword);
        const connectorClient = new ConnectorClient(credentials, {
            baseUri: 'https://smba.trafficmanager.net/emea/'
        });
        this.onMessage(async (context, next) => {
            // const attachments = context.activity.attachments;
            //         if (attachments && attachments.length > 0) {
            //             console.log(attachments.length)
            //             console.log("Attachments: "+ JSON.stringify(context.activity));
            //             for (const attachment of attachments) {
            //                 console.log(`Received attachment: ${attachment.name}, type: ${attachment.contentType}`);
            //             }
            //         } else {
            //             console.log("Text:", context.activity.text);
            //     }
            if (context.activity.conversation.conversationType === 'channel') {
                console.log("Context: " + JSON.stringify(context.activity));
                console.log("con id: " + context.activity.conversation.id);
                // const members = await TeamsInfo.getMembers(context);

                // members.forEach(member => {
                //     console.log(`Display Name: ${member.name}`);
                //     console.log(`Teams User ID: ${member.id}`); // This is the Teams-specific user ID
                //     console.log(`AAD Object ID: ${member.aadObjectId}`); // Use this for Graph API
                //     console.log('---');
                // });
                if (await isReplyMessage(context.activity.conversation.id)) {
                    await TicketService.saveTicket({
                        name: context.activity.from.name,
                        messageId: context.activity.id,
                        body: context.activity.text,
                        requesterConversationId: context.activity.conversation.id
                    });
                    const ticket = await TicketService.getTicketByMessageId(context.activity.id); 
                    await context.sendActivity(await createTicketCard(ticket));

                    const agentChannelId = '19:REo9NLSxP6Nc3qUn2n8aMivpSuI3y9vrTaEXnGhqldM1@thread.tacv2';

                    const agentConversationId = await sendTeamsChannelMessage(agentChannelId, ticket, context.activity.from.aadObjectId);
                    await TicketService.updateAgentConversationId(ticket.id, agentConversationId)
                    console.log("serviveurl:" + context.activity.serviceUrl);
                    console.log("channelid:" + context.activity.channelId);

                    await next();
                } else {
                    console.log("before")
                    var ticket = null;
                    console.log(context.activity.channelData.channel.id);
                    console.log(context.activity.conversation.id);
                    if (await this.isRequesterChannel(context.activity.channelData.channel.id)) {
                        console.log("Message from requester channel");
                        ticket = await TicketService.findByRequesterConversationId(context.activity.conversation.id);
                        const parentMessageId = ticket.agentConversationId;
                        console.log(parentMessageId);
                        const activity = {
                            type: 'message',
                            text: context.activity.text
                        };
                        try {
                            const response = await connectorClient.conversations.sendToConversation(parentMessageId, activity);
                            console.log(`Message sent successfully with conversation ID: ${response.id}`);
                        } catch (error) {
                            console.error('Error sending message:', error.response?.data || error.message);
                        }
                    } else {
                        ticket = await TicketService.findByAgentConversationId(context.activity.conversation.id);
                        const parentMessageId = ticket.requesterConversationId;

                        // User details
                        const userId = context.activity.from.id;
                        const userName = context.activity.from.name;
                        const messageText = context.activity.text;

                        // Create the adaptive card
                        const userCard = this.createUserProfileCard(userId, userName, messageText);

                        // Create the activity with the card
                        const activity = {
                        type: 'message',
                        attachments: [
                            {
                            contentType: 'application/vnd.microsoft.card.adaptive',
                            content: userCard
                            }
                        ]
                        };

                        try {
                        // If using connector client approach
                        const response = await connectorClient.conversations.sendToConversation(parentMessageId, activity);
                        console.log(`Message sent successfully with conversation ID: ${response.id}`);
                        } catch (error) {
                        console.error('Error sending message:', error.response?.data || error.message);
                        }
                    }
                    console.log("inside parentMessageId");
                    console.log("TicketId: "+ ticket.id)
                    const replyResponse = await axios.post(`https://3e01-14-195-129-62.ngrok-free.app/ticket/${ticket.id}/reply`, {
                        message: context.activity.text,
                        userId: context.activity.from.name
                    }, {headers: { 'Content-Type': 'application/json' }});
                    console.log("inside parentMessageId1");
                    await next();
                }
            }
            else {
                const reply = MessageFactory.attachment(this.getTaskModuleAdaptiveCardOptions());
                console.log(context.activity.from.aadObjectId);
                await context.sendActivity(reply);
                await next();
            }
        });
    }

    async getChannelMessageAttachments(messageId, channelId) {
        const token = process.env.AccessToken;
        const teamId = '80ae0e3f-5eac-43bd-b475-71ae0b4220b7';
        const client = Client.init({
          authProvider: (done) => {
            done(null, token);
          }
        });
      
        try {
          // Get the message without using expand
          const message = await client
            .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}`)
            .get();
            console.log("Message: " + JSON.stringify(message));
          
          // Attachments are already included in the response
          if (message.attachments && message.attachments.length > 0) {
            console.log(`Message has ${message.attachments.length} attachments.`);
            for (const attachment of message.attachments) {
              console.log(`Attachment: ${attachment.name || 'No name'}, Content Type: ${attachment.contentType}`);
            }
            return message.attachments;
          }
          
          return [];
        } catch (error) {
          console.error('Error retrieving message attachments:', error);
          return [];
        }
      }

 createUserProfileCard(userId, userName, messageText, userImageUrl = null) {
    // Create the card object
    const card = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.3',
      body: [
        {
            type: 'TextBlock',
            text: `[${userName}](https://teams.microsoft.com/l/chat/0/0?users=prajwal@superopsinc1.onmicrosoft.com) says: ${messageText}`,
            wrap: true,
            spacing: 'medium'
        }
      ],
    //   msteams: {
    //     entities: [
    //       {
    //         type: 'mention',
    //         text: `<at>${userName}</at>`,
    //         mentioned: {
    //           id: userId,
    //           name: userName
    //         }
    //       }
    //     ]
    //   }
    };
  
    return card;
  }

    async sendMessageToChannel(context, botAppId, targetChannelId, message) {
        try {
            // Create reference parameters
            const reference = {
                bot: {
                    id: botAppId
                },
                channelId: context.activity.channelId,
                serviceUrl: context.activity.serviceUrl,
                conversation: {
                    id: targetChannelId
                }
            };

            // Use continueConversation with the proper approach for your SDK version
            await context.adapter.continueConversationAsync(
                botAppId,
                reference,
                async (turnContext) => {
                    // Create the activity to send
                    const activity = typeof message === 'string'
                        ? { type: 'message', text: message }
                        : message;

                    // Send the message
                    const sentActivity = await turnContext.sendActivity(activity);
                    console.log(JSON.stringify(sentActivity))
                    console.log(`Message sent to channel ${targetChannelId}, message ID: ${sentActivity.id}`);
                    return sentActivity;
                }
            );
        } catch (error) {
            console.error(`Error sending message to channel: ${error.message}`);
            throw error;
        }
    }

    async isRequesterChannel(channelId) {
        const channel = await TicketService.findChannelById(channelId)
        console.log("Channel: " + JSON.stringify(channel));
        return channel?.type === 'REQUESTER';
    }

    async syncRequesterMessageToAgent(context) {
        const parentMessageId = "1744875541389";
        const agentChannelId = '19:REo9NLSxP6Nc3qUn2n8aMivpSuI3y9vrTaEXnGhqldM1@thread.tacv2';

        // Get the conversation reference for the parent message
        const conversationReference = {
            channelId: context.activity.channelId,
            serviceUrl: context.activity.serviceUrl,
            conversation: {
                id: agentChannelId,
                isGroup: true
            },
            user: context.activity.from
        };

        // Get message content 
        const messageContent = context.activity.text;

        // Create a new activity as a reply
        await context.adapter.continueConversationAsync(
            process.env.MicrosoftAppId,
            conversationReference,
            async (newContext) => {
                const replyActivity = {
                    type: 'message',
                    text: `**Requester asked:** ${messageContent}`,
                    channelData: {
                        replyToId: parentMessageId
                    }
                };

                await newContext.sendActivity(replyActivity);
            }
        );
    }



    async handleTeamsTaskModuleFetch(context, taskModuleRequest) {
        console.log("Inside 1")
        const cardTaskFetchValue = taskModuleRequest.data.data;
        const taskInfo = {};

        console.log("cardTaskFetchValue: " + cardTaskFetchValue)

        if (cardTaskFetchValue === 'adaptiveCard') {
            taskInfo.card = this.createAdaptiveCardAttachment();
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Fill the form'
            });
        } else if (cardTaskFetchValue === 'replyTicket') {
            const ticketId = taskModuleRequest.data.ticketId;
            console.log("Ticketid: " + ticketId)
            console.log("Ticketid: " + JSON.stringify(taskModuleRequest.data))
            taskInfo.card = this.createReplyCardAttachment(ticketId);
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Reply to Ticket'
            });
        } else if (cardTaskFetchValue === 'conversation') {
            const cardJson = await createUserSelectionCard();
            const adaptiveCard = CardFactory.adaptiveCard(cardJson);
            taskInfo.card = adaptiveCard;
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'initiate chat'
            });
        } else if (cardTaskFetchValue === 'techAssign') {
            const cardJson = await createTechnicianAssignmentCard(taskModuleRequest.data.ticketId);
            const adaptiveCard = CardFactory.adaptiveCard(cardJson);
            taskInfo.card = adaptiveCard;
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'initiate chat'
            });
        } else if (cardTaskFetchValue === 'updateTicket') {
            const ticketId = taskModuleRequest.data.ticketId; 
            const ticket = await TicketService.getTicketByTicketId(ticketId) 
            taskInfo.card = this.createUpdateTicketCard(ticket);
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Fill the form'
            });
        }
        return {
            task: {
                type: 'continue',
                value: taskInfo
            }
        };
    }

    async handleTeamsTaskModuleSubmit(context, taskModuleRequest) {
        const submittedData = taskModuleRequest.data;
        console.log(taskModuleRequest.data.selectedUsers)

        if (submittedData.action === 'submitTicket') {
            console.log('Ticket submitted:', submittedData);

            await TicketService.saveTicket({
                name: context.activity.from.name,
                messageId: context.activity.id,
                body: submittedData.description,
                dept: submittedData.department,
                title: submittedData.title,
                conversationId: context.activity.conversation.id
            });

            const team = await TicketService.getTeamByDeptName(submittedData.department)
            const ticket = await TicketService.getTicketByMessageId(context.activity.id)
            const from = context.activity.from.id;
            console.log("From User id: " + from)
            await sendTeamsReply(null, ticket, from)
            await sendTeamsChannelMessage(team.channelId, ticket)
            await context.sendActivity(MessageFactory.text("Ticket created successfully"));
            return null;

        } else if (submittedData.action === 'submitUpdatedTicket') {
            console.log('Updating ticket:', submittedData);
    
            await TicketService.updateTicket(submittedData.ticketId, {
                title: submittedData.title,
                messageId: context.activity.id,
                body: submittedData.description,
                dept: submittedData.department,
                conversationId: context.activity.conversation.id
            });
    
            const updatedTicket = await TicketService.getTicketByTicketId(submittedData.ticketId);

            await context.sendActivity({
                type: "message",
                text: `✅ Ticket #${submittedData.ticketId} updated successfully!`
            });
    
            await context.sendActivity(await createTicketCard(updatedTicket));
            return null;
        } else if (submittedData.action === 'assignTechnician') {
            const { ticketId, selectedTechnician } = submittedData;
        
            await TicketService.assignTechnicianToTicket(ticketId, selectedTechnician);
        
            // await sendTeamsReply(technician, ticket);
        
            await context.sendActivity(`Technician ${selectedTechnician} has been assigned to the ticket.`)
            return null;
        } else if (submittedData.action === 'cancelTicket') {
            return null;
        } else if (submittedData.action === 'createGroup') {
            const userIds = submittedData.selectedUsers.split(',');
            const members = userIds.map(id => ({
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${id}`
            }));
            const payload = {
                chatType: "group",
                members
            };
            const response = await axios.post(
                "https://graph.microsoft.com/v1.0/chats",
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.AccessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const chatId = response.data.id;
            console.log("ChatId: " + chatId)

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
            return {
                task: {
                    type: 'message',
                    value: `✅ Group created! [Open Chat](https://teams.microsoft.com/l/chat/0/0?chatId=${chatId})`
                }
            };
        }
    }

    // delay(ms) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }

    // Utility to set size and title of task module
    setTaskInfo(taskInfo, uiSettings) {
        taskInfo.height = uiSettings.height;
        taskInfo.width = uiSettings.width;
        taskInfo.title = uiSettings.title;
    }


    // Send an Adaptive Card with action buttons
    getTaskModuleAdaptiveCardOptions() {
        const adaptiveCard = {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.0',
            type: 'AdaptiveCard',
            body: [
                {
                    type: 'TextBlock',
                    text: 'Click below to open the form',
                    weight: 'bolder',
                    size: 'medium'
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Open Form',
                    data: {
                        msteams: { type: 'task/fetch' },
                        data: 'adaptiveCard'
                    }
                }
            ]
        };

        return CardFactory.adaptiveCard(adaptiveCard);
    }

    // The form that opens inside the Task Module
    createAdaptiveCardAttachment() {
        return CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            type: 'AdaptiveCard',
            body: [
                {
                    type: 'TextBlock',
                    text: 'Create a New Ticket',
                    weight: 'Bolder',
                    size: 'Medium',
                    wrap: true
                },
                {
                    type: 'TextBlock',
                    text: 'Title',
                    wrap: true
                },
                {
                    type: 'Input.Text',
                    id: 'title',
                    placeholder: 'Enter ticket title'
                },
                {
                    type: 'TextBlock',
                    text: 'Description',
                    wrap: true
                },
                {
                    type: 'Input.Text',
                    id: 'description',
                    placeholder: 'Enter ticket description',
                    isMultiline: true
                },
                {
                    type: 'TextBlock',
                    text: 'Department',
                    wrap: true
                },
                {
                    type: 'Input.ChoiceSet',
                    id: 'department',
                    style: 'compact',
                    choices: [
                        { title: 'HR', value: 'hr' },
                        { title: 'Engineering', value: 'engineering' },
                        { title: 'Sales', value: 'sales' }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: 'Priority',
                    wrap: true
                },
                {
                    type: 'Input.ChoiceSet',
                    id: 'priority',
                    style: 'compact',
                    choices: [
                        { title: 'Low', value: 'low' },
                        { title: 'Medium', value: 'medium' },
                        { title: 'High', value: 'high' },
                        { title: 'Critical', value: 'critical' }
                    ]
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Submit',
                    data: {
                        action: 'submitTicket'
                    }
                },
                {
                    type: 'Action.Submit',
                    title: 'Cancel',
                    data: {
                        action: 'cancelTicket'
                    }
                }
            ]
        });
    }

    createUpdateTicketCard(ticket) {
        return CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            type: 'AdaptiveCard',
            body: [
                {
                    type: 'TextBlock',
                    text: `Updated Ticket #${ticket.id}`,
                    weight: 'Bolder',
                    size: 'Medium',
                    wrap: true
                },
                {
                    type: 'TextBlock',
                    text: 'Title',
                    wrap: true
                },
                {
                    type: 'Input.Text',
                    id: 'title',
                    placeholder: 'Enter ticket title',
                    value: ticket.title
                },
                {
                    type: 'TextBlock',
                    text: 'Description',
                    wrap: true
                },
                {
                    type: 'Input.Text',
                    id: 'description',
                    placeholder: 'Enter ticket description',
                    isMultiline: true,
                    value: ticket.body
                },
                {
                    type: 'TextBlock',
                    text: 'Priority',
                    wrap: true
                },
                {
                    type: 'Input.ChoiceSet',
                    id: 'priority',
                    style: 'compact',
                    value: ticket.priority || 'medium', // fallback
                    choices: [
                        { title: 'Low', value: 'low' },
                        { title: 'Medium', value: 'medium' },
                        { title: 'High', value: 'high' },
                        { title: 'Critical', value: 'critical' }
                    ]
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Update',
                    data: {
                        action: 'submitUpdatedTicket',
                        ticketId: ticket.id
                    }
                },
                {
                    type: 'Action.Submit',
                    title: 'Cancel',
                    data: {
                        action: 'cancelTicket'
                    }
                }
            ]
        });
    }

    createReplyCardAttachment(ticketId) {
        return CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.4",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Reply to the ticket:",
                    "wrap": true
                },
                {
                    "type": "Input.Text",
                    "id": "userReply",
                    "placeholder": "Type your reply here"
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "Submit Reply",
                    "data": {
                        "action": "submitReply",
                        "ticketId": ticketId
                    }
                }
            ]
        });
    }
}

async function isReplyMessage(id) {
    const ticket = await Ticket.findOne({
        where: {
            [Op.or]: [
                { requesterConversationId: id },
                { agentConversationId: id }
            ]
        }
    });
    return !ticket
}

async function createTicketCard(ticket) {
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
                                { title: "Ticket ID:", value: String(ticket.id) },
                                { title: "Subject:", value: ticket.title || "N/A" },
                                { title: "Message:", value: ticket.body || "N/A" },
                                { title: "From:", value: ticket.name || "N/A" }
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
                              data: 'updateTicket'
                            }
                        }
                    ]
                }
            }
        ]
    };
}

async function createUserSelectionCard() {
    try {
        const users = await TicketService.getAllUsers();

        const choices = users.map(user => ({
            title: user.displayName,
            value: user.id
        }));

        const card = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.5",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Create a Group",
                    "weight": "Bolder",
                    "size": "Medium"
                },
                {
                    "type": "TextBlock",
                    "text": "Select users to add to the group:",
                    "wrap": true
                },
                {
                    "type": "Input.ChoiceSet",
                    "id": "selectedUsers",
                    "isMultiSelect": true,
                    "style": "expanded",
                    "choices": choices
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "Create Group",
                    "data": {
                        "action": "createGroup"
                    }
                }
            ]
        };

        return card;

    } catch (err) {
        console.error("Error fetching users:", err);
        throw err;
    }
}

async function createTechnicianAssignmentCard(ticketId) {
    try {
        const technicians = await TicketService.getAllUsers(); // Or TicketService.getTechnicians()

        const choices = technicians.map(tech => ({
            title: tech.displayName,
            value: tech.id
        }));

        const card = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.5",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Assign Technician",
                    "weight": "Bolder",
                    "size": "Medium"
                },
                {
                    "type": "TextBlock",
                    "text": "Select a technician to assign to this ticket:",
                    "wrap": true
                },
                {
                    "type": "Input.ChoiceSet",
                    "id": "selectedTechnician",
                    "isMultiSelect": false,
                    "style": "expanded",
                    "choices": choices
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "✅ Assign Technician",
                    "data": {
                        "action": "assignTechnician",
                        "ticketId": ticketId
                    }
                }
            ]
        };

        return card;

    } catch (err) {
        console.error("Error fetching technicians:", err);
        throw err;
    }
}

module.exports.EchoBot = EchoBot;