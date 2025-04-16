const { TeamsActivityHandler, MessageFactory, CardFactory } = require('botbuilder');
const TicketService = require('./services/TicketService');
const { sendTeamsReply, sendTeamsChannelMessage } = require('./controller'); // adjust path as needed


class EchoBot extends TeamsActivityHandler {
    constructor() {
        super();
        this.baseUrl = process.env.BaseUrl;

        // Message handler: Send the Adaptive Card when a message is received
        this.onMessage(async (context, next) => {
            const reply = MessageFactory.attachment(this.getTaskModuleAdaptiveCardOptions());
            await context.sendActivity(reply);

            await next();
        });
    }

    // Handle when user clicks a button on the Adaptive Card
    async handleTeamsTaskModuleFetch(context, taskModuleRequest) {
        const cardTaskFetchValue = taskModuleRequest.data;
        const taskInfo = {};
    
        if (cardTaskFetchValue.data === 'adaptiveCard') {
            taskInfo.card = this.createAdaptiveCardAttachment();
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Fill the form'
            });
        }
    
        else if (cardTaskFetchValue.action === 'updateTicket') {
            const ticketId = cardTaskFetchValue.ticketId; 
            const ticket = await TicketService.getTicketByMessageId(ticketId) 
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
    
            console.log(context.activity.replyToId);
    
            const team = await TicketService.getTeamByDeptName(submittedData.department);
            const ticket = await TicketService.getTicketByMessageId(context.activity.id);
    
            await sendTeamsReply(null, ticket);
            await sendTeamsChannelMessage(team.teamId, team.channelId, ticket);
            await context.sendActivity(this.createTicketCard(ticket));
            return null;
        }
    
        else if (submittedData.action === 'submitUpdatedTicket') {
            console.log('Updating ticket:', submittedData);
    
            await TicketService.updateTicket(submittedData.ticketId, {
                title: submittedData.title,
                messageId: context.activity.id,
                body: submittedData.description,
                dept: submittedData.department,
                conversationId: context.activity.conversation.id
            });
    
            const updatedTicket = await TicketService.getTicketById(submittedData.ticketId);

            await context.sendActivity({
                type: "message",
                text: `✅ Ticket #${submittedData.ticketId} updated successfully!`
            });
    
            await context.sendActivity(this.createTicketCard(updatedTicket));
            return null;
        }
    
        else if (submittedData.action === 'cancelTicket') {
            return null;
        }
    }
    

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
                    text: 'Department',
                    wrap: true
                },
                {
                    type: 'Input.ChoiceSet',
                    id: 'department',
                    style: 'compact',
                    value: ticket.dept.toUpperCase(),
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

    createTicketCard(ticket) {
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
                                  data: 'adaptiveCard'
                                }
                            }
                        ]
                    }
                }
            ]
        };
    }
}

module.exports.EchoBot = EchoBot;
