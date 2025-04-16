// models/user.js
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      displayName: {
        type: DataTypes.STRING
      },
      email: {
        type: DataTypes.STRING
      },
      tenant_id: {
        type: DataTypes.STRING
      }
    }, {
      tableName: 'User',
      timestamps: false
    });
  
    return User;
  };
  