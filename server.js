// #1
// express is a framework for node.js that makes creating a server simpler
// express setup includes (cors, body-parser, bcrypt, sessions)
const express = require("express");
const server = express();

// so our frontend on 3000(etc) can talk to our server on 3001(etc)
const cors = require("cors");
server.use(cors({ credentials: true, origin: ["http://localhost:3000","https://dougmr-blog-frontend.herokuapp.com"] }));

// bodyParser turns incoming body JSON into an object
const bodyParser = require("body-parser");
server.use(bodyParser.json());
const bcrypt = require("bcrypt");

const sessions = require("express-session");
// #2 #8 DB setup
const { db, User, Post } = require("./db/db.js");
const SequelizeStore = require("connect-session-sequelize")(sessions.Store);
const oneMonth = 100 * 60 * 60 * 24 * 30;
// use sessions in our express app
server.use(
    sessions({
        secret: "mysecretkey",
        store: new SequelizeStore({ db }),
        cookie: { maxAge: oneMonth },
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

server.get("/loginStatus", (req, res) => {
    console.log(req.session.user);
    if (req.session.user) {
        res.send({ isLoggedIn: true });
    } else {
        res.send({ isLoggedIn: false });
    }
});
server.get("/logout", (req, res) => {
    req.session.destroy();
    res.send({ isLoggedIn: false });
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

// #9 starts the server listening for requests
// run express API server in background to listen for incoming requests

// if heroku, process.env.PORT will be provided
let port = process.env.PORT; 
if(!port){
    // otherwise, fall back to localhost port 3001
    port = 3001;
}
server.listen(port, () => {
    console.log("Server online.");
});

