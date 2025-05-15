const TicketRepository = require("../repository/TicketRepository");
const UserRepository = require("../repository/UserRepository");
const MessageService = require("../services/MessageService")
const CardService = require("../services/CardService");
class DMService {
    async handleDMMessage(context) {
        const message = context.activity.text.trim().toLowerCase();
        if (message.includes("view ticket")) {
            const parts = message.split("view ticket");
            const ticketId = parts.length > 1 ? parts[1].trim() : null;
            if (ticketId) {
                const ticket = await TicketRepository.findByTicketId(ticketId);
                if (ticket) {
                    const cardJson = await CardService.buildRequesterTicketCard(ticketId);
                    await MessageService.sendToUser(context.activity.conversation.id, cardJson, context.activity.from.id);
                } else {
                    await context.sendActivity("Ticket not found.");
                }
            } else {
                await context.sendActivity("Please provide a ticket ID.");
            }
        } else if (message === "my tickets") {
            const user = await UserRepository.findByTeamsObjectId(context.activity.from.aadObjectId);
            const tickets = (await axios.get(`${process.env.BackEndBaseUrl}/tickets?email=${user.email}`)).data;
            console.log("Tickets: " + JSON.stringify(tickets));
            if (tickets.length > 0) {
                for (const ticket of tickets) {
                    console.log("TicketId: " + ticket.id)
                    const card = await CardService.buildRequesterTicketCard(ticket.id);
                    await MessageService.sendToUser(context.activity.conversation.id, card, context.activity.from.id);
                }
            } else {
                await context.sendActivity("No tickets found.");
            }
        }
    }
}

module.exports = new DMService();