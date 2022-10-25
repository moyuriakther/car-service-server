const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 8080;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.PASSWORD}@cluster0.rdx4d.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const serviceCollection = client
      .db(`${process.env.db_name}`)
      .collection(`${process.env.collection}`);
    const orderCollection = client
      .db(`${process.env.db_name}`)
      .collection("order");
    console.log("Running car service server");

    const verifyJwt = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).send({ message: "unauthorized access" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          res.status(403).send({ message: "forbidden access" });
        } else {
          req.decoded = decoded;
          next();
        }
      });
    };
    // auth apis
    app.post("/login", async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });
    // services apis
    // load all services from mongodb
    app.get("/service", async (req, res) => {
      const query = {};
      const services = serviceCollection.find(query);
      const result = await services.toArray();
      res.send(result);
    });
    // load single service from mongodb
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });
    // post a service
    app.post("/service", async (req, res) => {
      const newPost = req.body;
      const result = await serviceCollection.insertOne(newPost);
      res.send(result);
    });
    // delete a service
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    });
    //edit a service
    app.put("/service/:id", async (req, res) => {
      const id = req.params.id;
      const service = req.body;
      const options = { upsert: true };
      const query = { _id: ObjectId(id) };
      const update = {
        $set: {
          name: service.name,
          description: service.description,
          price: service.price,
          img: service.img,
        },
      };
      const result = await serviceCollection.updateOne(query, update, options);
      res.send(result);
    });
    // orders apis
    // get orders
    app.get("/order", verifyJwt, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const query = { email };
        const orders = orderCollection.find(query);
        const result = await orders.toArray();
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });
    //post orders
    app.post("/order", async (req, res) => {
      const newOrder = req.body;
      const result = await orderCollection.insertOne(newOrder);
      res.send(result);
      console.log(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running car service server");
});
app.listen(port);
