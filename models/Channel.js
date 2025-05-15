'use strict';
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize')

  const Channel = sequelize.define('Channel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    teamId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('PUBLIC', 'PRIVATE'),
      allowNull: true
    },
    orgId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'IMChannel',
    timestamps: false
  });

  module.exports = Channel;