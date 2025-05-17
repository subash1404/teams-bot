const axios = require("axios");
const ticketRepository = require("../../repository/TicketRepository");
const userRepository = require("../../repository/UserRepository");
const blockService = require("./blockService");
const jsonParserService = require("./jsonParserService");
const outgoingService = require("./outgoingService");

async function createPrivateChannel(ticketId) {
  try {
    const ticket = await ticketRepository.findById(ticketId);
    if(ticket.privateChannelId) {
      console.log("Already a private channel Created for this ticket");
      
    }
    const ticketInfo = await axios.get(
      `http://localhost:8081/tickets/${ticketId}`
    );
    const technician = await userRepository.findByEmail(
      ticketInfo.data.technician
    );
    if (!technician) {
      console.warn("Technician Not found for the ticket: ", ticketId);
      return;
    }
    const channelName = `ticket-${ticketId}`;
    const channelId = await createChannel(channelName);
    if (channelId) {
      const requester = await userRepository.findByEmail(ticketInfo.data.email);
      await addUsersToChannel(channelId, [requester.userId, technician.userId]);
      await addBotToChannel(channelId);
      ticket.privateChannelId = channelId;
      await ticketRepository.saveTicket(ticket);
      const blocks = await blockService.getTicketInfoBlock(ticketInfo, technician.name);
      const response = await outgoingService.postBlockMessage(
        channelId,
        blocks,
        null,
        process.env.BOT_ACCESS_TOKEN
      );
      const privateChannelBlockConversationId = await jsonParserService.extractThreadTs(response);
      ticket.privateChannelBlockConversationId = privateChannelBlockConversationId;
      ticketRepository.saveTicket(ticket);
    } else {
      console.error(`Failed to create private channel for ticket ${ticketId}`);
    }
  } catch (err) {
    console.error("Error in Creating Private Channel: ", err);
  }
}

async function createChannel(channelName) {
  try {
    const response = await axios.post(
      "https://slack.com/api/conversations.create",
      {
        name: channelName,
        is_private: true,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Channel creation response:", response.data);
    if (response.data.ok) {
      return response.data.channel.id;
    } else {
      console.error("Channel creation failed:", response.data.error);
      return null;
    }
  } catch (err) {
    console.error("Exception creating channel:", err);
    return null;
  }
}

async function addUsersToChannel(channelId, userIds) {
  try {
    const response = await axios.post(
      "https://slack.com/api/conversations.invite",
      {
        channel: channelId,
        users: userIds.join(","),
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Invite users response:", response.data);
    if (!response.data.ok) {
      console.error("Failed to invite users:", response.data.error);
    }
  } catch (err) {
    console.error("Error inviting users:", err);
  }
}

async function addBotToChannel(channelId) {
  try {
    const response = await axios.post(
      "https://slack.com/api/conversations.invite",
      {
        channel: channelId,
        users: process.env.BOT_USER_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Invite bot response:", response.data);
  } catch (err) {
    console.error("Error inviting bot:", err);
  }
}

module.exports = { createPrivateChannel };
