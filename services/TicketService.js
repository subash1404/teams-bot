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
                console.log(`⚠️ Ticket with Message ID "${ticketData.requestChannelConversationId}" already exists.`);
            } else {
                console.error('❌ Error saving ticket:', error);
            }
        }
    }

    async findByTicketId(ticketId) {
        try {
            const ticket = await Ticket.findOne({ where: {ticketId} });
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


    async updateTechChannelConversationId(ticketId, newAgentConversationId) {
        try {
          const [updatedRows] = await Ticket.update(
            { techChannelConversationId: newAgentConversationId },
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

      // TODO: have a look at fields
      async updateTicket(ticketId, updateData) {
        try {
            const ticket = await Ticket.findOne({ where: { ticketId } });
            
            if (!ticket) {
                throw new Error(`Ticket with ID ${ticketId} not found`);
            }

            ticket.requestChannelConversationId = updateData.requestChannelConversationId || ticket.requestChannelConversationId;
            ticket.techChannelConversationId = updateData.techChannelConversationId || ticket.techChannelConversationId;
            ticket.privateChannelConversationId = updateData.privateChannelConversationId || ticket.privateChannelConversationId;

            await ticket.save();
            return ticket;
        } catch (error) {
            console.error('Error updating ticket:', error.message);
            throw error;
        }
    }
    
    async updateUserIdByTeamsObjectId(teamsObjectId, userId) {
        try {
            const user = await User.findOne({ where: { teamsObjectId } });
            if (!user) {
                throw new Error(`User with teamsObjectId ${teamsObjectId} not found`);
            }
            user.userId = userId;
            await user.save();
            console.log(`✅ User ID updated for teamsObjectId ${teamsObjectId}`);
            return user;
        }
        catch (error) {
            console.error('Error updating user ID:', error.message);
            throw error;
        }
    }
    
    async findEmailByTeamsObjectId(teamsObjectId) {
        try {
            const user  = await User.findOne({ where: { teamsObjectId } });
            if (!user) {
                throw new Error(`User with teamsObjectId ${teamsObjectId} not found`);
            }
            return user.email;
        }
        catch (error) {
            console.error('Error finding user:', error.message);
            throw error;
        }
    }

    async findTeamsObjectIdByEmail(email) {
        try {
            const user = await User.findOne({ where: { email } });
            if (!user) {
                throw new Error(`User with email ${email} not found`);
            }
            console.log("User teamsObjectId: ", user.teamsObjectId);
            return user.teamsObjectId;
        }
        catch (error) {
            console.error('Error finding user:', error.message);
            throw error;
        }
    }


    async assignTechnicianToTicket(id, technicianId) {
        const ticket = await Ticket.findOne({ where: { ticketId } });
        if (!ticket) throw new Error("Ticket not found");
        ticket.technicianId = technicianId;
        await ticket.save();
    }

    // incoming case - reply message from helpdesk message, ticketId, aadObjectId
    // incoming case - update ticket dto, ticketId
    // incoming case - assign technician -> ticketId, aadObjectId, assignedBy(maybe)


    async getTeamByDeptName(department){
        return await Team.findOne({ where: { department }});
    }

    // async getAllUsers(){
    //     return await User.findAll({
    //         attributes: ['displayName', 'id']
    //       });
    // }

    async findByRequesterChannelConversationId(requestChannelConversationId) {
        return await Ticket.findOne( {where: { requestChannelConversationId }} )
    }

    async findByAgentChannelConversationId(techChannelConversationId) {
        return await Ticket.findOne( {where: { techChannelConversationId }} )
    }

    async findByPrivateChannelConversationId(privateChannelConversationId) {
        return await Ticket.findOne( {where: { privateChannelConversationId }} )
    }

    async findChannelById(channelId) {
        return await Channel.findOne({ where: { channelId } });
    }
}

module.exports = new TicketService();
