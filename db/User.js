
const { DataTypes } = require("sequelize");

module.exports = (db) => {
    return db.define("user", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        username: DataTypes.STRING,
        password: DataTypes.STRING,
        email_address: DataTypes.STRING,
        password_reset_token: DataTypes.STRING
    });
};
