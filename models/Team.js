'use strict';
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  channelId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'Teams',
  timestamps: false
});

module.exports = Team;
