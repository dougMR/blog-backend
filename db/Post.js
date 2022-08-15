const { DataTypes } = require("sequelize");

module.exports = (db) => {
    return db.define("post", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: DataTypes.STRING,
        content: DataTypes.TEXT,
        author_id: DataTypes.INTEGER
    });
};
