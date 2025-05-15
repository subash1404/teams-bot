const { Ticket } = require('../models');

class TicketRepository {
    async saveTicket(ticketData) {
        return await Ticket.create(ticketData)
    }

    async findByTicketId(ticketId) {
        return await Ticket.findOne({ where: { ticketId } });
    }

    async findByRequesterChannelConversationId(requestChannelConversationId) {
        return await Ticket.findOne({ where: { requestChannelConversationId } })
    }

    async findByTechChannelConversationId(techChannelConversationId) {
        return await Ticket.findOne({ where: { techChannelConversationId } })
    }

    async findByPrivateChannelConversationId(privateChannelConversationId) {
        return await Ticket.findOne({ where: { privateChannelConversationId } })
    }

    async updateTicket(ticketId, updateData) {
        const ticket = await Ticket.findOne({ where: { ticketId } });

        if (!ticket) {
            throw new Error(`Ticket with ID ${ticketId} not found`);
        }

        ticket.requestChannelConversationId = updateData.requestChannelConversationId || ticket.requestChannelConversationId;
        ticket.techChannelConversationId = updateData.techChannelConversationId || ticket.techChannelConversationId;
        ticket.privateChannelConversationId = updateData.privateChannelConversationId || ticket.privateChannelConversationId;

        await ticket.save();
        return ticket;
    }

}

module.exports = new TicketRepository();