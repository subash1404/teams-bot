const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize')
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    teamsObjectId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    orgId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'User',
    timestamps: false
  });

module.exports = User;
