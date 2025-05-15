const Channel  = require('../models/Channel');
class ChannelRepository {
    async findByChannelId(channelId) {
        return await Channel.findOne({ where: { channelId } });
    }
    async findByTeamId(teamId) {
        return await Channel.findAll({ where: { teamId } });
    }
    async findByChannelName(channelName) {
        return await Channel.findOne({ where: { channelName } });
    }
}
module.exports = new ChannelRepository();