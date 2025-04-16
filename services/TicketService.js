const { Ticket } = require('../models');
const db = require('../models'); // or the correct path to index.js
const Team = db.Team;


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

    async updateTicket(ticketId, updateData) {
        try {
            const ticket = await Ticket.findOne({ where: { id: ticketId } });

            if (!ticket) {
                throw new Error(`Ticket with ID ${ticketId} not found`);
            }

            ticket.title = updateData.title || ticket.title;
            ticket.body = updateData.body || ticket.body;
            ticket.dept = updateData.dept || ticket.dept;
            ticket.messageId = updateData.messageId || ticket.messageId;
            ticket.conversationId = updateData.conversationId || ticket.conversationId;

            await ticket.save();
            return ticket;
        } catch (error) {
            console.error('Error updating ticket:', error.message);
            throw error;
        }
    }

    async getTicketByMessageId(messageId) {
        return await Ticket.findOne({ where: { messageId } });
    }
    
    async getTeamByDeptName(department){
        return await Team.findOne({ where: { department }})
    }
}

module.exports = new TicketService();
