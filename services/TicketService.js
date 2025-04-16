const { Ticket } = require('../models');
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
}

module.exports = new TicketService();
