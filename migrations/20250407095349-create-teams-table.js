'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Teams', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      department: {
        type: Sequelize.STRING,
        allowNull: false
      },
      teamId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      channelId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Teams');
  }
};
