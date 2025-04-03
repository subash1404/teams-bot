
const { ActivityHandler, ConsoleTranscriptLogger } = require('botbuilder');
const { Ticket } = require('./models');

class EchoBot extends ActivityHandler {
    constructor() {
        super();
        const { MessageFactory, CardFactory } = require('botbuilder');
        const TicketService = require('./services/TicketService');

        // this.onInvokeActivity(async (context, next) => {
        //     console.log("Received an invoke event:", context.activity);
        
        //     if (!context.activity || !context.activity.name) {
        //         console.error("Error: Activity name is undefined.");
        //         return;
        //     }
        
        //     if (context.activity.name === 'task/fetch') {
        //         console.log("Handling task/fetch request");
        
        //         await context.sendActivity({
        //             type: "invokeResponse",
        //             value: {
        //                 status: 200,
        //                 body: {
        //                     task: {
        //                         type: "continue",
        //                         value: {
        //                             title: "Create a New Ticket",
        //                             width: "medium",
        //                             height: "large",
        //                             card: {
        //                                 "type": "AdaptiveCard",
        //                                 "version": "1.4",
        //                                 "body": [
        //                                     {
        //                                         "type": "TextBlock",
        //                                         "text": "Enter Ticket Details",
        //                                         "weight": "Bolder",
        //                                         "size": "Medium"
        //                                     },
        //                                     {
        //                                         "type": "Input.Text",
        //                                         "id": "subject",
        //                                         "placeholder": "Enter subject"
        //                                     },
        //                                     {
        //                                         "type": "Input.Text",
        //                                         "id": "description",
        //                                         "placeholder": "Enter description",
        //                                         "isMultiline": true
        //                                     },
        //                                     {
        //                                         "type": "Input.ChoiceSet",
        //                                         "id": "category",
        //                                         "label": "Category",
        //                                         "choices": [
        //                                             { "title": "Bug", "value": "bug" },
        //                                             { "title": "Feature Request", "value": "feature" },
        //                                             { "title": "General Query", "value": "query" }
        //                                         ]
        //                                     }
        //                                 ],
        //                                 "actions": [
        //                                     {
        //                                         "type": "Action.Submit",
        //                                         "title": "Submit",
        //                                         "data": { "action": "submit_ticket" }
        //                                     },
        //                                     {
        //                                         "type": "Action.Submit",
        //                                         "title": "Cancel",
        //                                         "data": { "action": "cancel_ticket" }
        //                                     }
        //                                 ]
        //                             }
        //                         }
        //                     }
        //                 }
        //             }
        //         });
        //     }
        
        //     await next();
        // });        
        
        this.onMessage(async (context, next) => {
            console.log('id = ', context.activity.from.id)
            if (context.activity.conversation.conversationType === 'channel') {
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
                else if (await isReplyMessage(context.activity.conversation.id) == null) {
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
            else {                
                if (context.activity.value && context.activity.value.action === "submit_ticket") {
                    const formData = context.activity.value;

                    // Extract form fields
                    const subject = formData.subject;
                    const description = formData.description;
                    const category = formData.category;

                    await TicketService.saveTicket({
                        name: context.activity.from.name,
                        messageId: context.activity.id,
                        body: description,
                        conversationId: context.activity.conversation.id
                    });

                    // Process the ticket (store in DB, notify agents, etc.)
                    await context.sendActivity(`✅ Ticket created successfully!\n\n**Subject:** ${subject}\n**Category:** ${category}`);

                    await context.sendActivity({
                        type: "invokeResponse",
                        value: {
                            status: 200,
                            body: {
                                task: {
                                    type: "message",
                                    value: "✅ Ticket successfully submitted!",
                                }
                            }
                        }
                    });

                } else if (context.activity.value && context.activity.value.action === "cancel_ticket") {
                    await context.sendActivity("❌ Ticket creation cancelled.");

                    await context.sendActivity({
                        type: "invokeResponse",
                        value: {
                            status: 200,
                            body: {
                                task: {
                                    type: "message",
                                    value: "❌ Ticket creation cancelled.",
                                }
                            }
                        }
                    });
                }
                else {
                    const adaptiveCard = {
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": "Welcome to the support bot!",
                                "weight": "Bolder",
                                "size": "Medium"
                            },
                            {
                                "type": "TextBlock",
                                "text": "Click the button below to create a ticket."
                            }
                        ],
                        "actions": [
                        {
                        "type": "Action.Submit",
                        "title": "Create Ticket",
                        "data": {
                            "msteams": {
                            "type": "invoke",
                            "value": {
                                "type": "task/fetch",
                                "tmType": "createTicketCard",
                                "formId": "12345"
                            }
                            }
                        }
                        }
                    ]
                    };
                    const cardAttachment = CardFactory.adaptiveCard(adaptiveCard);
                    await context.sendActivity(MessageFactory.attachment(cardAttachment));
                }
            }
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome! Click the button below to create a ticket.';

            // Adaptive Card with "Create Ticket" Button
            const adaptiveCard = {
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": [
                    {
                        "type": "TextBlock",
                        "text": "Welcome to the support bot!",
                        "weight": "Bolder",
                        "size": "Medium"
                    },
                    {
                        "type": "TextBlock",
                        "text": "Click the button below to create a ticket."
                    }
                ],
                "actions": [
                    {
                        "type": "Action.Submit",
                        "title": "Create Ticket",
                        "data": { "action": "open_task_module" }
                    }
                ]
            };

            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                    const cardAttachment = CardFactory.adaptiveCard(adaptiveCard);
                    await context.sendActivity(MessageFactory.attachment(cardAttachment));
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
    async handleTeamsTaskModuleFetch(context, action) {
        console.log("\nhandleTeamsMessagingExtensionSubmitAction called: " + JSON.stringify(action));
    
        let actionData = action.data.msteams ? action.data.msteams.value : action.data;
    
        if (actionData.tmType === "createTicketCard") {
            console.log("\nTriggering Create Ticket Form...");
    
            let formId = actionData.formId || "defaultForm";
    
            // Generate the Create Ticket form
            let ticketForm = {
                type: "AdaptiveCard",
                version: "1.4",
                body: [
                    { type: "TextBlock", text: "Create a new Ticket", weight: "bolder", size: "large" },
                    { type: "Input.Text", id: "title", placeholder: "Enter ticket title", label: "Title" },
                    { type: "Input.Text", id: "description", placeholder: "Describe the issue", label: "Description", isMultiline: true },
                    { type: "Input.ChoiceSet", id: "priority", label: "Priority", choices: [
                        { title: "Low", value: "low" },
                        { title: "Medium", value: "medium" },
                        { title: "High", value: "high" }
                    ]}
                ],
                actions: [
                    {
                        type: "Action.Submit",
                        title: "Submit Ticket",
                        data: { action: "submit_ticket", formId: formId }
                    }
                ]
            };
    
            return {
                task: {
                    type: "continue",
                    value: {
                        title: "Create a Ticket",
                        width: "medium",
                        height: "medium",
                        card: ticketForm
                    }
                }
            };
        }
    
        return { composeExtension: { type: "result", attachmentLayout: "list", attachments: [] } };
    }    
}

module.exports.EchoBot = EchoBot;
