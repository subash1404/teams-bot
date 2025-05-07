'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define('Ticket', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    ticketId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    requestChannelConversationId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    techChannelConversationId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    requestChannelActivityId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    techChannelActivityId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    privateChannelConversationId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'TicketToIM',
    timestamps: false
  });

  return Ticket;
};
