const axios = require("axios");
const { WebClient } = require("@slack/web-api");
const slackClient = new WebClient(process.env.BOT_ACCESS_TOKEN);
const userRepository = require("../../repository/UserRepository");

// async function postMessage(channelId, userId, message, threadTs, token) {
//   try {
//     const user = await userRepository.findByUserId(userId);
//     const payload = {
//       channel: channelId,
//       text: message,
//       username: user?.name ?? "Technician",
//       icon_url: user?.imageUrl
//     };

//     if (threadTs) {
//       payload.thread_ts = threadTs;
//     }

//     const response = await axios.post(
//       "https://slack.com/api/chat.postMessage",
//       payload,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     console.log("Slack Response:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error(
//       "Error sending Slack message:",
//       error.response?.data || error.message
//     );
//     throw error;
//   }
// }

async function postMessage(channelId, userId, message, threadTs, token) {
  try {
    const user = await userRepository.findByUserId(userId);
    const payload = {
      channel: channelId,
      text: message,
      username: user?.name ?? "Technician",
      icon_url: user?.imageUrl,
    };

    if (threadTs) {
      payload.thread_ts = threadTs;
    }

    const response = await slackClient.chat.postMessage(payload);
    console.log("Slack Response:", response);

    return response;
  } catch (error) {
    console.error("Error sending Slack message:", error.data || error.message);
    throw error;
  }
}

// async function postBlockMessage(channelId, blocks, threadTs, token) {
//   const body = {
//     channel: channelId,
//     blocks,
//   };
//   if (threadTs) body.thread_ts = threadTs;
//   const response = await axios.post(
//     "https://slack.com/api/chat.postMessage",
//     body,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );

//   return response;
// }

async function getUploadUrl(filename, fileLength) {
  try {
    const uploadUrlResp = await slackClient.apiCall(
      "files.getUploadURLExternal",
      {
        filename: filename,
        length: fileLength,
      }
    );

    if (!uploadUrlResp.ok) {
      throw new Error(`Failed to get upload URL: ${uploadUrlResp.error}`);
    }
    return uploadUrlResp;
  } catch (err) {
    console.warn("Erro in getting Upload url ", err.message);
    throw err;
  }
}

async function uploadFileToChannel(channelId, threadTs, fileId, filename) {
  try {
    const completeResp = await slackClient.apiCall(
      "files.completeUploadExternal",
      {
        channel_id: channelId,
        thread_ts: threadTs,
        files: [
          {
            id: fileId,
            title: filename,
          },
        ],
      }
    );
    if (!completeResp.ok) {
      throw new Error(`Failed to complete upload: ${completeResp.error}`);
    }

    console.log("File uploaded successfully:", completeResp);
  } catch (err) {
    console.warn("Error in uploading file to the channel: ", err.message);
  }
}

async function postBlockMessage(channelId, blocks, threadTs, token) {
  const payload = {
    channel: channelId,
    text: "New Message",
    blocks,
  };

  if (threadTs) {
    payload.thread_ts = threadTs;
  }

  const response = await slackClient.chat.postMessage(payload);
  return response;
}

async function createPrivateChannel(channelName) {
  try {
    const response = await slackClient.conversations.create({
      name: channelName,
      is_private: true,
    });

    console.log("Channel creation response:", response);
    return response.channel?.id;
  } catch (err) {
    console.error(
      "Exception creating channel:",
      err.data?.error || err.message
    );
    return null;
  }
}

async function addUsersToPrivateChannel(channelId, userIds) {
  try {
    const response = await slackClient.conversations.invite({
      channel: channelId,
      users: userIds.join(","),
    });

    console.log("Invite users response:", response);

    if (!response.ok) {
      console.error("Failed to invite users:", response.error);
    }
  } catch (err) {
    console.error("Error inviting users:", err);
  }
}

async function updateBlocksMessage(channel, ts, blocks, token) {
  const response = await slackClient.chat.update({
    channel,
    ts,
    blocks,
  });

  return response;
}

async function addBotToPrivateChannel(channelId) {
  try {
    const membersResponse = await slackClient.conversations.members({
      channel: channelId,
    });
    if (!membersResponse.ok) {
      console.error("Failed to fetch channel members:", membersResponse.error);
      return;
    }
    if (membersResponse.members.includes(process.env.BOT_USER_ID)) {
      console.log("Bot is already a member of the channel.");
      return;
    }
    const inviteResponse = await slackClient.conversations.invite({
      channel: channelId,
      users: process.env.BOT_USER_ID,
    });

    console.log("Invite bot response:", inviteResponse);
  } catch (err) {
    console.error("Error inviting bot:", err);
  }
}

// async function updateBlocksMessage(channel, ts, blocks, token) {
//   return await axios.post(
//     "https://slack.com/api/chat.update",
//     {
//       channel,
//       ts,
//       blocks,
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );
// }

module.exports = {
  postMessage,
  postBlockMessage,
  updateBlocksMessage,
  createPrivateChannel,
  addUsersToPrivateChannel,
  addBotToPrivateChannel,
  getUploadUrl,
  uploadFileToChannel,
};
