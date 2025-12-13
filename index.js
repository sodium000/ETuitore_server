const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { format } = require("date-fns");
const jwt = require("jsonwebtoken");

// middleware added
app.use(express.json());
app.use(cors(
  {
    origin: "http://localhost:5173",
    credentials: true,
  }
));

const createToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET);
};

const verifyJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.sendStatus(401)
  };

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
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

    // all user
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.createdAt = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const Email = user.Email;
      const token = createToken(Email);
      const userExists = await userCollection.findOne({ Email });
      if (userExists) {
        return res.send({ message: "user exists" });
      }
      const result = await userCollection.insertOne(user);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true in production
        sameSite: "lax",
      });
      res.send(result);
    });

    // Tution Post
    app.post("/post", async (req, res) => {
      console.log("post");
      const post = req.body;
      post.createdAt = format(new Date(), "yyyy-MM-dd HH:mm:ss");
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

app.get("/", (req, res) => {
  res.send("Hello World! etutionBD");
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
