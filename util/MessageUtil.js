const { Op } = require('sequelize');
const { Ticket } = require('../models');
const ChannelRepository = require('../repository/ChannelRepository');
async function isNewMessage(id) {
    const foundTicket = await Ticket.findOne({
        where: {
            [Op.or]: [
                { requestChannelConversationId: id },
                { techChannelConversationId: id }
            ]
        }
    });
    return !foundTicket
}

async function isRequesterChannel(channelId) {
        const channel = await ChannelRepository.findByChannelId(channelId)
        console.log("Channel: " + JSON.stringify(channel));
        return channel?.type === 'PUBLIC';
}

module.exports = { isNewMessage, isRequesterChannel };