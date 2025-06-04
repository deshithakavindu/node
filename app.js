const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "ghds33dfh(9h(bhdbsjjj[]jh888567857"; // Use env variable

// MongoDB connection
const mongoUrl = "mongodb+srv://deshithakavindu2729:deshi@cluster0.r65ekb5.mongodb.net/node?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoUrl)
  .then(() => console.log("Connected to database"))
  .catch(e => console.error("Connection error:", e));

// API server initialization
const PORT = process.env.PORT || 5000; // Use the port provided by the platform, or default to 5000
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// User model
// User model
require("./UserDetails");
require("./imageDetails"); // Make sure this comes before you access Images model

const User = mongoose.model("UserInfo");
const Images = mongoose.model("ImageDetails"); // This should match the model name defined in imageDetails.js


app.post("/register", async (req, res) => {
  const { fname, lname, email, password, userType } = req.body;
  console.log("Received data:", req.body); // Log the data received

  try {
    const oldUser = await User.findOne({ email });
    if (oldUser) return res.status(400).send({ error: "User already exists" });

    const encryptedPassword = await bcrypt.hash(password, 10);
    await User.create({ fname, lname, email, password: encryptedPassword, userType });
    res.status(201).send({ status: "ok" });
  } catch (error) {
    res.status(500).send({ error: "Registration failed" });
  }
});


app.post("/login-user", async (req, res) => {
  const { email, password,fname,lname } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare the entered password with the stored hashed password
    if (await bcrypt.compare(password, user.password,)) {
      // Create JWT token with the user's email and _id
      const token = jwt.sign({ email: user.email, _id: user._id,fname: user.fname, lname: user.lname }, JWT_SECRET, {
        expiresIn: "1h", // Optional: Set an expiration time for the token (e.g., 1 hour)
      });

      // Return the token to the user
      return res.status(200).json({
        status: "ok",
        message: "Login successful",
        data: token, // Send the token to the client
      });
    }

    // If the password is incorrect
    return res.status(401).json({
      status: "error",
      error: "Invalid password",
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      status: "error",
      error: "An unexpected error occurred.",
    });
  }
});



app.post("/userData", async (req, res) => {
  const { token } = req.body;

  try {
    // Verify the JWT token
    const user = jwt.verify(token, JWT_SECRET);
    console.log(user);
    
    // Use the email from the verified token to find the user in the database
    const useremail = user.email;
    
    const userData = await User.findOne({ email: useremail }); // Assuming 'User' is your Mongoose model

    if (!userData) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    // Send the user data back to the client
    res.send({ status: "ok", data: userData });
  } catch (error) {
    console.error("Error in /userData route:", error);
    res.status(500).send({ status: "error", data: error.message });
  }
});



app.post("/upload-image", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(400).send({ status: "error", message: "JWT token must be provided" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET); // Verify token

    if (!user._id) {
      return res.status(400).send({ status: "error", message: "User ID is missing in the token" });
    }
    const email = user.email;
    const fname = user.fname;
    const lname = user.lname;
    const newImage = new Images({
      image: req.body.base64, // Base64 image string from the request body
      userId: user._id,
      email: user.email,
      fname: user.fname,
      lname: user.lname, // Assign the user ID from the token
    });

    await newImage.save();
    res.status(200).send({ status: "ok", message: "Image uploaded successfully!" });
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).send({ status: "error", message: "Error saving image.", error: error.message });
  }
});





app.get("/getImage", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Expect token in Authorization header

  try {
    const user = jwt.verify(token, JWT_SECRET); // Verify token
    const userId = user._id; // Extract user ID

    // Fetch images uploaded by the user, and populate the email from the User model
    const userImages = await Images.find({ userId }).populate('userId', 'email');

    res.status(200).send({
      status: "ok",
      data: userImages,
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).send({ status: "error", error: error.message });
  }
});

app.get("/AllImages", async (req, res) => {
  try {
    const allImages = await Images.find({});
    
    // Ensure each image has base64 encoding included in the response
    const processedImages = allImages.map(image => ({
      ...image.toObject(), // Convert Mongoose document to plain object
      image: `data:image/jpeg;base64,${image.image}` // Ensure base64 format
    }));

    res.send({ status: "ok", data: processedImages });
  } catch (error) {
    console.error("Error in /AllImages route:", error);
    res.status(500).send({ status: "error", error: error.message });
  }
});

app.delete("/delete-image/:imageId", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(400).send({ status: "error", message: "JWT token must be provided" });
  }

  try {
    // Verify the token
    const user = jwt.verify(token, JWT_SECRET);
    const userId = user._id;
    const imageId = req.params.imageId;

    // Find the image and check if it belongs to the user
    const image = await Images.findOne({ _id: imageId, userId: userId });

    if (!image) {
      return res.status(404).send({ 
        status: "error", 
        message: "Image not found or you do not have permission to delete this image" 
      });
    }

    // Delete the image
    await Images.findByIdAndDelete(imageId);

    res.status(200).send({ 
      status: "ok", 
      message: "Image deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).send({ 
      status: "error", 
      message: "Error deleting image", 
      error: error.message 
    });
  }
});

app.get("/getAllUser", async (req, res) => {
  try {
    const allUser = await User.find({}); // Renamed to 'allUsers' for clarity
    res.send({ status: "ok", data: allUser }); // Use the correctly named variable
  } catch (error) {
    console.error("Error in /getAllUser route:", error); // Log the error for debugging
    res.status(500).send({ status: "error", error: error.message }); // Send appropriate response
  }
});

app.delete("/deleteUser/:userId", async (req, res) => {
  try {
    const { userId } = req.params; // Extract the userId from the URL params
    if (!userId) {
      return res.status(400).send({ status: "error", message: "User ID is required" });
    }
    await User.findByIdAndDelete(userId); // Deletes user by ID
    res.send({ status: "ok", message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in /deleteUser route:", error);
    res.status(500).send({ status: "error", error: error.message });
  }
});

app.put("/updateUser", async (req, res) => {
  try {
    const { userId, fname, lname, email, userType } = req.body;

    if (!userId) {
      return res.status(400).send({ status: "error", message: "User ID is required" });
    }

    // Find and update the user by ID
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fname, lname, email, userType },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send({ status: "error", message: "User not found" });
    }

    res.send({ status: "ok", message: "User updated successfully", data: updatedUser });
  } catch (error) {
    console.error("Error in /updateUser route:", error);
    res.status(500).send({ status: "error", error: error.message });
  }
});



