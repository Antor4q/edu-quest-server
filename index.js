require('dotenv').config()
const express = require("express")
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const port = process.env.PORT || 5000


const allowedOrigins = [
  "http://localhost:5173",
  "https://skillpath-ce375.web.app",
  "https://skill-path-server.vercel.app",
  "https://skillpath-ce375.firebaseapp.com",
];



app.use(cors({
  origin: function (origin,callback){
    if(!origin) return callback(null,true)
     if( allowedOrigins.indexOf(origin) !== -1){
      return callback(null,true)
     }else{
       callback(new Error('Not allowed by cors'))
     }
  },
  credentials : true
}))
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i8hseoh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
   
   

    const usersCollection = client.db('skillDB').collection('users')
    const teachersCollection = client.db('skillDB').collection('teachers')
    const classesCollection = client.db('skillDB').collection('classes')
    const paymentsCollection = client.db('skillDB').collection('payment')
    const assignmentsCollection = client.db('skillDB').collection('assignments')
    const submitAssignmentsCollection = client.db('skillDB').collection('submitAssignments')
    const feedbackCollection = client.db('skillDB').collection('feedback')

    
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
      
       const token = accessToken?.split(' ')[1] || ""
       console.log(token)
       jwt.verify(token,process.env.ACCESS_TOKEN,(err,decoded)=>{
        if(err){
          res.status(401).send({message: 'unauthorized access'})
        }
        req.userEmail = decoded
        next()
       })
      
    }

    const verifyAdmin = async(req,res,next) =>{
     try{
      const email = req?.userEmail?.email
    
      const query = { email : email}
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'Admin'
      if(!isAdmin){
        res.status(403).send({message:'forbidden access'})
      }
      next()
     }
     catch (err){
      console.log(err)
      return res.status(500).send({ message: 'internal server error' });
     }
    }
    const verifyTeacher = async(req,res,next) =>{
      try{
        const email = req?.userEmail.email
    
      const query = { email : email}
      const user = await usersCollection.findOne(query)
      const isTeacher = user?.role === 'Teacher'
      if(!isTeacher){
        res.status(403).send({message:'forbidden access'})
      }
      next()
      }
      catch (err){
        console.log(err)
        return res.status(500).send({ message: 'internal server error' });
      }
    }
    const verifyStudent = async(req,res,next) =>{
     try{
      const email = req?.userEmail.email
    
      const query = { email : email}
      const user = await usersCollection.findOne(query)
      const isStudent = user?.role === 'Student'
      if(!isStudent){
        res.status(403).send({message:'forbidden access'})
      }
      next()
     }
     catch (err){
      console.log(err)
      return res.status(500).send({ message: 'internal server error' });
     }
    }

   app.get("/popular",async(req,res)=>{
     const enrolledClasses = await paymentsCollection.find().toArray()
     const maxEnrolled = enrolledClasses.sort((a,b)=> b.totalEnrolled - a.totalEnrolled)[0]
    
     const filterData = enrolledClasses.filter(item => item.totalEnrolled === maxEnrolled.totalEnrolled)
     res.send(filterData)
   })

    
    app.get("/users",verifyToken,verifyAdmin,async(req,res) => {
      const dat = req.query.dat || ""
      const currentPage = parseInt(req.query.currentPage) || 1
      const userPerPage = parseInt(req.query.userPerPage) || 10
      const query = dat ? {email:{$regex : dat, $options : 'i'}} : {}
     
     
      const result = await usersCollection.find(query).skip((currentPage-1) * userPerPage).limit(userPerPage).toArray()
      
      res.send(result)
    })

    app.get("/pagination",verifyToken, async(req,res) => {
    
       const totalUsers = await usersCollection.estimatedDocumentCount()
       const totalTeachers = await teachersCollection.estimatedDocumentCount()
       const totalClasses = await classesCollection.estimatedDocumentCount()
       const totalEnrolledClass = await paymentsCollection.estimatedDocumentCount()
      
       res.send({totalUsers : totalUsers,totalTeachers:totalTeachers,totalClasses,totalEnrolledClass})
    })
   
    app.get("/users/:email",verifyToken,async(req,res)=>{
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

    app.patch("/users/:id",verifyToken,verifyAdmin, async(req,res) => {
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

    app.delete("/users/:id",verifyToken,verifyAdmin, async(req,res) => {
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    
    app.get("/teachers",verifyToken,verifyAdmin,async(req,res)=>{
     
      const currentPage = parseInt(req.query.currentPage) || 1
      const teachersPerPage = parseInt(req.query.perPageUser) || 10
     
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

    app.patch("/teachers/:id",verifyToken,verifyAdmin, async(req,res) => {
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

    
   
    app.get("/classes",verifyToken,verifyAdmin, async(req,res) => {
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
     
      const date = new Date()
      const formatDate = date.toISOString().split('T')[0]
      const filter = { classTitle : title,date:{$regex:formatDate}}
      const fil = { classTitle : title}
      const enrolledClass = await paymentsCollection.findOne(query)
      const assignments = await assignmentsCollection.find(fil).toArray()
      const submitAssignments = await submitAssignmentsCollection.find(filter).toArray()
      
        submitAssignments.sort((a,b) => a.date > b.date ? 1:-1)
     
      const totalEnrolled = enrolledClass?.totalEnrolled || 0
      const totalASsignments = assignments?.length || 0
      const perDaySubmit = submitAssignments?.length || 0
     
      res.send({totalEnrolled,totalASsignments,perDaySubmit})
    })

    app.get("/classesDetail/:id",verifyToken, async(req,res) => {
       const id = req.params.id
      
       const query = { _id : new ObjectId(id)}
       const result = await classesCollection.findOne(query)
       res.send(result)
    })
    app.get("/myClasses/:id",verifyToken, async(req,res) => {
       const id = req.params.id
      
       const query = { _id : new ObjectId(id)}
       const result = await classesCollection.findOne(query)
       res.send(result)
    })
   
    app.get("/class/:email",verifyToken,verifyTeacher, async(req,res) => {
     
      const email = req.params.email
      const filter = { email : email}
      const currentPage = parseInt(req.query.currentPage)
      const perPageClasses = parseInt(req.query.perPageUser)
     
      const result = await classesCollection.find(filter).skip((currentPage-1)*perPageClasses).limit(perPageClasses).toArray()
      res.send(result)
    })
    app.post("/classes",async(req,res) => {
      const data = req.body;
      const result = await classesCollection.insertOne(data)
      res.send(result)
    })

    app.put("/classes/:id",verifyToken,verifyTeacher, async(req,res) => {
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

    app.patch("/classes/:id",verifyToken,verifyAdmin,async(req,res) => {
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

    app.delete("/classes/:id",verifyToken,verifyTeacher,async(req,res) => {
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

    app.get("/myEnrolled/:email",verifyToken,verifyStudent, async(req,res) => {
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
    
    app.get("/assignments/:id",verifyToken,verifyStudent,async(req,res) => {
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

   
    app.post("/submitAssignment", async(req,res) => {
      const assignment = req.body;
      const result = await submitAssignmentsCollection.insertOne(assignment)
      res.send(result)
    })
    

    app.get("/feedback",async(req,res) => {
      const result = await feedbackCollection.find().toArray()
      res.send(result)
    })

    app.get("/feedbackRev/:classTitle",async(req,res) => {
     
      const query ={ classTitle : req.params.classTitle}
      
      const result = await feedbackCollection.find(query).toArray()
    
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

    
    
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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