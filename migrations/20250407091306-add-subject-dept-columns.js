'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.addColumn('TeamTickets', 'dept', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      }),
      queryInterface.addColumn('TeamTickets', 'title', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      })
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.removeColumn('TeamTickets', 'dept'),
      queryInterface.removeColumn('TeamTickets', 'title')
    ]);
  }
};
