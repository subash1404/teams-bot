const jsonParserService = require("./jsonParserService");

async function getTakeActionBlock(ticketId) {
  const takeActionBlock = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Take Action* options:",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Add Note",
          },
          action_id: "add_note",
          value: JSON.stringify({ ticketId }),
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Initiate Approval",
          },
          action_id: "initiate_approval",
          value: JSON.stringify({ ticketId }),
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Update Ticket",
          },
          action_id: "update_ticket",
          value: JSON.stringify({ ticketId }),
        },
      ],
    },
  ];

  return {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Take Action",
    },
    close: {
      type: "plain_text",
      text: "Close",
    },
    blocks: takeActionBlock,
  };
}

async function getAssignTicketBlock(ticketId) {
  const assignTicketBlock = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Assign Ticket* options:",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Pick Up",
          },
          action_id: "assign_to_me",
          value: JSON.stringify({ ticketId }),
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Assign",
          },
          action_id: "assign_to_others",
          value: JSON.stringify({ ticketId }),
        },
      ],
    },
  ];

  return {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Assign Ticket",
    },
    close: {
      type: "plain_text",
      text: "Close",
    },
    blocks: assignTicketBlock,
  };
}

async function getTechnicianBlock(triggerId, ticketId, technicians) {
  const blocks = [
    {
      type: "input",
      block_id: "technician_block",
      label: {
        type: "plain_text",
        text: "Select Technician",
      },
      element: {
        type: "static_select",
        action_id: "technician_select",
        options: technicians.map((technician) => ({
          text: {
            type: "plain_text",
            text: technician.name,
          },
          value: technician.email.toString(),
        })),
      },
    },
  ];

  const dialog = {
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "update_technician_submit",
      title: {
        type: "plain_text",
        text: "Update Ticket",
      },
      submit: {
        type: "plain_text",
        text: "Confirm",
      },
      close: {
        type: "plain_text",
        text: "Cancel",
      },
      private_metadata: JSON.stringify({ ticketId }),
      blocks,
    },
  };

  return dialog;
}

async function getTicketChannelBlock(
  ticket,
  ticketInfo,
  requesterName,
  technicianName,
) {
  const createdAt = await jsonParserService.formatCreatedDate(
    ticketInfo.data.createdAt
  );
  const technicianChannelCard = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `🎫 *Ticket Id:* #${ticket.id}`,
          `*Subject:* ${ticketInfo.data.subject}`,
          `*Requester:* ${requesterName}`,
          `*Created:* ${createdAt}`,
          `*Technician:* ${technicianName ?? "Unassigned"}`,
          `*Status:* ${ticketInfo.data.status ?? "NEW"}`,
        ].join("\n"),
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Private Group",
          },
          action_id: "private_group",
          value: JSON.stringify({ ticketId: ticket.id }),
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Take Action",
          },
          action_id: "take_action_expand",
          value: JSON.stringify({ ticketId: ticket.id }),
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Assign Ticket",
          },
          action_id: "assign_ticket_expand",
          value: JSON.stringify({ ticketId: ticket.id }),
        },
      ],
    },
  ];

  return technicianChannelCard;
}

async function getUpdateTicketBlock(triggerId, ticketId, ticketUpdateFields) {
  const blocks = [];

  for (const field of ticketUpdateFields) {
    const block = {
      type: "input",
      block_id: `${field.name}_block`,
      label: {
        type: "plain_text",
        text: `Select ${capitalize(field.name)}`,
      },
      element: {},
    };

    if (field.type === "dropdown") {
      block.element = {
        type: "static_select",
        action_id: `${field.name}_select`,
        options: field.options.map((option) => ({
          text: {
            type: "plain_text",
            text: option,
          },
          value: option,
        })),
        initial_option: {
          text: {
            type: "plain_text",
            text: field.value.toUpperCase(),
          },
          value: field.value.toUpperCase(),
        },
      };
    } else if (field.type === "text") {
      block.element = {
        type: "plain_text_input",
        action_id: `${field.name}_input`,
        initial_value: field.value,
      };
    }

    blocks.push(block);
  }

  const dialog = {
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "update_ticket_submit",
      title: {
        type: "plain_text",
        text: "Update Ticket",
      },
      submit: {
        type: "plain_text",
        text: "Confirm",
      },
      close: {
        type: "plain_text",
        text: "Cancel",
      },
      private_metadata: JSON.stringify({ ticketId }),
      blocks,
    },
  };

  return dialog;
}

