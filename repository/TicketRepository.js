const Ticket = require('../models/Ticket');
const { Op } = require('sequelize');
class TicketRepository {
    async saveTicket(ticketData) {
        return await Ticket.create(ticketData)
    }

    async findById(id) {
        return await Ticket.findOne({ where: { id } });
    }

    async findByRequesterChannelConversationId(requestChannelConversationId, source) {
        if (source === "TEAMS") {
            return await Ticket.findOne({ where: { requestChannelConversationId } })
        }
        const leftPart = requestChannelConversationId.split(".")[0];
        return await Ticket.findOne({
            where: {
                requestChannelConversationId: {
                    [Op.like]: `${leftPart}.%`,
                }
            },
        });
    }

    async findByTechChannelConversationId(techChannelConversationId, source) {
        if (source === "TEAMS") {
            return await Ticket.findOne({ where: { techChannelConversationId } })
        }
        const leftPart = techChannelConversationId.split(".")[0];
        return await Ticket.findOne({
            where: {
                technicianChannelConversationId: {
                    [Op.like]: `${leftPart}%`,
                },
            },
        });
    }

    async findByPrivateChannelConversationId(privateChannelConversationId) {
        return await Ticket.findOne({ where: { privateChannelConversationId } })
    }

    async findByPrivateChannelId(privateChannelId) {
        return await Ticket.findOne({ where: { privateChannelId } })
    }

    async updateTicket(id, updateData) {
        const ticket = await Ticket.findOne({ where: { id } });

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