const express = require('express')
const cors = require("cors");
const app = express()
const port = 3000
require("dotenv").config();
// middleware added
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World! etutionBD')
})

app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})