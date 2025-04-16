const { TeamsActivityHandler, MessageFactory, CardFactory } = require('botbuilder');
const TicketService = require('./services/TicketService');
const { sendTeamsReply, sendTeamsChannelMessage } = require('./controller'); // adjust path as needed
const { TurnContext } = require('botbuilder');
const { Ticket } = require('./models');
const axios = require('axios');


class EchoBot extends TeamsActivityHandler {
    constructor() {
        super();
        this.baseUrl = process.env.BaseUrl;

        this.onMessage(async (context, next) => {
            if(context.activity.conversation.conversationType === 'channel'){
                if (await isReplyMessage(context.activity.conversation.id)==null){
                    await TicketService.saveTicket({
                        name: context.activity.from.name,
                        messageId: context.activity.id,
                        body: context.activity.text,
                        conversationId: context.activity.conversation.id
                    });
                    const ticket = await TicketService.getTicketByMessageId(context.activity.id)
                    const reply = MessageFactory.attachment(this.createTicketCard(ticket));
                    await context.sendActivity(reply);
                    await next();
                }
            }
            else{
                const reply = MessageFactory.attachment(this.getTaskModuleAdaptiveCardOptions());
                console.log(context.activity.from.aadObjectId);
                await context.sendActivity(reply);
                await next();
            }
        });
    }

    async handleTeamsTaskModuleFetch(context, taskModuleRequest) {
        console.log("Inside 1")
        const cardTaskFetchValue = taskModuleRequest.data.data;
        const taskInfo = {};

        console.log("cardTaskFetchValue: "+ cardTaskFetchValue)

        if (cardTaskFetchValue === 'adaptiveCard') {
            taskInfo.card = this.createAdaptiveCardAttachment();
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Fill the form'
            });
        } else if (cardTaskFetchValue === 'replyTicket') {
            const ticketId = taskModuleRequest.data.ticketId;
            console.log("Ticketid: "+ ticketId)
            console.log("Ticketid: "+ JSON.stringify(taskModuleRequest.data))
            taskInfo.card = this.createReplyCardAttachment(ticketId);
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'Reply to Ticket'
            });
        } else if (cardTaskFetchValue === 'conversation'){
            const cardJson = await createUserSelectionCard();
            const adaptiveCard = CardFactory.adaptiveCard(cardJson);
            taskInfo.card = adaptiveCard;
            this.setTaskInfo(taskInfo, {
                height: 'medium',
                width: 'medium',
                title: 'initiate chat'
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

            const team =  await TicketService.getTeamByDeptName(submittedData.department)
            const ticket = await TicketService.getTicketByMessageId(context.activity.id)
            const from  = context.activity.from.id;
            console.log("From User id: " + from)
            await sendTeamsReply(null,ticket, from)
            await sendTeamsChannelMessage(team.teamId, team.channelId,ticket)
            await context.sendActivity(MessageFactory.text("Ticket created successfully"));       
            return null;

        }  else if (submittedData.action === 'cancelTicket') {
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
            console.log("ChatId: "+ chatId)

            return {
                task: {
                  type: 'message',
                  value: `✅ Group created! [Open Chat](https://teams.microsoft.com/l/chat/0/0?chatId=${chatId})`
                }
            };    
            // return {
            //     task: {
            //       type: 'continue',
            //       value: {
            //         title: 'Group Created!',
            //         height: 200,
            //         width: 400,
            //         card: {
            //           type: 'AdaptiveCard',
            //           version: '1.4',
            //           body: [
            //             {
            //               type: 'TextBlock',
            //               text: '✅ Group created successfully!',
            //               weight: 'Bolder',
            //               wrap: true
            //             }
            //           ],
            //           actions: [
            //             {
            //               type: 'Action.OpenUrl',
            //               title: 'Open Chat',
            //               url: `https://teams.microsoft.com/l/chat/0/0?chatId=${chatId}`
            //             }
            //           ],
            //           $schema: 'http://adaptivecards.io/schemas/adaptive-card.json'
            //         }
            //       }
            //     }
            //   };              
        }
    }

    // Utility to set size and title of task module
    setTaskInfo(taskInfo, uiSettings) {
        taskInfo.height = uiSettings.height;
        taskInfo.width = uiSettings.width;
        taskInfo.title = uiSettings.title;
    }

    createTicketCard(ticket) {
        console.log(ticket)
        const card = {
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                        version: "1.5",
                        body: [
                            {
                                type: "TextBlock",
                                text: "Ticket Created",
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
                                title: "Initiate conversation",
                                data: {
                                  msteams: {
                                    type: "task/fetch"
                                  },
                                  action: "initiateConversation",
                                  ticketId: ticket.id,
                                  data: 'conversation'
                                }
                            }
                        ]
                    }
                }
        return card;
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
module.exports.EchoBot = EchoBot;
