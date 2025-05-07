const { TeamsActivityHandler, MessageFactory, CardFactory } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder');
const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const TicketService = require('./services/TicketService');
const { sendTeamsReply, sendMessageToChannel, requesterCreateTicketCard, buildRequesterTicketCard, buildTechnicianTicketCard } = require('./controller'); // adjust path as needed
const { TurnContext } = require('botbuilder');
const { Ticket } = require('./models');
const { TeamsInfo } = require('botbuilder');
const axios = require('axios');
const querystring = require('querystring');
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
            console.log("Inside onMessage");
            console.log("context: " + JSON.stringify(context.activity));

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
                // const members = await TeamsInfo.getMembers(context);

                // members.forEach(member => {
                //     console.log(`Display Name: ${member.name}`);
                //     console.log(`Teams User ID: ${member.id}`); // This is the Teams-specific user ID
                //     console.log(`AAD Object ID: ${member.aadObjectId}`); // Use this for Graph API
                //     console.log('---');
                // });
                if (await isReplyMessage(context.activity.conversation.id)) {
                    try {
                        // const response = await connectorClient.conversations.createConversation(conversationParams);
                        // console.log(`Message sent to Teams channel. Conversation ID: ${response.id}`);
                        console.log("going to call ticket api");
                        const email = await TicketService.findEmailByTeamsObjectId(context.activity.from.aadObjectId);
                        const ticketResponse = await axios.post(`${process.env.BackEndBaseUrl}/create-ticket`, {
                            client: "Subash",
                            subject: "Sample Subject",
                            description: context.activity.text,
                            status: "TODO",
                            provider: "TEAMS",
                            email: email
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });
                        console.log("Afer call");
                        const ticketId = ticketResponse.data;
                        console.log("TicketId inside onMessage: " + JSON.stringify(ticketResponse.data));
                        const message = await context.sendActivity(await buildRequesterTicketCard(ticketId));

                        // TODO: fetch agentchannelId from mappings
                        const agentChannelId = '19:REo9NLSxP6Nc3qUn2n8aMivpSuI3y9vrTaEXnGhqldM1@thread.tacv2';
                        console.log("agentChannelId: " + agentChannelId);
                        const { conversationId, activityId } = await sendMessageToChannel(agentChannelId, ticketId);
                        // await TicketService.updateTechChannelConversationId(ticketResponse.id, techChannelConversationId)
                        await TicketService.saveTicket({
                            ticketId: ticketId,
                            requestChannelActivityId: message.id,
                            requestChannelConversationId: context.activity.conversation.id,
                            techChannelConversationId: conversationId,
                            techChannelActivityId: activityId,
                        });
                        console.log("serviveurl:" + context.activity.serviceUrl);
                        console.log("channelid:" + context.activity.channelId);
                    } catch (error) {
                        console.error('Error sending message to Teams channel:', error.response?.data || error.message);
                    }
                    await next();
                } else {
                    console.log("before")
                    var ticket = null;
                    console.log(context.activity.channelData.channel.id);
                    console.log(context.activity.conversation.id);
                    if (await this.isRequesterChannel(context.activity.channelData.channel.id)) {
                        console.log("Message from requester channel");
                        ticket = await TicketService.findByRequesterChannelConversationId(context.activity.conversation.id);
                        const parentMessageId = ticket.techChannelConversationId;
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
                        ticket = await TicketService.findByAgentChannelConversationId(context.activity.conversation.id);
                        const parentMessageId = ticket.requestChannelConversationId;

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
                    console.log("TicketId: " + ticket.ticketId)
                    const email = await TicketService.findEmailByTeamsObjectId(context.activity.from.aadObjectId);
                    const replyResponse = await axios.post(`${process.env.BackEndBaseUrl}/ticket/${ticket.ticketId}/reply`, {
                        message: context.activity.text,
                        email: email
                    }, { headers: { 'Content-Type': 'application/json' } });
                    console.log("inside parentMessageId1");
                    await next();
                }
            }
            else {
                // const reply = MessageFactory.attachment(this.getTaskModuleAdaptiveCardOptions());
                // console.log(context.activity.from.aadObjectId);
                // await context.sendActivity(reply);
                try {
                    console.log("Before saving conversation for group chat");
                    const ticket = await TicketService.findByPrivateChannelConversationId(context.activity.conversation.id);
                    const email = await TicketService.findEmailByTeamsObjectId(context.activity.from.aadObjectId);
                    console.log("TicketId: " + ticket.ticketId)
                    const replyResponse = await axios.post(`${process.env.BackEndBaseUrl}/ticket/${ticket.ticketId}/reply`, {
                        message: context.activity.text,
                        email: email
                    }, { headers: { 'Content-Type': 'application/json' } });
                    console.log("After saving conversation for group chat");
                } catch (error) {
                    console.error('Error saving message from group chat:', error.response?.data || error.message);
                }
                await next();
            }
        });
    }

    async onConversationUpdateActivity(context) {
        const membersAdded = context.activity.membersAdded;
        console.log(JSON.stringify(context.activity));
        for (const member of membersAdded) {
            if (member.id && member.id.startsWith("29:")) {
                const user = await TicketService.updateUserIdByTeamsObjectId(member.aadObjectId, member.id);
                console.log("User: " + JSON.stringify(user));
            }
        }
    }

    
    async updateCard(conversationId, activityId, ticketId, card) {
        try {
            const appId = process.env.MicrosoftAppId;
            const appPassword = process.env.MicrosoftAppPassword;
            const credentials = new MicrosoftAppCredentials(appId, appPassword);
            const connectorClient = new ConnectorClient(credentials, {
                baseUri: 'https://smba.trafficmanager.net/emea/'
            });
            await connectorClient.conversations.updateActivity(
                conversationId,
                activityId,
                card
            );
            console.log('Card updated successfully!');
        } catch (error) {
            console.error('Error updating card:', error);
        }
        console.log("After card updation")
    }

    async onInvokeActivity(context) {
        console.log(`Invoke activity received: ${context.activity.name}`);

        if (context.activity.name === 'task/fetch' && context.activity.value?.dataset === 'subcategories') {
            const { queryText, data } = invokeActivity.value;
            const category = data.category;
        
            if (!category) {
                return {
                    status: 200,
                    type: 'application/vnd.microsoft.search.searchResponse',
                    value: { results: [] }
                };
            }
        
            const response = await fetch(`${process.env.BackEndBaseUrl}/ticket/subcategories?category=${category.toLowerCase()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        
            const allOptions = await response.json();
        
            const filteredOptions = allOptions.filter(sub =>
                sub.title.toLowerCase().includes(queryText.toLowerCase())
            );
        
            return {
                status: 200,
                type: 'application/vnd.microsoft.search.searchResponse',
                value: {
                    results: filteredOptions
                }
            };
        }        

        if (context._activity.name === 'application/search') {
            const dropdownCard = context._activity.value.data.choiceselect;
            const searchQuery = context._activity.value.queryText;
      
            const response = await axios.get(`http://registry.npmjs.com/-/v1/search?${querystring.stringify({ text: searchQuery, size: 8 })}`);
            const npmPackages = response.data.objects.map(obj => ({
              title: obj.package.name,
              value: `${obj.package.name} - ${obj.package.description}`
            }));
      
            if (response.status === 200) {
              if (dropdownCard) {
                return this.getCountrySpecificResults(dropdownCard.toLowerCase());
              } else {
                return this.getSuccessResult(npmPackages);
              }
            } else if (response.status === 204) {
              return this.getNoResultFound();
            } else if (response.status === 500) {
              return this.getErrorResult();
            }
          }
        
        if (context.activity.name === 'adaptiveCard/action') {
            console.log('Adaptive card action data:', JSON.stringify(context.activity.value, null, 2));

            if (context.activity.value && context.activity.value.action.verb === 'createGroup') {
                const ticketId = context.activity.value.action.data.ticketId;
                console.log(`Creating group for ticket from invoke handler: ${ticketId}`);

                try {
                    const ticket = await axios.get(`${process.env.BackEndBaseUrl}/tickets/${ticketId}`)
                    const requesterEmail = ticket.data.email;
                    const technicianEmail = ticket.data.technician;

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
                        "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/174915f7-e12a-4e03-a3e9-f86bc337ff38",
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

                    await context.sendActivity(`✅ Group created successfully! [Open Chat](https://teams.microsoft.com/l/chat/0/0?chatId=${chatId})`);
                    await TicketService.updateTicket(ticketId, {
                        privateChannelConversationId: chatId
                    });
                    return { status: 200 };
                } catch (error) {
                    console.error("Error creating group chat:", error);
                    await context.sendActivity("Failed to create group chat. Please try again later.");
                    return { status: 500 };
                }
            }
        }
        return await super.onInvokeActivity(context);
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
            const message = await client
                .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}`)
                .get();
            console.log("Message: " + JSON.stringify(message));

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

    async getDependantSearchCard() {
        return {
          "type": "AdaptiveCard",
          "$schema": "https://adaptivecards.io/schemas/adaptive-card.json",
          "version": "1.5",
          "body": [
            {
              "size": "ExtraLarge",
              "text": "Country Picker",
              "weight": "Bolder",
              "wrap": true,
              "type": "TextBlock"
            },
            {
              "id": "choiceselect",
              "type": "Input.ChoiceSet",
              "label": "Select a country or region:",
              "choices": [
                { "title": "USA", "value": "usa" },
                { "title": "France", "value": "france" },
                { "title": "India", "value": "india" }
              ],
              "valueChangedAction": {
                "type": "Action.ResetInputs",
                "targetInputIds": ["city"]
              },
              "isRequired": true,
              "errorMessage": "Please select a country or region"
            },
            {
              "style": "filtered",
              "choices.data": {
                "type": "Data.Query",
                "dataset": "cities",
                "associatedInputs": "auto"
              },
              "id": "city",
              "type": "Input.ChoiceSet",
              "label": "Select a city:",
              "placeholder": "Type to search for a city in the selected country",
              "isRequired": true,
              "errorMessage": "Please select a city"
            }
          ],
          "actions": [
            {
              "title": "Submit",
              "type": "Action.Submit"
            }
          ]
        };
    }

    async isRequesterChannel(channelId) {
        const channel = await TicketService.findChannelById(channelId)
        console.log("Channel: " + JSON.stringify(channel));
        return channel?.type === 'PUBLIC';
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
        console.log("Inside handleTeamsTaskModuleFetch")
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
        }
        else if (cardTaskFetchValue === 'addNote') {
            const ticketId = taskModuleRequest.data.ticketId;
    
            return {
                task: {
                    type: 'continue',
                    value: {
                        title: 'Add Note to Ticket',
                        height: 'medium',
                        width: 'medium',
                        card: this.getAddNoteAdaptiveCard(ticketId)
                    }
                }
            };
        }
        // else if (cardTaskFetchValue === 'conversation') {
        //     const cardJson = await createUserSelectionCard();
        //     const adaptiveCard = CardFactory.adaptiveCard(cardJson);
        //     taskInfo.card = adaptiveCard;
        //     this.setTaskInfo(taskInfo, {
        //         height: 'medium',
        //         width: 'medium',
        //         title: 'initiate chat'
        //     });
        // } 
        else if (cardTaskFetchValue === 'techAssign') {
            console.log('data: ' + JSON.stringify(taskModuleRequest.data));
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

            // Fetch editable fields from your Helpdesk backend
            const response = await fetch(`${process.env.BackEndBaseUrl}/ticket/${ticketId}/fields`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch editable fields for ticket ${ticketId}`);
            }

            const editableFields = await response.json();

            taskInfo.card = this.createUpdateTicketCard(editableFields, ticketId);

            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Update Ticket'
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

        // if (submittedData.action === 'submitTicket') {
        //     console.log('Ticket submitted:', submittedData);

        //     await TicketService.saveTicket({
        //         name: context.activity.from.name,
        //         messageId: context.activity.id,
        //         body: submittedData.description,
        //         dept: submittedData.department,
        //         title: submittedData.title,
        //         conversationId: context.activity.conversation.id
        //     });

        //     const team = await TicketService.getTeamByDeptName(submittedData.department)
        //     const ticket = await TicketService.getTicketByMessageId(context.activity.id)
        //     const from = context.activity.from.id;
        //     console.log("From User id: " + from)
        //     await sendTeamsReply(null, ticket, from)
        //     await sendTeamsChannelMessage(team.channelId, ticket)
        //     await context.sendActivity(MessageFactory.text("Ticket created successfully"));
        //     return null;return null;

        // } else
        if (submittedData.action === 'submitNote') {
            const ticketId = submittedData.ticketId;
            const noteText = submittedData.noteText;
    
            console.log(`Note submitted for Ticket ID ${ticketId}: ${noteText}`);
    
            // ✅ Send note to your PSA backend (example using fetch)
            try {
                await fetch(`${process.env.BackEndBaseUrl}/ticket/${ticketId}/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ note: noteText })
                });
    
                await context.sendActivity(`📝 Note added to Ticket #${ticketId} successfully!`);
                return null;
            } catch (error) {
                console.error(error);
                await context.sendActivity(`❌ Failed to add note to Ticket #${ticketId}`);
            }
    
            return { task: { type: 'message', value: 'Note submitted successfully.' } };
        }
        else if (submittedData.action === 'submitUpdatedTicket') {
            console.log('Updating ticket:', submittedData);

            const updatePayload = {
                ticketId: submittedData.ticketId,
                priority: submittedData.priority,
                status: submittedData.status,
                category: submittedData.category,
            };

            const response = await fetch(`${process.env.BackEndBaseUrl}/update-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) {
                throw new Error(`Failed to update ticket #${submittedData.ticketId}`);
            }

            const updatedTicketId = await response.text();

            // const updatedTicket = await TicketService.getTicketByTicketId(updatedTicketId);

            await context.sendActivity({
                type: "message",
                text: `✅ Ticket #${updatedTicketId} updated successfully!`
            });

            // await context.sendActivity(await createTicketCard(updatedTicket));
        }
        else if (submittedData.action === 'assignTechnician') {
            const ticket = await TicketService.findByTicketId(submittedData.ticketId);
            console.log("Ticket: " + JSON.stringify(ticket));
            const selectedTechnician = JSON.parse(submittedData.selectedTechnician);
            const technicianName = selectedTechnician.name;
            const technicianEmail = selectedTechnician.email;
            const ticketId = ticket.ticketId;
            console.log("submittedData" + JSON.stringify(submittedData));
            await axios.post(`${process.env.BackEndBaseUrl}/update-ticket`, {
                ticketId: submittedData.ticketId,
                technician: technicianEmail
            }, { headers: { 'Content-Type': 'application/json' } });
            const requesterCard = await buildRequesterTicketCard(ticketId);
            const technicianCard = await buildTechnicianTicketCard(ticketId);
            await this.updateCard(ticket.techChannelConversationId, ticket.techChannelActivityId, ticketId, technicianCard);
            await this.updateCard(ticket.requestChannelConversationId, ticket.requestChannelActivityId, ticketId, requesterCard);
            
            await context.sendActivity(`Technician ${technicianName} has been assigned to the ticket.`)

            return null;
        } else if (submittedData.action === 'cancelTicket') {
            return null;
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

    getAddNoteAdaptiveCard(ticketId) {
        return CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            body: [
                {
                    type: 'TextBlock',
                    text: `Add Note to Ticket #${ticketId}`,
                    weight: 'Bolder',
                    size: 'Medium'
                },
                {
                    type: 'Input.Text',
                    id: 'noteText',
                    placeholder: 'Type your note here...',
                    isMultiline: true
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Submit Note',
                    data: {
                        action: 'submitNote',
                        ticketId: ticketId
                    }
                }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4'
        });
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

    createUpdateTicketCard(fields, ticketId) {
        const cardBody = [
            {
                type: 'TextBlock',
                text: 'Update Ticket',
                weight: 'Bolder',
                size: 'Medium',
                wrap: true
            }
        ];

        for (const field of fields) {
            cardBody.push({
                type: 'TextBlock',
                text: field.name.charAt(0).toUpperCase() + field.name.slice(1),
                wrap: true
            });

            if (field.type === 'text') {
                cardBody.push({
                    type: 'Input.Text',
                    id: field.name,
                    value: field.value || '',
                    placeholder: `Enter ${field.name}`
                });
            } else if (field.type === 'dropdown') {
                cardBody.push({
                    type: 'Input.ChoiceSet',
                    id: field.name,
                    style: 'compact',
                    value: field.value,
                    choices: field.options.map(opt => ({
                        title: opt.charAt(0).toUpperCase() + opt.slice(1),
                        value: opt
                    }))
                });
            } else if (field.type === 'category-dropdown') {
                cardBody.push({
                    type: 'Input.ChoiceSet',
                    id: 'category',
                    style: 'compact',
                    value: field.value,
                    choices: field.options.map(opt => ({
                        title: opt,
                        value: opt.toLowerCase()
                    })),
                    valueChangedAction: {
                        type: 'Action.ResetInputs',
                        targetInputIds: ['subcategory']
                    }
                });
            } else if (field.type === 'subcategory-dropdown') {
                cardBody.push({
                    type: 'Input.ChoiceSet',
                    id: 'subcategory',
                    style: 'filtered',
                    placeholder: 'Select subcategory',
                    value: field.value,
                    choices: [],
                    'choices.data': {
                        type: 'Data.Query',
                        dataset: 'subcategories',
                        associatedInputs: 'auto'
                    }
                });
            }
        }

        return CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.5',
            type: 'AdaptiveCard',
            body: cardBody,
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Update',
                    data: {
                        action: 'submitUpdatedTicket',
                        ticketId: ticketId
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
                { requestChannelConversationId: id },
                { techChannelConversationId: id }
            ]
        }
    });
    return !ticket
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
    console.log("TicketId: " + ticketId)
    try {
        const technicians = await axios.get(`${process.env.BackEndBaseUrl}/technicians?source=TEAMS`)
        console.log(technicians)
        const choices = technicians.data.map(tech => ({
            title: tech.name,
            value: JSON.stringify({ name: tech.name, email: tech.email })
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