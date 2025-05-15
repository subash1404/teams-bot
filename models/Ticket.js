'use strict';
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize')

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  channelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  requesterChannelBlockConversationId: {
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
  },
  privateChannelId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'TicketToIM',
  timestamps: false
});

module.exports = Ticket;
