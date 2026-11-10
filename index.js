import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from "cors"

import { createRemoteJWKSet, jwtVerify } from "jose";

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
const bookingCollection = db.collection("bookings")


//middlewae

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`)
);

const verifyJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access. Token is required.",
            });
        }

        const token = authHeader.split(" ")[1];

        const { payload } = await jwtVerify(token, JWKS);

        req.user = payload;
        console.log(req.user);

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};


// http://localhost:8000/featured-studios
app.get("/featured-studios", async (req, res) => {
    const result = await studioCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();

    res.send(result);
});

// http://localhost:8000/add-new-studio
app.post('/add-new-studio', verifyJWT, async (req, res) => {
    const data = req.body;

    const existingStudio = await studioCollection.findOne({
        "owner.email": data.owner.email,
        title: data.title,
        location: data.location
    });

    if (existingStudio) {
        return res.status(409).send({
            message: "This studio has already been added!"
        });
    }

    const result = await studioCollection.insertOne(data);

    console.log(result);
    res.send(result);
});

// http://localhost:8000/studios
app.get("/studios", async (req, res) => {
    const { category } = req.query;

    const filter = category ? { category } : {};

    const result = await studioCollection
        .find(filter)
        .toArray();

    res.send(result);
});

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
app.delete("/delete-studio/:id", verifyJWT, async(req, res) => {
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

// Add Booking api!
app.post("/book-studio/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingData = req.body;

    // Check if the studio is already booked
    const existingBooking = await bookingCollection.findOne({
      studioId: id,
      status: "Pending",
    });

    if (existingBooking) {
      return res.status(409).send({
        message: "This studio is already booked!",
      });
    }

    // Create new booking
    const newBooking = {
      ...bookingData,
      studioId: id,
      status: "Pending",
    };

    const result = await bookingCollection.insertOne(newBooking);

    res.status(201).send({
      message: "Studio booked successfully!",
      insertedId: result.insertedId,
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to book studio",
      error: error.message,
    });
  }
});

// get api for the my-bookings studio data
app.get("/my-bookings", async (req, res) => {
    const { email } = req.query;

    const result = await bookingCollection
        .find({ userEmail: email })
        .toArray();

    res.send(result);
});


// booking patch api for booking cancel 
// Cancel Booking API
app.patch("/cancel-booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await bookingCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Booking not found or already cancelled!",
      });
    }

    res.send({
      message: "Booking cancelled successfully!",
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
});


// Check Studio Booking Availability API

app.get("/check-studio-booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingBooking = await bookingCollection.findOne({
      studioId: id,
      status: "Pending",
    });

    res.send({
      isBooked: !!existingBooking,
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to check studio availability",
      error: error.message,
    });
  }
});

// localhost:8000
app.listen(PORT, () => {
  console.log(`studioSpace Server is cooking at ${PORT}`);
});

export default app;