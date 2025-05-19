const ticketRepository = require("../../repository/TicketRepository");
const userRepository = require("../../repository/UserRepository");
const outgoingService = require("./outgoingService");
const agentChannelService = require("./agentChannelService");
const blockService = require("./blockService");
const jsonParserService = require("./jsonParserService");
const axios = require("axios");
const attachmentHandlerService = require("./attachmentHandlerService");

async function handlePrivateChannelMessage(userId, messageText, ticket) {
  try {
    const user = await userRepository.findByUserId(userId);
    const payload = {
      email: user.email,
      message: messageText,
    };
    await axios.post(
      `http://localhost:8081/ticket/${ticket.id}/reply`,
      payload
    );
  } catch (error) {
    console.error("Error handling private channel message:", error);
  }
}

async function handleTechnicianChannelMessage(
  userId,
  ticket,
  imChannel,
  messageText,
  files
) {
  console.log("Ticket found via im channel");
  const user = await userRepository.findByUserId(userId);
  const payload = {
    email: user.email,
    message: messageText,
  };
  await axios.post(`http://localhost:8081/ticket/${ticket.id}/reply`, payload);
  const response = await outgoingService.postMessage(
    imChannel.publicChannelId,
    userId,
    messageText,
    ticket.requestChannelConversationId,
    process.env.BOT_ACCESS_TOKEN
  );

  if(files) {
    const threadTs = await jsonParserService.extractThreadTs(response);
    await attachmentHandlerService.handleAttachments(files, threadTs, imChannel.publicChannelId);
  }
}

async function handleRequesterChannelMessage(
  userId,
  channelId,
  messageText,
  threadTs,
  teamId,
  files
) {
  console.log(
    `Message received - userId: ${userId}, channelId: ${channelId}, teamId: ${teamId}, message: ${messageText}`
  );

  const ticket = await ticketRepository.findByRequesterChannelConversationId(
    threadTs,
    "SLACK"
  );

  if (ticket) {
    console.log(`Found ticket id: ${ticket.id}`);

    const user = await userRepository.findByUserId(userId);
    const payload = {
      email: user.email,
      message: messageText,
    };
    await axios.post(
      `http://localhost:8081/ticket/${ticket.id}/reply`,
      payload
    );

    await agentChannelService.sendMessageToAgentChannel(
      ticket,
      userId,
      messageText,
      null,
      files
    );
  } else {
    console.log(
      `No matching ticket found for channelId: ${channelId} or threadTs: ${threadTs}`
    );
  }
}

async function handleNewMessage(
  userId,
  channelId,
  messageText,
  eventTs,
  files
) {
  const user = await userRepository.findByUserId(userId);

  const ticketRequest = {
    subject: messageText,
    provider: "SLACK",
    email: user.email,
  };

  const ticketInfo = await axios.post(
    `http://localhost:8081/create-ticket`,
    ticketRequest
  );
  console.log("Ticket", ticketInfo.data);
  const ticket = await ticketRepository.saveTicket({
    id: ticketInfo.data.id,
    channelId: channelId,
    requestChannelConversationId: eventTs,
  });
  const requesterChannelBlocks = await blockService.getPublicChannelBlock(
    ticketInfo,
    null
  );
  const response = await outgoingService.postBlockMessage(
    channelId,
    requesterChannelBlocks,
    eventTs,
    process.env.BOT_ACCESS_TOKEN
  );
  const requesterChannelBlockConversationId =
    await jsonParserService.extractThreadTs(response);
  if (files) {
    await attachmentHandlerService.handleAttachments(files, requesterChannelBlockConversationId, channelId);
  }
  ticket.requesterChannelBlockConversationId =
    requesterChannelBlockConversationId;
  ticketRepository.saveTicket(ticket);
  await agentChannelService.sendMessageToAgentChannel(
    ticket,
    userId,
    messageText,
    ticketInfo,
    files
  );
}

module.exports = {
  handlePrivateChannelMessage,
  handleRequesterChannelMessage,
  handleNewMessage,
  handleTechnicianChannelMessage,
};
