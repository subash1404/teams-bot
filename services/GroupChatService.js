const axios = require("axios");
const UserRepository = require("../repository/UserRepository");
const TicketRepository = require("../repository/TicketRepository");

class GroupChatService {
    async initiateGroupChat(requesterEmail, technicianEmail, ticketId) {

        const requester = await UserRepository.findByEmail(requesterEmail);
        const technician = await UserRepository.findByEmail(technicianEmail);
        const members = [
            {
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${requester.teamsObjectId}`
            },
            {
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${technician.teamsObjectId}`
            }
        ];

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
        console.log("TicketId: " + ticket.ticketId)
        await axios.post(`${process.env.BackEndBaseUrl}/ticket/${ticket.ticketId}/reply`, {
            message: message,
            email: user.email
        }, { headers: { 'Content-Type': 'application/json' } });
        console.log("After saving conversation for group chat");
    }
}




module.exports = new GroupChatService();