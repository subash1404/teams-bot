const express = require('express');
const bodyParser = require('body-parser');
const replyRouter = require('./controller'); // Path to your router file
const webHookRouter = require('./webhook'); // Path to your webhook file
const app = express();
app.use(bodyParser.json());
app.use('/api', replyRouter); // Add prefix like `/api`

const PORT = process.env.PORT || 3978;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});