async function getInitiateApprovalRequestBlock(
  triggerId,
  ticketId,
  ticketInfo,
  requesterName,
  technicianName
) {
  const modal = {
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "submit_approval",
      private_metadata: JSON.stringify({ ticketId }),
      title: {
        type: "plain_text",
        text: "Initiate approval",
      },
      submit: {
        type: "plain_text",
        text: "Send for approval",
      },
      close: {
        type: "plain_text",
        text: "Back",
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*TICKET ID:* ${ticketId}\n*Subject:* ${ticketInfo.data.subject}\n\n*Requester name:* ${requesterName}\n*Status:* ${ticketInfo.data.status}\n*Assigned to:* ${technicianName}`,
          },
        },
        {
          type: "input",
          block_id: "approver_block",
          label: {
            type: "plain_text",
            text: "Approver",
          },
          element: {
            type: "multi_users_select",
            action_id: "approver_select",
            placeholder: {
              type: "plain_text",
              text: "Select an approver",
            },
          },
        },
        {
          type: "input",
          block_id: "note_block",
          label: {
            type: "plain_text",
            text: "Add a note",
          },
          element: {
            type: "plain_text_input",
            action_id: "note_input",
            multiline: true,
          },
        },
      ],
    },
  };

  return modal;
}

async function getInitiateApprovalMessageBlock(
  approverId,
  ticketId,
  ticketInfo,
  description,
  requesterName,
  technicianName
) {
  const initiateApprovalMessageBlock = {
    channel: approverId,
    text: "Ticket Approval Request",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*TICKET ID:* #${ticketId}\n*Subject:* ${ticketInfo.data.subject}\n*Description:* ${description}\n*Requester:* ${requesterName}\n*Status:* ${ticketInfo.data.status}\n*Assigned to:* ${technicianName}`,
        },
      },
      {
        type: "actions",
        block_id: `ticket_action_${ticketId}`,
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve" },
            action_id: "approve_ticket",
            style: "primary",
            value: JSON.stringify({ ticketId })
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Reject" },
            action_id: "reject_ticket",
            style: "danger",
            value: JSON.stringify({ ticketId })
          },
          {
            type: "button",
            text: { type: "plain_text", text: "More Info" },
            action_id: "more_info",
            value: JSON.stringify({ ticketId })
          },
        ],
      },
    ],
  };

  return initiateApprovalMessageBlock;
}

async function getPublicChannelBlock(ticketInfo, technicianName) {
  const createdAt = await jsonParserService.formatCreatedDate(
    ticketInfo.data.createdAt
  );
  const ticketInfoBlock = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New Ticket created with ID:* ${ticketInfo.data.id}\n${ticketInfo.data.subject}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Status:* ${ticketInfo.data.status}\n*Assigned To:* ${
          technicianName ?? "Unassigned"
        }\n*Created Date:* ${createdAt}`,
      },
    },
  ];

  return ticketInfoBlock;
}

async function getTicketInfoBlock(ticketInfo, technicianName) {
  const createdAt = await jsonParserService.formatCreatedDate(
    ticketInfo.data.createdAt
  );
  const ticketInfoBlock = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Ticket ID:* ${ticketInfo.data.id}\n *Subject:* ${ticketInfo.data.subject}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Status:* ${ticketInfo.data.status}\n*Assigned To:* ${
          technicianName ?? "Unassigned"
        }\n*Created Date:* ${createdAt}`,
      },
    },
  ];

  return ticketInfoBlock;
}

async function getAcknowledgementBlock(message) {
  return {
    type: "modal",
    // title: {
    //   type: "plain_text",
    //   text: "Assignment",
    // },
    close: {
      type: "plain_text",
      text: "Close",
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ],
  };
}

async function getAddNoteBlock(ticketId) {
  const noteBlock = {
    type: "modal",
    callback_id: "submit_note",
    title: {
      type: "plain_text",
      text: "Add Note",
    },
    submit: {
      type: "plain_text",
      text: "Submit",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    private_metadata: JSON.stringify({ ticketId }),
    blocks: [
      {
        type: "input",
        block_id: "note_input_block",
        element: {
          type: "plain_text_input",
          multiline: true,
          action_id: "note_input",
          placeholder: {
            type: "plain_text",
            text: "Enter your note here...",
          },
        },
        label: {
          type: "plain_text",
          text: "Note",
        },
      },
    ],
  };
  return noteBlock;
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
  getTakeActionBlock,
  getAssignTicketBlock,
  getTechnicianBlock,
  getTicketChannelBlock,
  getUpdateTicketBlock,
  getInitiateApprovalRequestBlock,
  getInitiateApprovalMessageBlock,
  getTicketInfoBlock,
  getAcknowledgementBlock,
  getPublicChannelBlock,
  getAddNoteBlock,
};
