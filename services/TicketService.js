const { where } = require('sequelize');
const { Ticket } = require('../models');
const { Channel } = require('../models')
const db = require('../models'); // or the correct path to index.js
const Team = db.Team;
const User = db.User;


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

    async findById(ticketId) {
        try {
            const ticket = await Ticket.findOne({ where: { id: ticketId } });
            if (!ticket) {
                throw new Error(`Ticket with ID ${ticketId} not found`);
            }
            return ticket;
        } catch (error) {
            console.error('Error finding ticket:', error.message);
            throw error;
        }
    }
    async findTechnicianByemail(email) {
        try {
            const user = await User.findOne({ where: { email } });
            if (!user) {
                throw new Error(`User with email ${email} not found`);
            }
            return user;
        } catch (error) {
            console.error('Error finding user:', error.message);
            throw error;
        }
    }


    async updateAgentConversationId(ticketId, newAgentConversationId) {
        try {
          const [updatedRows] = await Ticket.update(
            { agentConversationId: newAgentConversationId },
            { where: { id: ticketId } }
          );
                
          if (updatedRows === 0) {
            throw new Error(`No ticket found with ID: ${ticketId}`);
          }
      
          console.log(`✅ agentConversationId updated for ticket ${ticketId}`);
          return true;
        } catch (error) {
          console.error(`❌ Failed to update agentConversationId: ${error.message}`);
          return false;
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

    async assignTechnicianToTicket(id, technicianId) {
        const ticket = await Ticket.findOne({ where: { id } });
        if (!ticket) throw new Error("Ticket not found");
        ticket.technicianId = technicianId;
        await ticket.save();
    }

    // incoming case - reply message from helpdesk message, ticketId, aadObjectId
    // incoming case - update ticket dto, ticketId
    // incoming case - assign technician -> ticketId, aadObjectId, assignedBy(maybe)

    // 
    async getTicketByMessageId(messageId) {
        return await Ticket.findOne({ where: { messageId } });
    }

    async getTicketByTicketId(id) {
        return await Ticket.findOne({ where: { id } });
    }

    async getTeamByDeptName(department){
        return await Team.findOne({ where: { department }});
    }

    async getAllUsers(){
        return await User.findAll({
            attributes: ['displayName', 'id']
          });
    }

    async findByRequesterConversationId(requesterConversationId) {
        return await Ticket.findOne( {where: { requesterConversationId }} )

    }

    async findByAgentConversationId(agentConversationId) {
        return await Ticket.findOne( {where: { agentConversationId }} )
    }

    async findChannelById(channelId) {
        return await Channel.findOne({ where: { id: channelId } });
    }
}

module.exports = new TicketService();
