const IMChannelPublicToPrivate = require("../models/IMChannelPublicToPrivate");

class IMChannelPublicToPrivateRepository {
    async findByPrivateChannelId(channelId) {
        return await IMChannelPublicToPrivate.findOne({
            where: { privateChannelId: channelId }
        });
    }

    async findByPublicChannelId(channelId) {
        return await IMChannelPublicToPrivate.findOne({
            where: { publicChannelId: channelId }
        });
    }
}

module.exports = new IMChannelPublicToPrivateRepository();