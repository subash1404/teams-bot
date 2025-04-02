'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('TeamTickets', 'conversationId', {
      type: Sequelize.STRING, // or Sequelize.UUID if required
      allowNull: true,        // Allow null values initially
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('TeamTickets', 'conversationId');
  }
};
