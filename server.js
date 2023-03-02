// express is a framework for node.js that makes creating a server simpler
// express setup includes (cors, body-parser, bcrypt, sessions)
const express = require("express");
const server = express();

// so our frontend on 3000(etc) can talk to our server on 3001(etc)
const cors = require("cors");
server.use(
    cors({
        credentials: true,
        origin: [
            "http://localhost:3000",
            "https://shopfaster.app",
            "https://www.shopfaster.app"
            // "https://dougmr-blog-frontend.herokuapp.com",
        ],
    })
);

// bodyParser turns incoming body JSON into an object
const bodyParser = require("body-parser");
server.use(bodyParser.json());
const bcrypt = require("bcrypt");

const apiKey = require("./sendgridAPIkey");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(apiKey);

const sessions = require("express-session");
// DB setup
const { db, User, Post } = require("./db/db.js");
const SequelizeStore = require("connect-session-sequelize")(sessions.Store);
const oneMonth = 1000 * 60 * 60 * 24 * 30;
// use sessions in our express app
server.use(
    sessions({
        secret: "mysecretkey",
        store: new SequelizeStore({ db }),
        cookie: { maxAge: oneMonth },
        resave: true,
        saveUninitialized: true,
    })
);

//
// v Endpoints v
//

const authRequired = (req, res, next) => {
    if (!req.session.user) {
        res.send({ error: "No signed-in User. Posting forbidden." });
    } else {
        next();
    }
};

// creates an endpoint for front-end to send request to
server.get("/", (req, res) => {
    res.send({ hello: "world" });
});

server.post("/login", async (req, res) => {
    const user = await User.findOne(
        { where: { username: req.body.username } },
        { raw: true }
    );
    if (!user) {
        res.send({ error: "username not found" });
    } else {
        // res.send({ message: "user exists" });
        const matchingPassword = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (matchingPassword) {
            req.session.user = user;
            res.send({ success: true, message: "open sesame!" });
        } else {
            res.send({
                error: "no good.  Found user, but password does not match!",
            });
        }
    }
});

server.get("/loginStatus", async (req, res) => {
    console.log(req.session.user);
    if (req.session.user) {
        res.send({ isLoggedIn: true, user:req.session.user });
    } else {
        res.send({ isLoggedIn: false });
    }
});
server.get("/logout", async (req, res) => {
    req.session.destroy();
    res.send({ isLoggedIn: false });
});

server.post("/reset-password", async (req, res) => {
    console.log("/reset-password, req.body: ", req.body);
    const user = await User.findOne({
        where: { email_address: req.body.emailAddress },
    });
    if (user) {
        const { nanoid } = await import("nanoid");
        user.password_reset_token = nanoid();
        await user.save();

        const url = process.env.DATABASE_URL
            ? "https://dougmr-blog-frontend.heroku.com"
            : "http://localhost:3000";

        const msg = {
            to: user.email_address,
            from: "droussin356@gmail.com", // Use the email address or domain you verified above
            subject: "You Needed a Reset, Huh?",
            html: `"Click <a href="${url}/set-password?token=${user.password_reset_token}">here</a> to reset your password."`,
        };

        try {
            await sgMail.send(msg);
        } catch (error) {
            console.error(error);

            if (error.response) {
                console.error(error.response.body);
            }
        }

        //reset password here
        res.send({
            message: "Password is ready to be reset. Go check your email.",
        });
    } else {
        res.send({
            error: "You don't have an account to reset a password on.",
        });
    }
});

server.post("/set-password", async (req, res) => {
    const user = await User.findOne({
        where: { password_reset_token: req.body.resetToken },
    });
    if(user) {
        // set user's password
        user.password = bcrypt.hashSync(req.body.password, 10);
        user.password_reset_token = null;
        user.save();
        res.send({ success: true });
    } else {
        res.send({
            error: "We didn't find your account to reset the password.",
        });
    }
});

//
// Create new User
//
server.post("/create-account", async (req, res) => {
    const usernameExists = await User.findOne({
        where: { username: req.body.username },
    });
    if (usernameExists) {
        res.send({ error: "That username is already taken." });
    } else {
        User.create({
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password, 10),
            email_address: req.body.emailAddress,
        });
        res.send({ success: true });
    }
});

// get post
server.get("/post/:id", async (req, res) => {
    // findByPk = by primary key
    res.send({ post: await Post.findByPk(req.params.id) });
});

// create post
server.post("/post", authRequired, async (req, res) => {
    await Post.create({
        title: req.body.title,
        content: req.body.content,
        author_id: req.session.user.id,
    });
    res.send({ post: "created" });
});

// update post
server.patch("/post/:id", authRequired, async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    post.content = req.body.content;
    post.title = req.body.title;
    await post.save();
    res.send({ success: true, message: "It's been edited" });
});

const errorHandler = (fn) => (req, res, next) => {
    try {
        fn(req, res, next);
    } catch (error) {
        res.send({ error: true });
    }
};

server.delete(
    "/post/:id",
    authRequired,
    errorHandler(async (req, res) => {
        await Post.destroy({ where: { id: req.params.id } });
        res.send({ success: true, message: "That post is GONE" });
    })
);

server.get("/author/:authID", async (req, res) => {
    res.send({
        posts: await Post.findAll({
            where: { author_id: req.params.authID },
        }),
        user: await User.findByPk(req.params.authID, {
            attributes: ["username"],
        }),
    });
});

server.get("/posts", async (req, res) => {
    res.send({
        posts: await Post.findAll({
            order: [["id", "DESC"]],
            include: [{ model: User, attributes: ["username"] }],
        }),
    });
});

server.get("/authors", async (req, res) => {
    // returns just the specified columns (attributes)
    res.send({
        authors: await User.findAll({ attributes: ["id", "username"] }),
    });
});

//
// ^ Endpoints ^
//

// starts the server listening for requests
// run express API server in background to listen for incoming requests

// if heroku, process.env.PORT will be provided
// this works same for AWS
let port = process.env.PORT;

if (!port) {
    // otherwise, fall back to localhost port 3001
    port = 3001;
}
server.listen(port, () => {
    console.log("Server online.");
});
