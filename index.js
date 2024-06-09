require('dotenv').config()
const express = require("express")
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

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
    const teachersCollection = client.db('skillDB').collection('teachers')
    const classesCollection = client.db('skillDB').collection('classes')
    const paymentsCollection = client.db('skillDB').collection('payment')
    const assignmentsCollection = client.db('skillDB').collection('assignments')
    const submitAssignmentsCollection = client.db('skillDB').collection('submitAssignments')
    const feedbackCollection = client.db('skillDB').collection('feedback')

    // jwt
    app.post("/jwt", (req,res) => {
      const user = req.body;
     
      const token = jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn: '4h'})
     
      res.send({token})
    })

    const verifyToken = (req,res,next)=>{
       const accessToken = req.headers.authorization
       if(!accessToken){
        res.status(401).send({message: 'unauthorized access'})
       }
       console.log(accessToken)
       const token = accessToken.split(' ')[1]
       jwt.verify(token,process.env.ACCESS_TOKEN,(err,decoded)=>{
        if(err){
          res.status(401).send({message: 'unauthorized access'})
        }
        req.userEmail = decoded
        next()
       })
      
    }

   

    // users api
    app.get("/users",async(req,res) => {
      const dat = req.query.dat || ""
      const currentPage = parseInt(req.query.currentPage) || 1
      const userPerPage = parseInt(req.query.userPerPage) || 10
      const query = dat ? {email:{$regex : dat, $options : 'i'}} : {}
     
     
      const result = await usersCollection.find(query).skip((currentPage-1) * userPerPage).limit(userPerPage).toArray()
      
      res.send(result)
    })

    app.get("/pagination", async(req,res) => {
    
       const totalUsers = await usersCollection.estimatedDocumentCount()
       const totalTeachers = await teachersCollection.estimatedDocumentCount()
       const totalClasses = await classesCollection.estimatedDocumentCount()
       const totalEnrolledClass = await paymentsCollection.estimatedDocumentCount()
      
       res.send({totalUsers : totalUsers,totalTeachers:totalTeachers,totalClasses,totalEnrolledClass})
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
      
      const query = { _id: new ObjectId(id)}
      const updatedRole = {
         $set : {
          role : data.role
         }
      }
      const result = await usersCollection.updateOne(query,updatedRole)
      res.send(result)
    })

    app.delete("/users/:id", async(req,res) => {
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    // teachers related api
    app.get("/teachers",async(req,res)=>{
      console.log(req.query)
      const currentPage = parseInt(req.query.currentPage) || 1
      const teachersPerPage = parseInt(req.query.perPageUser) || 10
      console.log(currentPage, teachersPerPage)
      const result = await teachersCollection.find().skip((currentPage-1)*teachersPerPage).limit(teachersPerPage).toArray()
      res.send(result)
    })

    app.get("/teachers/:email", async(req,res) => {
      const email = req.params.email
      const filter = { email : email}
      const result = await teachersCollection.findOne(filter)
      res.send(result)
    })

    app.post("/teachers", async(req,res) =>{
      const user = req.body;
      const result = await teachersCollection.insertOne(user)
      res.send(result)
    })

    app.patch("/teachers/:id", async(req,res) => {
      const id = req.params.id
      const data = req.body
      const query = { _id: new ObjectId(id)}
      const filter ={email : data.email}

      const updatedRole = {
        $set : {
          role : data.role
        }
      }

      const updatedStatus = {
        $set : {
          status : data.status
        }
      }
     
      if(data.status === 'Accepted'){
        // 
       const result1 = await usersCollection.updateOne(filter, updatedRole)
       const result2 = await teachersCollection.updateOne(query, updatedStatus)
       res.send({result1,result2})
       return
      }
      if(data.status === 'Rejected'){
        // 
        const result3 = await teachersCollection.updateOne(query, updatedStatus)
        res.send(result3)
        return
      }
      
    })

    // classes api
   
    app.get("/classes", async(req,res) => {
      const currentPage = parseInt(req.query.currentPage) || 1
      const perPageClasses = parseInt(req.query.perPageUser) || 10
      
      const result = await classesCollection.find().skip((currentPage-1)*perPageClasses).limit(perPageClasses).toArray()
      res.send(result)
    })

    app.get("/classes/:status",async(req,res) => {
      const status = req.params.status
      const query = { status : status}
      const currentPage = parseInt(req.query.currentPage)
      const perPageClasses = parseInt(req.query.perPageUser)
       const result = await classesCollection.find(query).skip((currentPage-1)*perPageClasses).limit(perPageClasses).toArray()
      res.send(result)
    })
    

    app.get("/popularClasses",async(req,res) => {
       const enrolledClasses = await paymentsCollection.find().toArray()
       const sortedData = enrolledClasses.sort((a,b)=> b.totalEnrolled - a.totalEnrolled)
       res.send(sortedData)
   
    })

    app.get("/classInfo/:title", async(req,res)=>{
      const title = req.params.title
      const query = { title : title}
      const filter = { classTitle : title}
      
      const enrolledClass = await paymentsCollection.findOne(query)
      const assignments = await assignmentsCollection.find(filter).toArray()
      const submitAssignments = await submitAssignmentsCollection.find(filter).toArray()

      const totalSubmit = submitAssignments.sort((a,b) => b.date - a.date)
     
      const totalEnrolled = enrolledClass?.totalEnrolled || 0
      const totalASsignments = assignments?.length || 0
      const perDaySubmit = totalSubmit?.length || 0
    
      res.send({totalEnrolled,totalASsignments,perDaySubmit,submitAssignments})
    })

    app.get("/classesDetail/:id", async(req,res) => {
       const id = req.params.id
      
       const query = { _id : new ObjectId(id)}
       const result = await classesCollection.findOne(query)
       res.send(result)
    })
    app.get("/myClasses/:id", async(req,res) => {
       const id = req.params.id
      
       const query = { _id : new ObjectId(id)}
       const result = await classesCollection.findOne(query)
       res.send(result)
    })
   
    app.get("/class/:email", async(req,res) => {
      console.log(req.query)
      const email = req.params.email
      const filter = { email : email}
      const currentPage = parseInt(req.query.currentPage)
      const perPageClasses = parseInt(req.query.perPageUser)
      console.log(currentPage, perPageClasses)
      const result = await classesCollection.find(filter).skip((currentPage-1)*perPageClasses).limit(perPageClasses).toArray()
      res.send(result)
    })
    app.post("/classes",async(req,res) => {
      const data = req.body;
      const result = await classesCollection.insertOne(data)
      res.send(result)
    })

    app.put("/classes/:id", async(req,res) => {
      const id = req.params.id
      const filter = { _id : new ObjectId(id)}
      const data = req.body
      const updatedClass = {
        $set : {
          title : data.title,
          name : data.name,
          email : data.email,
          price : data.price,
          description : data.description,
          image : data.image,
          status : data.status
        }
      }
      const result = await classesCollection.updateOne(filter, updatedClass)
      res.send(result)
    })

    app.patch("/classes/:id",async(req,res) => {
      const id = req.params.id
      const data = req.body
      const query = { _id : new ObjectId(id)}
      const status = {
         $set : {
          status : data.status
         }
      }
      if(data.status === 'Accepted'){
         const result1 = await classesCollection.updateOne(query, status)
         res.send({result1})
        return
      }
      if(data.status === 'Rejected'){
        const result2 = await classesCollection.updateOne(query, status)
        res.send({result2})
        return
      }
    })

    app.delete("/classes/:id",async(req,res) => {
      const id = req.params.id
      const query = { _id : new ObjectId(id)}
     
      const result = await classesCollection.deleteOne(query)
      res.send(result)
    })

    app.post("/payment",async(req,res)=>{
      const successPayment = req.body
      
      const result = await paymentsCollection.insertOne(successPayment)
      res.send(result)
    })

    app.get("/isPayment",async(req,res)=>{
       const result = await paymentsCollection.find().toArray()
     
       res.send(result)
    })

    app.get("/myEnrolled/:email", async(req,res) => {
      const email = req.params.email
      const currentPage = parseInt(req.query.currentPage)
      const perPageClasses = parseInt(req.query.perPageUser)
      console.log(currentPage, perPageClasses)
      const result = await paymentsCollection.find({studentEmail : email}).skip((currentPage -1) * perPageClasses).limit(perPageClasses).toArray()
      res.send(result)
    })

    app.get("/enrolledTitle/:id", async(req,res) => {
      const id = req.params.id
      const query = { _id : new ObjectId(id)}
      const result = await paymentsCollection.findOne(query)
      
      res.send(result)
    })

   

    app.patch("/payment/:title",async(req,res) => {
      const title = req.params.title
      const data = req.body.totalEnrolled
      const dat = req.body.studentEmail
      const query = { title : title}
      const totalEnrolled = parseInt(data + 1)
      const updatedEnrolled = {
        $set : {
          totalEnrolled : totalEnrolled,
          studentEmail : dat,
          transactionId : req.body.transactionId 
        }
      }
      const result = await paymentsCollection.updateOne(query,updatedEnrolled)
      res.send(result)
    })

    app.post("/payment-intent",async(req,res)=>{
      const {price} = req.body;
     
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency : 'usd',
        payment_method_types : ['card']
      })
      res.send({
        clientSecret : paymentIntent.client_secret
      })
    })
    // assignments api
    app.get("/assignments/:id",async(req,res) => {
      const id = req.params.id
      const filter = { _id  :  new ObjectId(id)}
      const data = await paymentsCollection.findOne(filter)
    
      const query = { classTitle : data.title}
      const result = await assignmentsCollection.find(query).toArray()
      res.send(result)
    })
    app.post("/assignments", async(req,res) => {
      const assignment = req.body
      const result = await assignmentsCollection.insertOne(assignment)
      res.send(result)
    })

    // submitted assignments api
    app.post("/submitAssignment", async(req,res) => {
      const assignment = req.body;
      const result = await submitAssignmentsCollection.insertOne(assignment)
      res.send(result)
    })
    // feedback api

    app.get("/feedback",async(req,res) => {
      const result = await feedbackCollection.find().toArray()
      res.send(result)
    })

    app.get("/feedbackRev/:classTitle",async(req,res) => {
     
      const query ={ classTitle : req.params.classTitle}
      console.log(query)
      const result = await feedbackCollection.find(query).toArray()
      // const data = result?.find(item => item.classTitle === query)
     console.log(result)
      res.send(result)
    })

    app.post("/feedback", async(req,res) => {
        const feedback = req.body
        const result = await feedbackCollection.insertOne(feedback)
        res.send(result)
    })



    app.get("/impact", async(req,res) => {
      const query = { status : 'Accepted'}
      const users = await usersCollection.find().toArray()
      const enrolled = await paymentsCollection.find().toArray()
      const classes = await classesCollection.find(query).toArray()
      const totalUsers = users.length
      const totalEnrolled = enrolled.reduce((total,item)=> total + parseInt(item?.totalEnrolled),0)
      const totalClasses = classes.length
      
      res.send({totalUsers, totalClasses, totalEnrolled})
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