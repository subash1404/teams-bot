const { TicketBot } = require("../bot");
const { adapter } = require("../adapter");
const MessageService = require("../services/MessageService");
const { initiateGroupChat } = require("../services/GroupChatService");
const UserRepository = require("../repository/UserRepository");
const TicketRepository = require("../repository/TicketRepository");
const messageProcessor = require("../services/slack/messageProcessor");
const interactionHandler = require("../services/slack/interactionHandler");
const commandHandlerService = require("../services/slack/commandHandlerService");
const slackService = require("../services/slack/slackService");
const slackPrivateChannelService = require("../services/slack/slackPrivateChannelService");

async function handleIncomingMessage(req, res) {
    const myBot = new TicketBot();
    await adapter.process(req, res, (context) => myBot.run(context));
    console.log("Inside onMessage here");
}

async function syncReply(req, res) {
  const { ticketId, message, email, provider } = req.body;

  if (provider === "SLACK") {
    await slackService.replyMessage(ticketId, message, email);
    res.send(200, { success: true });
    return;
  }
  try {
    const ticket = await TicketRepository.findById(ticketId);
    await MessageService.sendTicketReply(
      ticket.requestChannelConversationId,
      ticketId,
      message,
      email
    );
    await MessageService.sendTicketReply(
      ticket.techChannelConversationId,
      ticketId,
      message,
      email
    );
    res.send(200, { success: true, message: "Reply sent successfully!" });
  } catch (error) {
    res.send(500, { error: "Failed to send reply.", details: error.message });
  }
}

// TODO: move this to service layer and update properly
async function updateTicket(req, res) {
  const { ticketId, subject, email } = req.body;
  try {
    const ticket = await TicketRepository.findById(ticketId);
    ticket.body = subject || ticket.subject;
    const technician = await UserRepository.findByEmail(email);
    ticket.technicianId = technician.id;
    await ticket.save();
    await technician.save();
    res.send(200, { success: true, message: "Ticket updated successfully!" });
  } catch (error) {
    res.send(500, {
      error: "Failed to update ticket.",
      details: error.message,
    });
  }
}

async function initiateSlackConverstation(req, res) {
  try {
    const { ticketId, requesterEmail, technicianEmail } = req.body;
    await slackPrivateChannelService.createPrivateChannel(
      ticketId,
      technicianEmail
    );
    res.send(200, { success: true });
  } catch (error) {
    console.error("Error in /initiateConversation:", error);
    res.send(500, { success: false, error: error.message });
  }
}

async function initiateConversation(req, res) {
  const { technicianEmail, requesterEmail, ticketId } = req.body;
  try {
    await initiateGroupChat(requesterEmail, technicianEmail, ticketId);
    res.send(200, { success: true, message: "Group chat created" });
  } catch (error) {
    res.send(500, { error: "Failed to create chat.", details: error.message });
  }
}

async function initiateApproval(req, res) {
  const { ticketId, message, email } = req.body;
  try {
    await MessageService.sendApprovalCard(ticketId, message, email);
    res.send(200, {
      success: true,
      message: "Approval card sent successfully!",
    });
  } catch (error) {
    res.send(500, {
      error: "Failed to send approval.",
      details: error.message,
    });
  }
}

async function handleSlackMessage(req, res) {
  try {
    const payload = req.body;
    console.log("Payload ", payload);

    if (payload.challenge) {
      res.send(200, payload.challenge);
    }

    res.send(200);
    messageProcessor.processPayload(payload, res);
  } catch (e) {
    console.error("Error processing Slack event:", e);
    res.send(500, "Internal Server Error");
  }
}

async function handleSlackInteraction(req, res) {
  try {
    const payloadNode = req.body.payload
      ? JSON.parse(req.body.payload)
      : req.body;

    console.log("Payload", payloadNode);
    interactionHandler.handleInteraction(payloadNode, res);
    res.send(200);
  } catch (err) {
    console.error("Error handling Slack interaction:", err);
    res.send(500, "Internal Server Error");
  }
}

async function handleSlackCommands(req, res) {
  commandHandlerService.handleCommands(req.body);
  res.send(200);
}

module.exports = {
  syncReply,
  updateTicket,
  initiateConversation,
  initiateApproval,
  handleIncomingMessage,
  handleSlackMessage,
  handleSlackInteraction,
  handleSlackCommands,
  initiateSlackConverstation
};
