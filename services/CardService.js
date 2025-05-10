const axios = require("axios");
class CardService {
    async buildTechnicianTicketCard(ticketId, attachments) {
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

async buildRequesterTicketCard(ticketId) {
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

async buildInitiateApprovalCard(ticketId, message, status = null) {
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

async buildTechnicianAssignmentCard(ticketId) {
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
}

module.exports = new CardService();