const router = require("restify-router").Router;
const ticketController = require("../controller/TicketController");

const apiRouter = new router();

apiRouter.post("/api/sendReply", ticketController.syncReply);
apiRouter.post("/api/updateTicket", ticketController.updateTicket);
apiRouter.post("/api/initiate-conversation", ticketController.initiateConversation);
apiRouter.post("/api/initiate-approval", ticketController.initiateApproval);
apiRouter.post("/api/messages", ticketController.handleIncomingMessage);
apiRouter.post("/slack/receive", ticketController.handleSlackMessage);
apiRouter.post("/slack/interaction", ticketController.handleSlackInteraction);
apiRouter.post("/slack/command/receive", ticketController.handleSlackCommands);
apiRouter.post("/initiateConversation", ticketController.initiateSlackConverstation);

module.exports = {
  applyRoutes: (server, prefix) => apiRouter.applyRoutes(server, prefix),
};
