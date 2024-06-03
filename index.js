const express = require("express")
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i8hseoh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const usersCollection = client.db('skillDB').collection('users')

    // jwt
    app.post("/jwt", (req,res) => {
      const user = req.body;
      const token = jwt.sign(user,"3425fs44fss4fgfsdfiosf", {expiresIn: '4h'})
      res.send({token})
    })

    // users api
    app.get("/users",async(req,res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get("/users/:email",async(req,res)=>{
      const email = req.params;
      const result = await usersCollection.findOne(email)
      res.send(result)
    })

    app.post("/users", async(req,res) => {
        const userData = req.body
        const user = {
            name : userData.name,
            email : userData.email,
            phone : userData.phone,
            image : userData.image,
            role : userData.role
        }
        const result = await usersCollection.insertOne(user)
        res.send(result)
    })

    app.patch("/users/:id", async(req,res) => {
      const id = req.params.id
      const data = req.body
      console.log(data,'inside server')
      const query = { _id: new ObjectId(id)}
      const updatedRole = {
         $set : {
          role : data.role
         }
      }
      const result = await usersCollection.updateOne(query,updatedRole)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   
  }
}
run().catch(console.dir);


app.get("/",(req,res) => {
    res.send("Skill Path is Here")
})

app.listen(port, ()=>{
    console.log(`SkillPath is running on port ${port}`)
  
})