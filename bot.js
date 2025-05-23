const { TeamsActivityHandler, CardFactory } = require('botbuilder');
const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const TicketRepository = require('./repository/TicketRepository');
const ChannelRepository = require('./repository/ChannelRepository');
const IMChannelPublicToPrivateRepository = require('./repository/IMChannelPublicToPrivateRepository');
const MessageService = require('./services/MessageService');
const GroupChatService = require('./services/GroupChatService');
const TicketService = require('./services/TicketService');
const DMService = require('./services/DMService');
const CardService = require('./services/CardService');
const { isNewMessage, isRequesterChannel } = require('./util/MessageUtil');
const axios = require('axios');
const { Client } = require('@microsoft/microsoft-graph-client');
const UserRepository = require('./repository/UserRepository');


class TicketBot extends TeamsActivityHandler {
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
            console.log("Inside onMessage 1");
            console.log("Inside onMessage");
            console.log("context: " + JSON.stringify(context.activity));
            const conversation = context.activity.conversation;
            if (conversation.conversationType === 'channel') {
                if (await isNewMessage(conversation.id)) {
                    // New message posted in a channel
                    try {
                        const attachments = await this.getChannelMessageAttachments(context.activity.id, context.activity.channelData.teamsChannelId);
                        // TODO: Fetch subject from attachments
                        const ticketId = await TicketService.saveTicket(context.activity.from.aadObjectId, attachments, context.activity.text);
                        console.log("TicketId inside onMessage: " + JSON.stringify(ticketId));
                        const message = await context.sendActivity(await CardService.buildRequesterTicketCard(ticketId));
                        const channelMapping = await IMChannelPublicToPrivateRepository.findByPublicChannelId(context.activity.channelData.teamsChannelId);
                        console.log(context.activity.channelData.teamsChannelId);
                        console.log("agentChannelId: " + channelMapping.privateChannelId);
                        console.log("Attachments: " + JSON.stringify(attachments));
                        const { conversationId, activityId } = await MessageService.sendToChannel(channelMapping.privateChannelId, ticketId, attachments);
                        await TicketRepository.saveTicket({
                            id: ticketId,
                            requestChannelActivityId: message.id,
                            requestChannelConversationId: context.activity.conversation.id,
                            techChannelConversationId: conversationId,
                            techChannelActivityId: activityId
                        });
                    } catch (error) {
                        console.error('Error sending message to Teams channel:', error.response?.data || error.message);
                    }
                    await next();
                } else {
                    // Reply message posted in a channel
                    var ticket = null;
                    console.log(context.activity.channelData.channel.id);
                    console.log(context.activity.conversation.id);
                    if (await isRequesterChannel(context.activity.channelData.channel.id)) {
                        // Reply message posted in the requester channel
                        console.log("Message from requester channel");
                        ticket = await TicketRepository.findByRequesterChannelConversationId(context.activity.conversation.id, "TEAMS");
                        const conversationId = ticket.techChannelConversationId;

                        const userId = context.activity.from.aadObjectId;
                        const userName = context.activity.from.name;
                        const messageText = context.activity.text;
                        const user = await UserRepository.findByTeamsObjectId(userId);
                        console.log("User: " + JSON.stringify(user));
                        console.log("UserId: " + userId);
                        const profileBase64 = await this.getUserProfilePhotoBase64(user.email, process.env.AccessToken);
                        const activity = await CardService.createUserProfileCard(userName, messageText, profileBase64);

                        try {
                            const response = await connectorClient.conversations.sendToConversation(conversationId, activity);
                            console.log(`Message sent successfully with conversation ID: ${response.id}`);
                        } catch (error) {
                            console.error('Error sending message:', error.response?.data || error.message);
                        }
                    } else {
                        // Reply message posted in the technician channel
                        ticket = await TicketRepository.findByTechChannelConversationId(context.activity.conversation.id, "TEAMS");
                        const conversationId = ticket.requestChannelConversationId;

                        const userId = context.activity.from.aadObjectId;
                        const userName = context.activity.from.name;
                        const messageText = context.activity.text;
                        const user = await UserRepository.findByTeamsObjectId(userId);
                        console.log("User: " + JSON.stringify(user));
                        console.log("UserId: " + userId);
                        const profileBase64 = await this.getUserProfilePhotoBase64(user.email, process.env.AccessToken);
                        const activity = await CardService.createUserProfileCard(userName, messageText, profileBase64)
                        try {
                            // await this.updateCard(ticket.requestChannelConversationId, ticket.requestChannelActivityId, activity)
                            const response = await connectorClient.conversations.sendToConversation(conversationId, activity);
                            console.log(`Message sent successfully with conversation ID`);
                        } catch (error) {
                            console.error('Error sending message:', error.response?.data || error.message);
                        }
                    }
                    console.log("inside parentMessageId");
                    console.log("TicketId: " + ticket.id)
                    const user = await UserRepository.findByTeamsObjectId(context.activity.from.aadObjectId);
                    const replyResponse = await axios.post(`${process.env.BackEndBaseUrl}/ticket/${ticket.id}/reply`, {
                        message: context.activity.text,
                        email: user.email
                    }, { headers: { 'Content-Type': 'application/json' } });
                    console.log("inside parentMessageId1");
                    await next();
                }
            } else if (conversation.conversationType === 'personal') {
                // await context.sendActivity({
                //     type: 'message',
                //     text: 'Here is the downloaded file:',
                //     attachments: [
                //       {
                //         contentType: 'application/vnd.microsoft.card.thumbnail',
                //         content: {
                //           title: 'Downloaded Message',
                //           text: 'Click to open the file',
                //           buttons: [
                //             {
                //               type: 'openUrl',
                //               title: 'View File',
                //               value: 'https://superopsinc1.sharepoint.com/sites/Superops-Tickets/Shared%20Documents/It-help/Internship%20report-1.pdf'
                //             }
                //           ]
                //         }
                //       }
                //     ]
                //   });                  
                await DMService.handleDMMessage(context);
                await next();
            }
            else {
                try {
                    await GroupChatService.postReply(context.activity.text, context.activity.conversation.id, context.activity.from.aadObjectId);
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
                const user = await UserRepository.updateUserIdByTeamsObjectId(member.aadObjectId, member.id);
                console.log("User: " + JSON.stringify(user));
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


    async updateCard(conversationId, activityId, card) {
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

    getSubcategoriesForCategory(category) {
        if (category === 'hardware') {
            return [
                { title: 'Laptop', value: 'laptop' },
                { title: 'Monitor', value: 'monitor' }
            ];
        }
        if (category === 'software') {
            return [
                { title: 'OS Issue', value: 'os' },
                { title: 'Installation', value: 'install' }
            ];
        }
        return [];
    }


    async onInvokeActivity(context) {
        console.log(`Invoke activity received: ${context.activity.name}`);
        console.log("Invoke activity received: " + JSON.stringify(context.activity));
        if (context.activity.name === 'application/search' && context.activity.value?.dataset === 'subcategories') {
            const data = context.activity.value.data;
            const category = data?.category?.toLowerCase();

            if (!category || !this.subcategoriesMap?.[category]) {
                return {
                    status: 200,
                    body: {
                        type: 'application/vnd.microsoft.search.searchResponse',
                        value: { results: [] }
                    }
                };
            }

            const results = this.subcategoriesMap[category].map(sub => ({
                title: sub,
                value: sub.toLowerCase()
            }));

            return {
                status: 200,
                body: {
                    type: 'application/vnd.microsoft.search.searchResponse',
                    value: { results }
                }
            };
        }

        if (context.activity.name === 'adaptiveCard/action') {
            console.log('Adaptive card action data:', JSON.stringify(context.activity.value, null, 2));

            if (context.activity.name === 'adaptiveCard/action') {
                const verb = context.activity.value.verb;

                if (verb === 'refreshFields') {
                    const selectedCategory = context.activity.value.data.category;

                    // Based on category, fetch subcategories
                    const subcategories = this.getSubcategoriesForCategory(selectedCategory); // return array of {title, value}

                    const updatedCard = buildCardWithFields({
                        category: selectedCategory,
                        subcategory: "",
                        subcategories: subcategories
                    });

                    return res.send({
                        statusCode: 200,
                        type: 'application/vnd.microsoft.card.adaptive',
                        value: updatedCard
                    });
                }
            }

            if (context.activity.value && context.activity.value.action.verb === 'createGroup') {
                console.log("Context inside createGroup: " + JSON.stringify(context.activity));
                const ticketId = context.activity.value.action.data.ticketId;
                console.log(JSON.stringify(context.activity));
                console.log(`Creating group for ticket from invoke handler: ${ticketId}`);
                try {
                    const ticket = await axios.get(`${process.env.BackEndBaseUrl}/tickets/${ticketId}`)
                    console.log(JSON.stringify(ticketId));
                    var emails = [];
                    const initiater = await UserRepository.findByTeamsObjectId(context.activity.from.aadObjectId);
                    // if (initiater.email != ticket.data.technician) {
                    //     emails.push(initiater.email);
                    // }
                    emails.push(ticket.data.email, ticket.data.technician);
                    await GroupChatService.initiateGroupChat(emails, ticketId);
                    await context.sendActivity(`✅ Group created successfully!`);
                } catch (error) {
                    console.error("Error creating group chat:", error);
                    await context.sendActivity("Failed to create group chat. Please try again later.");
                    return { status: 500 };
                }
            } else if (context.activity.value && context.activity.value.action.verb === 'approveTicket') {
                console.log("COntext in approveTicket: " + JSON.stringify(context.activity))
                await this.updateCard(context.activity.conversation.id, context.activity.replyToId, await CardService.buildInitiateApprovalCard(context.activity.value.action.data.ticketId, context.activity.value.action.data.message, "APPROVED"));
                await axios.post(`${process.env.BackEndBaseUrl}/ticket/${context.activity.value.action.data.ticketId}/approval`, {
                    status: "APPROVED"
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log("Ticket approved successfully");
                return { status: 200 };
            } else if (context.activity.value && context.activity.value.action.verb === 'rejectTicket') {
                await this.updateCard(context.activity.conversation.id, context.activity.replyToId, await CardService.buildInitiateApprovalCard(context.activity.value.action.data.ticketId, context.activity.value.action.data.message, "REJECTED"));
                await axios.post(`${process.env.BackEndBaseUrl}/ticket/${context.activity.value.action.data.ticketId}/approval`, {
                    status: "REJECTED"
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log("Ticket rejected successfully");
                return { status: 200 };
            }
        }
        return await super.onInvokeActivity(context);
    }

    async getChannelMessageAttachments(messageId, channelId) {
        const token = process.env.AccessToken;
        const Channel = await ChannelRepository.findByChannelId(channelId);
        const teamId = Channel.teamId;
        console.log("TeamId and channelId: " + teamId + " " + channelId);
        const client = Client.init({
            authProvider: (done) => {
                done(null, token);
            }
        });

        try {

            // TODO: use axios?
            const message = await client
                .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}`)
                .get();
            // console.log("Message: " + JSON.stringify(message));

            const siteId = "superopsinc1.sharepoint.com,344677b1-936a-446e-834a-6555914e2131,8ae85b51-3890-471c-b31e-3d08de68cbaf";
            const ChannelName = "It-help";
            console.log("Attachment message: " + JSON.stringify(message.subject))

            if (message.attachments && message.attachments.length > 0) {
                console.log(`Message has ${message.attachments.length} attachments.`);
                const processedAttachments = [];

                for (const attachment of message.attachments) {
                    console.log(`Attachment: ${attachment.name || 'No name'}, Content Type: ${attachment.contentType}`);

                    // Download the actual file content
                    const response = await axios.get(
                        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${ChannelName}/${attachment.name}:/content`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            },
                            responseType: 'arraybuffer'  // Important for binary data
                        }
                    );

                    // Convert the file content to base64
                    const base64Content = Buffer.from(response.data).toString('base64');

                    processedAttachments.push({
                        name: attachment.name,
                        contentType: this.getMimeType(attachment.name),
                        content: base64Content  // Include the actual file content
                    });
                }

                return processedAttachments;
            }

            return message.subject;
        } catch (error) {
            console.error('Error retrieving message attachments:', error);
            return [];
        }
    }

    getMimeType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'txt': 'text/plain',
            'zip': 'application/zip',
            'json': 'application/json'
        };

