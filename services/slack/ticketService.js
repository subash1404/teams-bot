const axios = require("axios");
const slackService = require("./slackService");
const ticketRepository = require("../../repository/TicketRepository");

async function updateTicket(ticketId, email, priority, status) {
  try {
    const updateTicketRequestModel = {
      ticketId: ticketId,
      technician: email,
      priority: priority,
      status: status,
    };
    const ticketInfo = await axios.post(
      "http://localhost:8081/update-ticket",
      updateTicketRequestModel
    );
    const ticket = await ticketRepository.findById(ticketId);
    await slackService.updateChannelCards(ticket, ticketInfo);
  } catch (err) {
    console.log(`Error in Updating Ticket ${err}`);
  }
}

async function getTechnicians() {
  const response = await axios.get(
    `http://localhost:8081/technicians?source=SLACK`
  );
  console.log("Payload ", response.data);
  return response.data;
}

module.exports = { updateTicket, getTechnicians };
