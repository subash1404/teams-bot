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

    async getTicketByMessageId(messageId) {
        return await Ticket.findOne({ where: { messageId } });
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
