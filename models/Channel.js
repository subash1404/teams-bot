'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Channel = sequelize.define('Channel', {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      team_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      type: {
        type: DataTypes.ENUM('AGENT', 'REQUESTER'),
        allowNull: false
      }
    }, {
      tableName: 'Channel',
      timestamps: false
    });
  
    return Channel;
  };
  
  