
// #3 setup DB models
const Sequelize = require("sequelize");
const bcrypt = require("bcrypt");

let options = {};
// if on heroku, there will be process.env, with property DATABASE_URL
let databaseURL = process.env.DATABASE_URL;
if (!databaseURL) {
    // we're on localhost
    databaseURL = "postgres://dougroussin@localhost:5432/blog";
    options = {
        logging: false,
    };
} else {
    // we're not on localhost
    options = {
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
    };
}

// # 10 seeding the DB
const createFirstUser = async () => {
    const users = await User.findAll();
    if (users.length === 0) {
        User.create({
            username: "Doug R",
            password: bcrypt.hashSync("secretpassword", 10),
        });
    }
};

const createSecondUser = async () => {
    const secondUser = await User.findOne({
        where: { username: "User Number Two!" },
    });
    if (!secondUser) {
        User.create({
            username: "User Number Two!",
            password: bcrypt.hashSync("secret", 10),
        });
    }
};

const db = new Sequelize(databaseURL, options);
// const db = new Sequelize("postgres://dougroussin@localhost:5432/blog", {
//     logging: false,
// });
const User = require("./User")(db);
const Post = require("./Post")(db);

// #5 connect and sync to DB
const connectToDB = async () => {
    try {
        await db.authenticate();
        console.log("Connected DB successfully");
        await db.sync(); // #6 sync by creating the tables based off our models if they don't exist
        await createFirstUser();
        await createSecondUser();
    } catch (error) {
        console.error(error);
        console.error("PANIC! DB PROBLEMS!");
    }
    Post.belongsTo(User, { foreignKey: "author_id" });
};

connectToDB();

module.exports = { db, User, Post }; // #7 export out the DB Y Model so we can use it elsewhere in our code
