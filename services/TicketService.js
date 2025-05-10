const axios = require('axios');
const UserRepository = require('../repository/UserRepository');

class TicketService {
    async saveTicket(aadObjectId, description) {
        console.log("AadObjectId: " + aadObjectId);
        console.log("Description: " + description);
        console.log("going to call ticket api");
        const user = await UserRepository.findByTeamsObjectId(aadObjectId);
        const ticketResponse = await axios.post(`${process.env.BackEndBaseUrl}/create-ticket`, {
            client: "Subash",
            subject: "Sample Subject",
            description: description,
            status: "TODO",
            provider: "TEAMS",
            email: user.email
        }, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        console.log("Afer call");
        return ticketResponse.data;
    }
}
 module.exports = new TicketService();