const { Ticket } = require('../models');

class TicketService {
    async saveTicket(ticketData) {
        try {
            const ticket = await Ticket.create(ticketData);
            console.log(`✅ Ticket saved with ID: ${ticket.id}`);
            return ticket;
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                console.log(`⚠️ Ticket with Message ID "${ticketData.messageId}" already exists.`);
            } else {
                console.error('❌ Error saving ticket:', error);
            }
        }
    }

    async getTicketByMessageId(messageId) {
        return await Ticket.findOne({ where: { messageId } });
    }
}

module.exports = new TicketService();
