const { TeamsActivityHandler, MessageFactory, CardFactory } = require('botbuilder');

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
    handleTeamsTaskModuleFetch(context, taskModuleRequest) {
        const cardTaskFetchValue = taskModuleRequest.data.data;
        const taskInfo = {};

        if (cardTaskFetchValue === 'adaptiveCard') {
            taskInfo.card = this.createAdaptiveCardAttachment();
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
            // Call your backend API here to log the ticket
            // Example: Use axios or fetch to send POST request
            console.log('Ticket submitted:', submittedData);
    
            // Respond to user
            await context.sendActivity(MessageFactory.text("Ticket created successfully"));       
            return null;
        }  else if (submittedData.action === 'cancelTicket') {
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
                    text: 'Subject',
                    wrap: true
                },
                {
                    type: 'Input.Text',
                    id: 'subject',
                    placeholder: 'Enter ticket subject'
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
                    text: 'Technician',
                    wrap: true
                },
                {
                    type: 'Input.ChoiceSet',
                    id: 'technician',
                    style: 'compact',
                    choices: [
                        { title: 'Technician A', value: 'tech_a' },
                        { title: 'Technician B', value: 'tech_b' },
                        { title: 'Technician C', value: 'tech_c' }
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
    
}

module.exports.EchoBot = EchoBot;
