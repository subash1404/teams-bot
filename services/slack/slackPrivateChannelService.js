const axios = require("axios");
const ticketRepository = require("../../repository/TicketRepository");
const userRepository = require("../../repository/UserRepository");
const blockService = require("./blockService");
const jsonParserService = require("./jsonParserService");
const outgoingService = require("./outgoingService");

async function createPrivateChannel(ticketId, userId) {
  try {
    const ticket = await ticketRepository.findById(ticketId);
    if (ticket.privateChannelId) {
      console.log("Already a private channel Created for this ticket");
    }
    const ticketInfo = await axios.get(
      `http://localhost:8081/tickets/${ticketId}`
    );

    const requester = await userRepository.findByEmail(ticketInfo.data.email);
    let technician = null;
    const channelMembers = [];
    channelMembers.push(requester.userId);
    channelMembers.push(userId);
    if (ticketInfo.data.technician) {
      technician = await userRepository.findByEmail(ticketInfo.data.technician);
      if(technician.userId != userId) {
        channelMembers.push(technician.userId);
      }
    }
    const channelName = `ticket-${ticketId}`;
    const channelId = await outgoingService.createPrivateChannel(channelName);
    if (channelId) {
      await outgoingService.addUsersToPrivateChannel(channelId, channelMembers);
      await outgoingService.addBotToPrivateChannel(channelId);
      ticket.privateChannelId = channelId;
      await ticketRepository.saveTicket(ticket);
      const blocks = await blockService.getTicketInfoBlock(
        ticketInfo,
        technician?.name ?? "Unassigned"
      );
      const response = await outgoingService.postBlockMessage(
        channelId,
        blocks,
        null,
        process.env.BOT_ACCESS_TOKEN
      );
      const privateChannelBlockConversationId =
        await jsonParserService.extractThreadTs(response);
      ticket.privateChannelBlockConversationId =
        privateChannelBlockConversationId;
      ticketRepository.saveTicket(ticket);
    } else {
      console.error(`Failed to create private channel for ticket ${ticketId}`);
    }
  } catch (err) {
    console.error("Error in Creating Private Channel: ", err);
  }
}

module.exports = { createPrivateChannel };
