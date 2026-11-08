import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from "cors"

const app = express()
const PORT=8000;

app.use(cors())
app.use(express.json())


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB()
const db = mongoClient.db("studioSpace")

const studioCollection = db.collection("studios")


// http://localhost:8000/add-new-studio
app.post('/add-new-studio', async (req, res) => {
  const data = req.body
  const result = await studioCollection.insertOne(data);

  console.log(result);
  res.send(result);
})

// http://localhost:8000/studios
app.get('/studios', async(req, res) => {
  const result = await studioCollection.find().toArray()
  res.send(result);
})

// http://localhost:8000/studio/{id}
app.get('/studio/:id', async(req, res) => {
  const {id} = req.params
  const result = await studioCollection.findOne({_id: new ObjectId(id)})
  res.send(result);
})


// --> jei user login kore studio add korbe, sodhu tar gula ei dekhabe!
// http://localhost:8000/my-listings/${email}
app.get("/my-listings/:email", async (req, res) => {
  const email = req.params.email;

  const query = { "owner.email": email };

  const result = await studioCollection.find(query).toArray();

  res.send(result);
});

// delele studio by the user!
app.delete("/delete-studio/:id", async(req, res) => {
  const {id} = req.params
  const result = await studioCollection.deleteOne({_id : new ObjectId(id)})
  res.send(result)
})

// update the added studio information using id by the user!
app.patch("/update-studio-info/:id", async(req, res) => {
  const {id} = req.params
  const updateData = req.body

  const result = await studioCollection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateData}
  )
  res.json(result)
  console.log("MongoDB Result:", result);
})


// localhost:8000
app.listen(PORT, () => {
  console.log(`studioSpace Server is cooking at ${PORT}`);
});