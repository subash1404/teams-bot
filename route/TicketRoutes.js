const router = require('restify-router').Router;
const ticketController = require('../controller/TicketController');

const apiRouter = new router();

apiRouter.post('/sendReply', ticketController.syncReply);
apiRouter.post('/updateTicket', ticketController.updateTicket);
apiRouter.post('/initiate-conversation', ticketController.initiateConversation);
apiRouter.post('/initiate-approval', ticketController.initiateApproval);
apiRouter.post('/messages', ticketController.handleIncomingMessage);

module.exports = {
    applyRoutes: (server, prefix) => apiRouter.applyRoutes(server, prefix),
};