        return mimeTypes[ext] || 'application/octet-stream';
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

    async handleTeamsTaskModuleFetch(context, taskModuleRequest) {
        console.log("Inside handleTeamsTaskModuleFetch")
        const cardTaskFetchValue = taskModuleRequest.data.action;
        const taskInfo = {};

        console.log("cardTaskFetchValue: " + cardTaskFetchValue)

        if (cardTaskFetchValue === 'addNote') {
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
        else if (cardTaskFetchValue === 'techAssign') {
            console.log('data: ' + JSON.stringify(taskModuleRequest.data));
            const cardJson = await CardService.buildTechnicianAssignmentCard(taskModuleRequest.data.ticketId);
            return {
                task: {
                    type: 'continue',
                    value: {
                        title: 'Assign Technician',
                        height: 'medium',
                        width: 'medium',
                        card: CardFactory.adaptiveCard(cardJson)
                    }
                }
            };
        } else if (cardTaskFetchValue === 'moreinfo') {
            const cardJson = await CardService.buildMoreInfoCard(taskModuleRequest.data.ticketId);
            return {
                task: {
                    type: 'continue',
                    value: {
                        title: 'Assign Technician',
                        height: 'medium',
                        width: 'medium',
                        card: cardJson
                    }
                }
            };
        } else if (cardTaskFetchValue === 'initiateConversation') {
            const cardJson = await CardService.buildMoreInfoCard(taskModuleRequest.data.ticketId);
            return {
                task: {
                    type: 'continue',
                    value: {
                        title: 'Assign Technician',
                        height: 'medium',
                        width: 'medium',
                        card: cardJson
                    }
                }
            };
        } else if (cardTaskFetchValue === 'initiateApproval') {
            const cardJson = await CardService.buildSendApprovalCard(taskModuleRequest.data.ticketId);
            return {
                task: {
                    type: 'continue',
                    value: {
                        title: 'Assign Technician',
                        height: 'medium',
                        width: 'medium',
                        card: cardJson
                    }
                }
            };
        } else if (cardTaskFetchValue === 'updateTicket') {
            const categoryChoices = [
                { title: "Hardware", value: "hardware" },
                { title: "Software", value: "software" }
            ];

            //   const subcategoryMap = {
            //     hardware: [
            //       { title: "Laptop", value: "laptop" },
            //       { title: "Printer", value: "printer" }
            //     ],
            //     software: [
            //       { title: "OS", value: "os" },
            //       { title: "IDE", value: "ide" }
            //     ]
            //   };
            const subcategoryMap = {};

            // const adaptiveCard = buildCard({
            //     categoryChoices,
            //     subcategoryMap,
            //     selectedCategory: "",
            //     selectedSubcategory: ""
            // });

            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Update Ticket'
            });
            const cardJson = await this.createUpdateTicketCard({
                categoryChoices,
                subcategoryMap,
                selectedCategory: "",
                selectedSubcategory: ""
            });
            console.log("Before setting card");
            return {
                task: {
                    type: 'continue',
                    value: {
                        title: 'Assign Technician',
                        height: 'medium',
                        width: 'medium',
                        card: cardJson
                    }
                }
            };   
        }
    }

    async handleTeamsTaskModuleSubmit(context, taskModuleRequest) {
        console.log("Inside handleTeamsTaskModuleSubmit");
        console.log("Submit context: " + JSON.stringify(context.activity));
        const submittedData = taskModuleRequest.data;
        console.log(taskModuleRequest.data.selectedUsers)

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
                const cardJson = await CardService.buildOtherTechnicianAssignmentCard(ticketId);

                // return {
                //     task: {
                //         type: 'continue',
                //         value: {
                //             title: 'Updated Modal Title',
                //             height: 'medium',
                //             width: 'medium',
                //             card: cardJson
                //         }
                //     }
                // };
                return null;
            } catch (error) {
                console.error(error);
                await context.sendActivity(`❌ Failed to add note to Ticket #${ticketId}`);
            }
        } else if (context.activity.value && context.activity.value.data.action === 'assignToMe') {
            const ticketId = submittedData.ticketId;
            const user = await UserRepository.findByTeamsObjectId(context.activity.from.aadObjectId);
            const ticket = await TicketRepository.findById(ticketId);
            if (!ticket) {
                await context.sendActivity(`Ticket not found.`);
            }
            await axios.post(`${process.env.BackEndBaseUrl}/update-ticket`, {
                ticketId: ticketId,
                technician: user.email
            }, { headers: { 'Content-Type': 'application/json' } });
            const requesterCard = await CardService.buildRequesterTicketCard(ticketId);
            const technicianCard = await CardService.buildTechnicianTicketCard(ticketId);
            console.log("Before card updation");
            await this.updateCard(ticket.techChannelConversationId, ticket.techChannelActivityId, technicianCard);
            await this.updateCard(ticket.requestChannelConversationId, ticket.requestChannelActivityId, requesterCard);
            console.log("Ater card updation");
            await context.sendActivity(`Technician ${user.name} has been assigned to the ticket.`)
            return null;
        } else if (submittedData.action === 'submitUpdatedTicket') {
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


            await context.sendActivity({
                type: "message",
                text: `✅ Ticket #${updatedTicketId} updated successfully!`
            });

        }
        else if (submittedData.action === 'assignTechnician') {
            const ticket = await TicketRepository.findById(submittedData.ticketId);
            if (!ticket) {
                await context.sendActivity(`Ticket not found.`);
            }
            console.log("Ticket: " + JSON.stringify(ticket));
            const selectedTechnician = JSON.parse(submittedData.selectedTechnician);
            const technicianName = selectedTechnician.name;
            const technicianEmail = selectedTechnician.email;
            const ticketId = ticket.id;
            console.log("submittedData" + JSON.stringify(submittedData));
            await axios.post(`${process.env.BackEndBaseUrl}/update-ticket`, {
                ticketId: submittedData.ticketId,
                technician: technicianEmail
            }, { headers: { 'Content-Type': 'application/json' } });
            const requesterCard = await CardService.buildRequesterTicketCard(ticketId);
            const technicianCard = await CardService.buildTechnicianTicketCard(ticketId);
            await this.updateCard(ticket.techChannelConversationId, ticket.techChannelActivityId, technicianCard);
            await this.updateCard(ticket.requestChannelConversationId, ticket.requestChannelActivityId, requesterCard);

            await context.sendActivity(`Technician ${technicianName} has been assigned to the ticket.`)

            return null;
        } else if (submittedData.action === 'cancel') {
            return null;
        } else if (submittedData.action === 'openTechList') {
            const ticketId = submittedData.ticketId;
            try {
                const cardJson = await CardService.buildOtherTechnicianAssignmentCard(ticketId);
                return {
                    task: {
                        type: 'continue',
                        value: {
                            title: 'Select Technician',
                            height: 'large',
                            width: 'medium',
                            card: CardFactory.adaptiveCard(cardJson)
                        }
                    }
                };
            } catch (err) {
                console.error("Error in tech assign:", err);
                return {
                    status: 500,
                    body: {
                        error: "Failed to generate card"
                    }
                };
            }
        } else if (submittedData.action === 'submitMoreInfo') {
            const ticketId = submittedData.ticketId;
            const message = submittedData.messageText;
            console.log("More info paylaod: " + ticketId + " : " + message);
            // TODO - call conversation api for more info
        } else if (submittedData.action === 'sendApprovalCard') {
            const managers = submittedData.selectedManagers.split(',');
            const message = submittedData.messageText;
            const ticketId = submittedData.ticketId;
            console.log(message);
            await MessageService.sendApprovalCard(ticketId, message, managers);
            console.log("Approval initiated successfully");
            return null;
            // TODO - call conversation api for more info
        }
    }
    setTaskInfo(taskInfo, uiSettings) {
        taskInfo.height = uiSettings.height;
        taskInfo.width = uiSettings.width;
        taskInfo.title = uiSettings.title;
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

    async createUpdateTicketCard({ categoryChoices, subcategoryMap, selectedCategory, selectedSubcategory }) {
        const body = [
            {
                type: "Input.ChoiceSet",
                id: "category",
                label: "Category",
                style: "compact",
                value: selectedCategory,
                choices: categoryChoices
            }
        ];
    
        // Dynamically show subcategories if category is selected
        if (selectedCategory && subcategoryMap[selectedCategory]) {
            body.push({
                type: "Input.ChoiceSet",
                id: "subcategory",
                label: "Subcategory",
                style: "compact",
                value: selectedSubcategory,
                choices: subcategoryMap[selectedCategory]
            });
        }
    
        return CardFactory.adaptiveCard ({
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.5",
            body,
            actions: [
                {
                    type: "Action.Submit",
                    title: "Update Ticket",
                    data: {
                        action: "submitUpdate"
                    }
                }
            ],
            refresh: {
                action: {
                    type: "Action.Execute",
                    verb: "refreshFields",
                    data: {
                        action: "refreshFields"
                    }
                }
            }
        });
    }    

    // createUpdateTicketCard(fields, ticketId) {
    //     const cardBody = [
    //         {
    //             type: 'TextBlock',
    //             text: 'Update Ticket',
    //             weight: 'Bolder',
    //             size: 'Medium',
    //             wrap: true
    //         }
    //     ];

    //     for (const field of fields) {
    //         if (field.name === 'subcategories') continue;
    //         cardBody.push({
    //             type: 'TextBlock',
    //             text: field.name.charAt(0).toUpperCase() + field.name.slice(1),
    //             wrap: true
    //         });

    //         if (field.type === 'text') {
    //             cardBody.push({
    //                 type: 'Input.Text',
    //                 id: field.name,
    //                 value: field.value || '',
    //                 placeholder: `Enter ${field.name}`
    //             });
    //         } else if (field.type === 'dropdown') {
    //             cardBody.push({
    //                 type: 'Input.ChoiceSet',
    //                 id: field.name,
    //                 style: 'compact',
    //                 value: field.value,
    //                 choices: field.options.map(opt => ({
    //                     title: opt.charAt(0).toUpperCase() + opt.slice(1),
    //                     value: opt
    //                 }))
    //             });
    //         } else if (field.type === 'category-dropdown') {
    //             cardBody.push({
    //                 type: 'Input.ChoiceSet',
    //                 id: 'category',
    //                 style: 'compact',
    //                 value: field.value,
    //                 choices: field.options.map(opt => ({
    //                     title: opt,
    //                     value: opt.toLowerCase()
    //                 })),
    //                 valueChangedAction: {
    //                     type: 'Action.ResetInputs'
    //                 }
    //             });
    //         } else if (field.type === 'subcategory-dropdown') {
    //             cardBody.push({
    //                 type: 'Input.ChoiceSet',
    //                 id: 'subcategory',
    //                 style: 'filtered',
    //                 placeholder: 'Select subcategory',
    //                 value: field.value,
    //                 choices: [],
    //                 'choices.data': {
    //                     type: 'Data.Query',
    //                     dataset: 'subcategories',
    //                     associatedInputs: 'auto'
    //                 }
    //             });
    //         }
    //     }

    //     return CardFactory.adaptiveCard({
    //         $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    //         version: '1.5',
    //         type: 'AdaptiveCard',
    //         body: cardBody,
    //         actions: [
    //             {
    //                 type: 'Action.Submit',
    //                 title: 'Update',
    //                 data: {
    //                     action: 'submitUpdatedTicket',
    //                     ticketId: ticketId
    //                 }
    //             },
    //             {
    //                 type: 'Action.Submit',
    //                 title: 'Cancel',
    //                 data: {
    //                     action: 'cancel'
    //                 }
    //             }
    //         ]
    //     });
    // }

}


module.exports.TicketBot = TicketBot;