'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
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
    return Team;
  };  
