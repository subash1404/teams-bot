const User = require('../models/User')
class UserRepository {
    async findByEmail(email) {
        return await User.findOne({ where: { email } });
    }

    async findByUserId(userId) {
        return await User.findOne({ where: { userId } });
    }

    async findByTeamsObjectId(teamsObjectId) {
        return await User.findOne({ where: { teamsObjectId } });
    }

    // TODO: move this into updateUser function
    async updateUserIdByTeamsObjectId(teamsObjectId, userId) {
        const user = await User.findOne({ where: { teamsObjectId } });
        if (!user) {
            throw new Error(`User with teamsObjectId ${teamsObjectId} not found`);
        }
        user.userId = userId;
        await user.save();
        console.log(`User ID updated for teamsObjectId ${teamsObjectId}`);
        return user;
    }
}

module.exports = new UserRepository();