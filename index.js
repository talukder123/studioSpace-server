import express from 'express';
import { MongoClient } from 'mongodb';
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

//
app.get('/studios', async(req, res) => {
  const result = await studioCollection.find().toArray()
  res.send(result);
})

// localhost:8000
app.listen(PORT, () => {
  console.log(`studioSpace Server is cooking at ${PORT}`);
});