const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { format } = require("date-fns");
const jwt = require("jsonwebtoken");

// middleware added
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const createToken = (Email) => {
  return jwt.sign({ Email }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const verifyJWT = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.Email = decoded;
    next();
  });
};

// mogodb connection
const uri = `mongodb+srv://${process.env.db_username}:${process.env.db_password}@chat-application.qhq6ecs.mongodb.net/?appName=chat-application`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();
    const DB = client.db("e_TutionBD");
    const userCollection = DB.collection("users");
    const postCollection = DB.collection("tutionPost");

    // Register user
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.createdAt = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const Email = user.Email;
      const userExists = await userCollection.findOne({ Email });
      if (userExists) {
        return res.send({ message: "user exists" });
      }
      const result = await userCollection.insertOne(user);
      const token = createToken(Email);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true in production
        sameSite: "lax",
      });
      res.send(result);
    });

    // Register user
    app.post("/Googleusers", async (req, res) => {
      const user = req.body;
      user.createdAt = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const Email = user.Email;
      const token = createToken(Email);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true in production
        sameSite: "lax",
      });
      const userExists = await userCollection.findOne({ Email });
      if (userExists) {
        return res.send({ message: "user exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Login user
    app.post("/login", async (req, res) => {
      const { Email } = req.body;
      const user = await userCollection.findOne({ Email });
      if (!user) {
        return res.status(401).send({ message: "User not found" });
      }
      const token = createToken(Email);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true in production
        sameSite: "lax",
      });
      res.send({ message: "Login successful", user });
    });

    // Logout user
    app.post("/logout", (req, res) => {
      res.clearCookie("token");
      res.send({ message: "Logout successful" });
    });

    // Tution Post
    app.post("/post", verifyJWT, async (req, res) => {
      console.log("post");
      const post = req.body;
      console.log(req.Email)
      post.createdAt = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      post.postedBy = req.Email.Email;
      const result = await postCollection.insertOne(post);
      res.send(result);
    });

    app.get("/post", async (req, res) => {
      const searchText = req.query.searchText;
      const query = {};
      if (searchText) {
        query.$or = [
          { Subject: { $regex: searchText, $options: "i" } },
          { selectDistrict: { $regex: searchText, $options: "i" } },
        ];
      }
      const cursor = postCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/post/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.findOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run();

app.get("/",verifyJWT, (req, res) => {
  console.log(req.Email.email)
  res.send("Hello World! etutionBD");
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
