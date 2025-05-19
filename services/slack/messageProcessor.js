const { Mutex } = require("async-mutex");
const processedMessages = new Map();
const channelLocks = new Map();
const imChannelPublicToPrivateRepository = require("../../repository/IMChannelPublicToPrivateRepository");
const ticketRepository = require("../../repository/TicketRepository");
const messageHandler = require("./messageHandler");

const processPayload = async (payload, res) => {
  try {
    const teamId = payload.team_id;
    const eventNode = payload.event;

    if (eventNode && eventNode.type === "message") {
      if (eventNode.bot_id) {
        return;
      }

      const userId = eventNode.user;
      const channelId = eventNode.channel;
      const messageText = eventNode.text;
      const messageTs = eventNode.ts;
      const eventTs = eventNode.event_ts;
      const threadTs = eventNode.thread_ts || null;
      const messageUniqueId = `${channelId}:${messageTs}`;

      if (isMessageAlreadyProcessed(messageUniqueId)) {
        console.log(`Duplicate message detected: ${messageUniqueId}`);
        return;
      }

      const lock = getLockForChannel(channelId);
      await lock.runExclusive(async () => {
        if (isMessageAlreadyProcessed(messageUniqueId)) {
          console.log(`Duplicate caught in sync block: ${messageUniqueId}`);
          return;
        }

        markMessageAsProcessed(messageUniqueId);

        const imChannel =
          await imChannelPublicToPrivateRepository.findByPrivateChannelId(
            channelId
          );
        let ticket = null;
        if (imChannel && threadTs) {
          ticket = await ticketRepository.findByTechChannelConversationId(
            threadTs
          );
        }

        if (imChannel && ticket) {
          await messageHandler.handleTechnicianChannelMessage(userId, ticket, imChannel, messageText, eventNode.files)
          return;
        }
        const ticketByChannel = await ticketRepository.findByPrivateChannelId(
          channelId
        );

        if (ticketByChannel) {
          await messageHandler.handlePrivateChannelMessage(
            userId,
            messageText,
            ticketByChannel
          );
        } else if (threadTs) {
          await messageHandler.handleRequesterChannelMessage(
            userId,
            channelId,
            messageText,
            threadTs,
            teamId,
            eventNode.files
          );
        } else {
          await messageHandler.handleNewMessage(
            userId,
            channelId,
            messageText,
            eventTs,
            eventNode.files
          );
        }
      });
    }
  } catch (e) {
    console.error("Error processing Slack event:", e);
  }
};

function getLockForChannel(channelId) {
  if (!channelLocks.has(channelId)) {
    channelLocks.set(channelId, new Mutex());
  }
  return channelLocks.get(channelId);
}

function isMessageAlreadyProcessed(id) {
  return processedMessages.has(id);
}

function markMessageAsProcessed(id) {
  processedMessages.set(id, true);
}

module.exports = { processPayload };
