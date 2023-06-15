const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')('sk_test_51NI9ldAIkNuJhZZgg0XFJZOYSTo4YdErcafrPD7rZjeZyyfOEFHKmT30p84cGkwZPShRdCbT09RDsyccHDNxN6C700Vc1fvrBi')
const port = process.env.PORT || 5000;
require('dotenv').config()



// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCES_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@jigsaw1270.6chjsjt.mongodb.net/?retryWrites=true&w=majority`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classesCollection = client.db("musicallyDb").collection("classes");
    const instructorsCollection = client.db("musicallyDb").collection("instructors");
    const usersCollection = client.db("musicallyDb").collection("users");
    const cartCollection = client.db("musicallyDb").collection("carts");
    const newinsCollection = client.db("musicallyDb").collection("newins");
    const paymentCollection = client.db("musicallyDb").collection("payments");

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCES_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }


    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }


    // users
    app.get('/users', verifyJWT, verifyAdmin , async (req, res) => {
      const result = await usersCollection.find().toArray();
      console.log(result);
      res.send(result);
    });


    app.get('/users', verifyJWT, verifyInstructor , async (req, res) => {
      const result = await usersCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })


    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })


    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.delete('/users/:id', async(req, res) =>{
      const id = req.params.id;
      console.log('please delete from database', id);
      const query = { _id: new ObjectId(id)}
      
      const result = await usersCollection.deleteOne(query);
      res.send(result);
  })


    app.get('/classes', async (req, res) => {
        const result = await classesCollection.find().toArray();
        res.send(result);
      });
//instructors
app.post('/newins', async (req, res) => {
  const item = req.body;
  const result = await newinsCollection.insertOne(item);
  res.send(result);
})

app.put('/newins/:id', async(req, res) =>{
  const id = req.params.id;
  const user = req.body;
  console.log(id, user);
  
  const filter = {_id: new ObjectId(id)}
  const options = {upsert: true}
  const updatedUser = {
      $set: {
          status : 'approved'
      }
  }

  const result = await newinsCollection.updateOne(filter, updatedUser, options );
  res.send(result);

})

app.delete('/newins/:id', async(req, res) =>{
  const id = req.params.id;

  console.log('please delete from database', id);
  const query = { _id: new ObjectId(id)}


  
  const result = await newinsCollection.deleteOne(query);

  res.send(result);
})

    app.get('/newins', async (req, res) => {
        const result = await newinsCollection.find().toArray();
        res.send(result);
      });



      
    app.get('/instructors', async (req, res) => {
        const result = await instructorsCollection.find().toArray();
        res.send(result);
      });


      // cart

      app.get('/carts', verifyJWT, async (req, res) => {
        const email = req.query.email;
  
        if (!email) {
          res.send([]);
        }
  
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
          return res.status(403).send({ error: true, message: 'porviden access' })
        }
  
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      });

      app.post('/insturctors', async (req, res) => {
        const item = req.body;
        const result = await instructorsCollection.insertOne(item);
        res.send(result);
      })
  
      app.post('/carts', async (req, res) => {
        const item = req.body;
        const result = await cartCollection.insertOne(item);
        res.send(result);
      })
  
      app.delete('/carts/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await cartCollection.deleteOne(query);
        res.send(result);
      })

      // create payment intent
      app.post('/create-payment-intent',verifyJWT, async(req, res)=>{
        const {price} = req.body;
        const amount = price*100;
      
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency : 'usd',
          payment_method_types : ['card']
        })
        res.send({
          clientSecret : paymentIntent.client_secret
        })
      })

      app.post('/payments',async(req,res)=>{
        const payment = req.body;
        const result = await paymentCollection.insertOne(payment);
        res.send(result);
      })

      app.get('/payments', async (req, res) => {
        const result = await paymentCollection.find().toArray();
        res.send(result);
      });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req, res)=>{
    res.send('music-early is running')
})
app.listen(port,()=>{
    console.log(`Server is running pn port: ${port}`)
})