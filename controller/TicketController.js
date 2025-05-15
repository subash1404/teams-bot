const { TicketBot } = require('../bot');
const { adapter } = require('../adapter');
const MessageService = require('../services/MessageService');
const { initiateGroupChat } = require('../services/GroupChatService');
const UserRepository = require('../repository/UserRepository');
const TicketRepository = require('../repository/TicketRepository');

async function handleIncomingMessage(req, res) {
    console.log("Inside onMessage")
    const myBot = new TicketBot();
    await adapter.process(req, res, (context) => myBot.run(context));
}

async function syncReply(req, res) {
    const { ticketId, message, email } = req.body;
    try {
        const ticket = await TicketRepository.findByTicketId(ticketId);
        await MessageService.sendTicketReply(ticket.requestChannelConversationId, ticketId, message, email);
        await MessageService.sendTicketReply(ticket.techChannelConversationId, ticketId, message, email);
        res.send(200, { success: true, message: 'Reply sent successfully!' });
    } catch (error) {
        res.send(500, { error: 'Failed to send reply.', details: error.message });
    }
}

// TODO: move this to service layer and update properly
async function updateTicket(req, res) {
    const { ticketId, subject, email } = req.body;
    try {
        const ticket = await TicketRepository.findByTicketId(ticketId);
        ticket.body = subject || ticket.subject;
        const technician = await UserRepository.findByEmail(email);
        ticket.technicianId = technician.id;
        await ticket.save();
        await technician.save();
        res.send(200, { success: true, message: 'Ticket updated successfully!' });
    } catch (error) {
        res.send(500, { error: 'Failed to update ticket.', details: error.message });
    }
}

async function initiateConversation(req, res) {
    const { technicianEmail, requesterEmail, ticketId } = req.body;
    try {
        await initiateGroupChat(requesterEmail, technicianEmail, ticketId);
        res.send(200, { success: true, message: 'Group chat created' });
    } catch (error) {
        res.send(500, { error: 'Failed to create chat.', details: error.message });
    }
}

async function initiateApproval(req, res) {
    const { ticketId, message, email } = req.body;
    try {
        await MessageService.sendApprovalCard(ticketId, message, email);
        res.send(200, { success: true, message: 'Approval card sent successfully!' });
    } catch (error) {
        res.send(500, { error: 'Failed to send approval.', details: error.message });
    }
}

module.exports = { syncReply, updateTicket, initiateConversation, initiateApproval, handleIncomingMessage };
