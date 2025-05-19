const imChannelPublicToPrivateRepository = require("../../repository/IMChannelPublicToPrivateRepository");
const outgoingService = require("./outgoingService");
const jsonParserService = require("./jsonParserService");
const userRepository = require("../../repository/UserRepository");
const mirroredMessages = new Map();
const blockService = require('./blockService');
const attachmentHandlerService = require('./attachmentHandlerService');

async function sendMessageToAgentChannel(ticket, userId, messageText, ticketInfo, files) {
  try {
    const imChannelPublicToPrivate =
      await imChannelPublicToPrivateRepository.findByPublicChannelId(
        ticket.channelId
      );
    const messageUniqueId = `${ticket._id}:${userId}:${hashCode(messageText)}`;
    if (mirroredMessages.has(messageUniqueId)) {
      console.log("Message already mirrored:", messageUniqueId);
      return;
    }
    mirroredMessages.set(messageUniqueId, true);
    const ticketThreadTs = await getOrCreateTicketThreadInChannel(
      ticket,
      imChannelPublicToPrivate.privateChannelId,
      ticketInfo
    );
    const response = await outgoingService.postMessage(
      imChannelPublicToPrivate.privateChannelId,
      userId,
      messageText,
      ticketThreadTs,
      process.env.BOT_ACCESS_TOKEN
    );

    if(files) {
      const threadTs = await jsonParserService.extractThreadTs(response);
      await attachmentHandlerService.handleAttachments(files, threadTs, imChannelPublicToPrivate.privateChannelId);
    }
    console.log(
      `Response in Agent channel : ${response.ts} Message : ${messageText}`
    );
    if (response && response.data && response.data.ts) {
      console.log(
        `In Agent channel , ${response.data.ts}, message : ${messageText}`
      );
    }
  } catch (err) {
    console.error("Error mirroring message:", err.message);
  }
}

async function getOrCreateTicketThreadInChannel(ticket, channelId, ticketInfo) {
  if (ticket.techChannelConversationId)
    return ticket.techChannelConversationId;
  const requester = await userRepository.findByEmail(ticketInfo.data.email);
  const technicianChannelCard = await blockService.getTicketChannelBlock(ticket, ticketInfo, requester.name, null, channelId);
  const response = await outgoingService.postBlockMessage(
    channelId,
    technicianChannelCard,
    null,
    process.env.BOT_ACCESS_TOKEN
  );
  console.log("Response ", response.data)
  const threadTs = await jsonParserService.extractThreadTs(response.data);

  if (threadTs) {
    ticket.techChannelConversationId = threadTs;
    await ticket.save();
    console.log(ticket);
  }
  return threadTs;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

module.exports = {
  sendMessageToAgentChannel,
};
