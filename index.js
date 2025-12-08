const express = require('express')
const cors = require("cors");
const app = express()
const port = 3000
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');



// middleware added
app.use(express.json());
app.use(cors());


// mogodb connection
const uri = `mongodb+srv://${process.env.db_username}:${process.env.db_password}@chat-application.qhq6ecs.mongodb.net/?appName=chat-application`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    await client.connect();
    const DB = client.db("e_TutionBD");
    const userCollection = DB.collection("users");



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run()









app.get('/', (req, res) => {
  res.send('Hello World! etutionBD')
})

app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})