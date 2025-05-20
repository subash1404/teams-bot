const axios = require("axios");
const outgoingService = require("./outgoingService");
const userRepository = require("../../repository/UserRepository");
const blockService = require("./blockService");
const ticketRepository = require("../../repository/TicketRepository");
const imChannelPublicToPrivateRepository = require("../../repository/IMChannelPublicToPrivateRepository");

async function replyMessage(ticketId, message, email) {
  const ticket = await ticketRepository.findById(ticketId);
  if (ticket === null) {
    console.log("Ticket not found");
    return;
  }
  let senderId = null;
  if (email) {
    const user = await userRepository.findByEmail(email);
    senderId = user.userId;
  }
  await outgoingService.postMessage(
    ticket.channelId,
    senderId,
    message,
    ticket.requestChannelConversationId,
    process.env.BOT_ACCESS_TOKEN
  );

  const imChannelPublicToPrivate = await imChannelPublicToPrivateRepository.findByPublicChannelId(ticket.channelId);

  await outgoingService.postMessage(
    imChannelPublicToPrivate.privateChannelId,
    senderId,
    message,
    ticket.techChannelConversationId,
    process.env.BOT_ACCESS_TOKEN
  );
}

async function openTakeActionCard(triggerId, ticketId) {
  const takeActionCardBlocks = await blockService.getTakeActionBlock(ticketId);
  await axios.post(
    "https://slack.com/api/views.open",
    { trigger_id: triggerId, view: takeActionCardBlocks },
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openInitiateApprovalRequestCard(triggerId, ticketId) {
  const ticketInfo = await axios.get(
    `http://localhost:8081/tickets/${ticketId}`
  );
  const ticket = await ticketRepository.findById(ticketId);
  const technician = await userRepository.findByEmail(
    ticketInfo.data.technician
  );
  const requester = await userRepository.findByEmail(ticketInfo.data.email);
  const initiateApprovalBlocks =
    await blockService.getInitiateApprovalRequestBlock(
      triggerId,
      ticketId,
      ticketInfo,
      requester.name,
      technician?.name ?? "Unassigned"
    );
  return await axios.post(
    "https://slack.com/api/views.push",
    initiateApprovalBlocks,
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openUpdateTicketCard(triggerId, ticketId) {
  const response = await axios.get(
    `http://localhost:8081/ticket/${ticketId}/fields`
  );

  const updateTicketBlocks = await blockService.getUpdateTicketBlock(
    triggerId,
    ticketId,
    response.data
  );
  return await axios.post(
    "https://slack.com/api/views.push",
    updateTicketBlocks,
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openTechnicianCard(triggerId, ticketId) {
  const response = await axios.get(
    `http://localhost:8081/technicians?source=SLACK`
  );
  console.log("Payload ", response.data);
  const technicianCardBlocks = await blockService.getTechnicianBlock(
    triggerId,
    ticketId,
    response.data
  );
  return await axios.post(
    "https://slack.com/api/views.push",
    technicianCardBlocks,
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openAssignTicketCard(triggerId, ticketId) {
  const assignTicketCardBlocks = await blockService.getAssignTicketBlock(
    ticketId
  );
  await axios.post(
    "https://slack.com/api/views.open",
    { trigger_id: triggerId, view: assignTicketCardBlocks },
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openAddNoteCard(triggerId, ticketId) {
  const noteBlock = await blockService.getAddNoteBlock(ticketId);

  try {
    const response = await axios.post(
      "https://slack.com/api/views.push",
      {
        trigger_id: triggerId,
        view: noteBlock,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Slack modal response:", response.data);
  } catch (err) {
    console.error(
      "Error opening Add Note modal:",
      err.response?.data || err.message
    );
  }
}

async function updateChannelCards(ticket, ticketInfo) {
  const requester = await userRepository.findByEmail(ticketInfo.data.email);
  let technician = null;
  if (ticketInfo.data.technician) {
    technician = await userRepository.findByEmail(ticketInfo.data.technician);
  }
  const technicianChannelTicketCardBlocks =
    await blockService.getTicketChannelBlock(
      ticket,
      ticketInfo,
      requester.name,
      technician?.name ?? "Unassigned"
    );
  const requesterChannelTicketCardBlocks =
    await blockService.getTicketInfoBlock(
      ticketInfo,
      technician?.name ?? "Unassigned"
    );
  const imChannelPublicToPrivate =
    await imChannelPublicToPrivateRepository.findByPublicChannelId(
      ticket.channelId
    );
  await outgoingService.updateBlocksMessage(
    imChannelPublicToPrivate.privateChannelId,
    ticket.techChannelConversationId,
    technicianChannelTicketCardBlocks,
    process.env.BOT_ACCESS_TOKEN
  );
  await outgoingService.updateBlocksMessage(
    ticket.channelId,
    ticket.requesterChannelBlockConversationId,
    requesterChannelTicketCardBlocks,
    process.env.BOT_ACCESS_TOKEN
  );
  if (ticket.privateChannelId) {
    const privateChannelCardBlocks = await blockService.getTicketInfoBlock(
      ticketInfo,
      technician?.name ?? "Unassigned"
    );
    await outgoingService.updateBlocksMessage(
      ticket.privateChannelId,
      ticket.privateChannelBlockConversationId,
      privateChannelCardBlocks,
      process.env.BOT_ACCESS_TOKEN
    );
  }
}

async function handleApproverAction(payload) {
  const value = JSON.parse(payload.actions[0].value);
  const ticketId = value.ticketId;
  const userId = payload.user.id;
  const actionId = payload.actions[0].action_id;

  if (actionId === "approve_ticket" || actionId === "reject_ticket") {
    const actionType =
      payload.actions[0].action_id === "approve_ticket"
        ? "Approved ✅"
        : "Rejected ❌";

    const updatedBlocks = [...payload.message.blocks];
    const actionBlockId = `ticket_action_${ticketId}`;
    const actionBlockIndex = updatedBlocks.findIndex(
      (block) => block.block_id === actionBlockId
    );
    if (actionBlockIndex !== -1) {
      updatedBlocks[actionBlockIndex] = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${actionType}*`,
        },
      };
    }

    await axios.post(
      "https://slack.com/api/chat.update",
      {
        channel: payload.channel.id,
        ts: payload.message.ts,
        blocks: updatedBlocks,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        },
      }
    );

    const ticket = await ticketRepository.findById(ticketId);
    const ticketInfo = await axios.get(
      `http://localhost:8081/tickets/${ticketId}`
    );

    let technician = "Unassigned";

    // Check if technician is present and not null/undefined
    if (ticketInfo.data.technician) {
      const technicianData = await userRepository.findByEmail(
        ticketInfo.data.technician
      );
      if (technicianData && technicianData.userId) {
        technician = `<@${technicianData.userId}>`;
      }
    }

    const requester = await userRepository.findByEmail(ticketInfo.data.email);

    const message = `✅ Ticket #${ticketId} has been *approved* by <@${userId}>.\n*Technician:* ${technician}\n*Requester:* <@${requester.userId}>`;

    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: ticket.channelId,
        thread_ts: ticket.requestChannelConversationId,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const imChannelPublicToPrivate =
      await imChannelPublicToPrivateRepository.findByPublicChannelId(
        ticket.channelId
      );

    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: imChannelPublicToPrivate.privateChannelId,
        thread_ts: ticket.techChannelConversationId,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } else if (actionId === "more_info") {
    await axios.post(
      "https://slack.com/api/views.open",
      {
        trigger_id: payload.trigger_id,
        view: {
          type: "modal",
          callback_id: "more_info_submit",
          private_metadata: JSON.stringify({
            ticketId,
          }),
          title: { type: "plain_text", text: "More Info" },
          submit: { type: "plain_text", text: "Submit" },
          close: { type: "plain_text", text: "Cancel" },
          blocks: [
            {
              type: "input",
              block_id: "info_block",
              label: { type: "plain_text", text: "Enter additional info" },
              element: {
                type: "plain_text_input",
                action_id: "info_input",
                multiline: true,
              },
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        },
      }
    );
  }
}

async function sendApproverNotification(ticketId, approvers, note) {
  const ticketInfo = await axios.get(
    `http://localhost:8081/tickets/${ticketId}`
  );

  const requester = await userRepository.findByEmail(ticketInfo.data.email);

  let technicianName = "Unassigned";
  if (ticketInfo.data.technician) {
    const technician = await userRepository.findByEmail(
      ticketInfo.data.technician
    );
    technicianName = technician.name;
  }

  for (let approver of approvers) {
    const initiateApprovalMessageBlock =
      await blockService.getInitiateApprovalMessageBlock(
        approver,
        ticketId,
        ticketInfo,
        note,
        requester.name,
        technicianName
      );
    await axios.post(
      "https://slack.com/api/chat.postMessage",
      initiateApprovalMessageBlock,
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  }
}

module.exports = {
  replyMessage,
  updateChannelCards,
  openAddNoteCard,
  openTakeActionCard,
  openAssignTicketCard,
  openTechnicianCard,
  openUpdateTicketCard,
  openInitiateApprovalRequestCard,
  sendApproverNotification,
  handleApproverAction,
};
