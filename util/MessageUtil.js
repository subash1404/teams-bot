const { Op } = require('sequelize');
const Ticket  = require('../models/Ticket');
const ChannelRepository = require('../repository/ChannelRepository');

async function isNewMessage(id) {
    const channel = await ChannelRepository.findByChannelId("19:013e15d8e0ee4e84a3b3c13bd09f13cf@thread.tacv2");
    console.log("Channel: "+ JSON.stringify(channel));
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