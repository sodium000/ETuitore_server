const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { format } = require("date-fns");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const stripe = require("stripe")(process.env.STEIPE_SECRET);

// middleware added
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5174", "https://your-client.vercel.app"],
    credentials: true,
  })
);

const createToken = (Email) => {
  return jwt.sign({ Email }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const verifyJWT= (req, res, next) => {
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

// crypto genaretot
function generateTrackingId() {
  const prefix = "PRCL"; // your brand prefix
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const random = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6-char random hex

  return `${prefix}-${date}-${random}`;
}

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
    const ApplyCollection = DB.collection("Application");
    const paymentCollection = DB.collection("paymentCollection");

    const verifyAdmin = async (req, res, next) => {
      const email = req.Email.Email;
      const query = { email };
      const user = await userCollection.findOne(query);

      if (!user || user.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      next();
    };

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
        secure: true,
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
        secure: true, // true in production
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
        secure: true,
        sameSite: "lax",
      });
      res.send({ message: "Login successful", user });
    });

    // Logout user
    app.post("/logout", (req, res) => {
      res.clearCookie("token");
      res.send({ message: "Logout successful" });
    });

    // update
    app.patch("/update",  async (req, res) => {
      const { Email, displayName, photoURL, Phone } = req.body;
      const user = await userCollection.findOne({ Email });
      if (!user) {
        return res.status(401).send({ message: "User not found" });
      }

      const filter = { Email };
      const updateDocument = {
        $set: {
          displayName: displayName,
          photoURL: photoURL,
          Phone: Phone,
        },
      };
      const result = await userCollection.updateOne(filter, updateDocument);

      res.send(result);
    });

    // Logout user
    app.post("/logout", (req, res) => {
      res.clearCookie("token");
      res.send({ message: "Logout successful" });
    });

    // Tution Post
    app.post("/post",  async (req, res) => {
      const post = req.body;
      post.createdAt = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      post.postedBy = req.Email.Email;
      post.status = "panding";
      const result = await postCollection.insertOne(post);
      res.send(result);
    });

    app.post("/applications",  async (req, res) => {
      const applications = req.body;
      const tutorEmail = req.body.tutorEmail;
        const postId = req.body.postId;
        const query = {
          postId,
          tutorEmail,
        };
        const sameapply = await ApplyCollection.findOne(query);
        if (sameapply) {
          return res.send({ message: "Already apply" });
        }

      const result = await ApplyCollection.insertOne(applications);
      return res.send(result);
    });

    app.post("/applications/tutor",  async (req, res) => {
      const applications = req.body;
      const StudentEmail = req.body.StudentEmail;
      const TutorEmail = req.body.TutorEmail;
        const postId = req.body.postId;
        const query = {
          TutorEmail,
          StudentEmail,
        };
        const sameapply = await ApplyCollection.findOne(query);
        if (sameapply) {
          return res.send({ message: "Already apply" });
        }
      const result = await ApplyCollection.insertOne(applications);
      return res.send(result);
    });

    app.get("/applications/:email/apply",  async (req, res) => {
      const email = req.params.email;
      
        const query = {
          TutorEmail: email,
          status: { $in: ["Pending", "Accepted", "Rejected"] },
        };
        const result = await ApplyCollection.find(query).toArray();
        return res.send(result);
      
    });

    app.get("/applications/:email/student",  async (req, res) => {
      const email = req.params.email;
      
        const query = {
          email,
        };
        const result = await ApplyCollection.find(query).toArray();
        return res.send(result);
  
    });

    app.delete("/applications/:id/deleted", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ApplyCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/post", async (req, res) => {
      const searchText = req.query.searchText;
      const query = {
        status: "accepted",
      };
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

    app.get("/post/:id/apply", async (req, res) => {
      const id = req.params.id;
      const query = { postId: id };
      const result = await ApplyCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/post/:email/getpost", async (req, res) => {
      const email = req.params.email;
      const query = { postedBy: email };
      const projectFields = { _id: 1 };
      const result = await postCollection
        .find(query)
        .project(projectFields)
        .toArray();
      res.send(result);
    });

    app.get("/post/:email/all", async (req, res) => {
      const email = req.params.email;
      const query = { postedBy: email };
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/post/:id/update",  async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body.status;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: updateStatus,
        },
      };
      const result = await ApplyCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // roleBase Api
    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = {};
      if (email) {
        {
          query.Email = email;
        }
      }
      const user = await userCollection.findOne(query);
      res.send({ role: user?.role || "student" });
    });

    // patch post data

    app.patch("/post/:id/postdata",  async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: { ...updateStatus },
      };
      const result = await postCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // deleted
    app.delete("/post/:id/deleted",  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.deleteOne(query);
      res.send(result);
    });

    // api for usermenegment

    app.get("/alldata", async (req, res) => {
      const query = {};
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/alluser", async (req, res) => {
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/users/:id/role",  async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: updateStatus.role,
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // payment api
    app.post("/payment-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.TutorFee) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "bdt",
              unit_amount: amount,
              product_data: {
                name: `Apply for Tutor: ${paymentInfo.TutorName}`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          TutorName: paymentInfo.TutorName,
          TutorFee: paymentInfo.TutorFee,
          PostORTutorId: paymentInfo.PostORTutorId,
          TutorEmail: paymentInfo.TutorEmail,
          StudentName: paymentInfo.StudentName,
          StudentEmail: paymentInfo.StudentEmail,
        },
        customer_email: paymentInfo.StudentEmail,
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancelled`,
      });

      res.send({ url: session.url });
    });

    app.post("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const TutorEmail = session.metadata.TutorEmail;
      const query = { TutorEmail: TutorEmail };
      const PaymentExt = await paymentCollection.findOne(query);

      if (PaymentExt) {
        return res.send({
          message: "already exists",
          trackingId: PaymentExt.trackingId,
        });
      }
      const trackingId = generateTrackingId();

      const payment = {
        amount: session.amount_total / 100,
        currency: session.currency,
        customer_email: session.customer_email,
        TutorName: session.metadata.TutorName,
        TutorEmail: session.metadata.TutorEmail,
        PostORTutorId: session.metadata.PostORTutorId,
        StudentEmail: session.metadata.StudentEmail,
        StudentName: session.metadata.StudentName,
        transactionId: session.payment_intent,
        paymentStatus: session.payment_status,
        paidAt: new Date(),
        trackingId: trackingId,
      };

      if (session.payment_status === "paid") {
        const resultPayment = await paymentCollection.insertOne(payment);
        return res.send({
          success: true,
          trackingId: trackingId,
          transactionId: session.payment_intent,
          paymentInfo: resultPayment,
        });
      }

      return res.send({ success: false });
    });

    // get payment info
    app.get("/payments", async (req, res) => {
      const Email = req.query.email;
      const query = {};
      if (Email) {
        query.customer_email = Email;
      }

      const cursor = paymentCollection.find(query).sort({ paidAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/payments/all", async (req, res) => {
      const result = await paymentCollection
        .find({})
        .sort({ paidAt: -1 })
        .toArray();

      res.send(result);
    });

    //  tutor api
    app.get("/tutor/data", async (req, res) => {
      const query = { role: "tutor" };
      const user = await userCollection.find(query).toArray();
      res.send(user);
    });

    app.get("/tutor/:id/tutorDetails", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    app.get("/tutor/:email/data", async (req, res) => {
      const email = req.params.email;
      const query = {
        Email: email,
        role: "tutor",
      };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    app.patch("/tutor/:email/dataupdate",  async (req, res) => {
      const updateData = req.body;
      const query = { Email: tokenEmail, role: "tutor" };
      const user = await userCollection.findOne(query);
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      const updateDoc = {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // tutor payment show
    app.get("/tuitions/:email/ongoing",  async (req, res) => {
      try {
        const email = req.params.email;
        const query = {
          TutorEmail: email,
          paymentStatus: "paid",
        };

        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching data" });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
