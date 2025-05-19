const axios = require("axios");
const FormData = require("form-data");

async function handleAttachments(files, threadTs, channelId) {
  for (let file of files) {
    const { name: filename, url_private_download } = file;
    const fileResponse = await axios.get(url_private_download, {
      headers: { Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}` },
      responseType: "arraybuffer",
    });

    const contentBytes = fileResponse.data;
    const fileLength = contentBytes.byteLength;
    await uploadFile(filename, fileLength, contentBytes, threadTs, channelId);
  }
}

async function uploadFile(filename, fileLength, contentBytes, threadTs, channelId) {
  const uploadUrlResp = await axios.post(
    "https://slack.com/api/files.getUploadURLExternal",
    new URLSearchParams({ filename, length: fileLength.toString() }),
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const uploadUrl = uploadUrlResp.data.upload_url;
  const file_id = uploadUrlResp.data.file_id;

  const form = new FormData();
  form.append("filename", filename);
  form.append("file", contentBytes, { filename });

  await axios.post(uploadUrl, form, {
    headers: form.getHeaders(),
  });

  await axios.post(
    "https://slack.com/api/files.completeUploadExternal",
    {
      channel_id: channelId,
      thread_ts : threadTs,
      files: [
        {
          id: file_id,
          title: filename,
          
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

module.exports = { handleAttachments };