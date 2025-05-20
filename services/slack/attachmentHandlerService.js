const axios = require("axios");
const FormData = require("form-data");
const outgoingService = require("./outgoingService");

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

async function uploadFile(
  filename,
  fileLength,
  contentBytes,
  threadTs,
  channelId
) {
  let uploadUrlResp;
  try {
    uploadUrlResp = await outgoingService.getUploadUrl(filename, fileLength);
  } catch (err) {
    console.error("Failed to get upload URL:", err.message);
    return; // or re-throw, depending on your error strategy
  }

  if (!uploadUrlResp || !uploadUrlResp.upload_url || !uploadUrlResp.file_id) {
    console.error("Upload URL response is invalid", uploadUrlResp);
    return;
  }
  const uploadUrl = uploadUrlResp.upload_url;
  const fileId = uploadUrlResp.file_id;
  const form = new FormData();
  form.append("filename", filename);
  form.append("file", contentBytes, { filename });
  await axios.post(uploadUrl, form, {
    headers: form.getHeaders(),
  });
  await outgoingService.uploadFileToChannel(
    channelId,
    threadTs,
    fileId,
    filename
  );
}

module.exports = { handleAttachments };
