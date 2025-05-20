const axios = require("axios");
const UserRepository = require("../repository/UserRepository");
const TicketRepository = require("../repository/TicketRepository");

class GroupChatService {
    async initiateGroupChat(emails, ticketId) {

        const userRecords = await Promise.all(
            emails.map(email => UserRepository.findByEmail(email))
        );
        const members = userRecords.map( user => (
            {
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${user.teamsObjectId}`
            }));       
            console.log(JSON.stringify(members));     

        const chatResponse = await axios.post(
            "https://graph.microsoft.com/v1.0/chats",
            { chatType: "group", members },
            {
                headers: {
                    Authorization: `Bearer ${process.env.AccessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const chatId = chatResponse.data.id;

        const botPayload = {
            "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/174915f7-e12a-4e03-a3e9-f86bc337ff38",
            "consentedPermissionSet": {
                "resourceSpecificPermissions": [
                    {
                        "permissionValue": "ChatMessage.Read.Chat",
                        "permissionType": "Application"
                    }
                ]
            }
        };
        await axios.post(
            `https://graph.microsoft.com/v1.0/chats/${chatId}/installedApps`,
            botPayload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.AccessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("Bot installed successfully");

        await TicketRepository.updateTicket(ticketId, {
            privateChannelConversationId: chatId
        });
        return { status: 200 };
    }

    async postReply(message, conversationId, aadObjectId) {
        console.log("Before saving conversation for group chat");
        const ticket = await TicketRepository.findByPrivateChannelConversationId(conversationId);
        const user = await UserRepository.findByTeamsObjectId(aadObjectId);
        console.log("TicketId: " + ticket.id)
        await axios.post(`${process.env.BackEndBaseUrl}/ticket/${ticket.id}/reply`, {
            message: message,
            email: user.email
        }, { headers: { 'Content-Type': 'application/json' } });
        console.log("After saving conversation for group chat");
    }
}




module.exports = new GroupChatService();