const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u5ygj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJwt = async(req, res, next) =>{
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'Unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
            return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next()
    })

}

async function run() {
  try {
    await client.connect();

    const productsCollection = client.db("parts-store").collection("products");
    const usersCollection = client.db("parts-store").collection("users");
    const ordersCollection = client.db("parts-store").collection("orders");
    const paymentCollection = client.db("parts-store").collection("payment");
    const reviewCollection = client.db("parts-store").collection("reviews");

    app.get("/products", async (req, res) => {
      const products = await productsCollection.find({}).toArray();
      res.send(products);
    });

    app.get("/product/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(filter);
      res.send(product);
    });

    app.post('/order', verifyJwt, async(req, res)=>{
        const order = req.body;
        const result = await ordersCollection.insertOne(order);
        res.send(result);
    })

    app.get('/order', async(req, res)=>{
        const orders = await ordersCollection.find({}).toArray();
        res.send(orders);
    })

    app.delete('/order/:id', async(req, res)=>{
        const id = req.params.id;
        const filter = {_id: ObjectId(id)};
        const result = await ordersCollection.deleteOne(filter);
        res.send(result)
    })

    app.get('/payment/:id', verifyJwt, async(req, res)=>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const order = await ordersCollection.findOne(query);
        res.send(order);
    })

    app.post("/create-payment-intent", async (req, res) => {
        const {totalPrice} = req.body;
        const amount = totalPrice * 100;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types: ['card']
          })
          res.send({clientSecret: paymentIntent.client_secret})
    })

    app.patch('/order/:id', async(req, res)=>{
        const id = req.params.id;
        const order = req.body;
        const {orderId ,transactionId} = order;
        const filter = {_id: ObjectId(id)};
        const updatedDoc = {
            $set: {
                paid: true,
                transactionId: transactionId,
            }
        }
        const result = await paymentCollection.insertOne({orderId ,transactionId});
        const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);
        res.send(updatedOrder)
    })

    app.get('/reviews', async(req,res)=>{
      const review = (await reviewCollection.find({}).toArray()).reverse();
      res.send(review);
    })

    app.post('/review', async(req, res)=>{
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    })

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      console.log(email, user)
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({result, token})
    });


  } finally {

  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello, from parts store server");
});

app.listen(port, () => {
  console.log(`PartsStore Server running on port ${port}`);
});
