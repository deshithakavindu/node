const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB connection
const mongoUrl = process.env.MONGODB_URI || "mongodb+srv://deshithakavindu2729:deshi@cluster0.r65ekb5.mongodb.net/node?retryWrites=true&w=majority&appName=Cluster0";mongoose.connect(mongoUrl)
  .then(() => console.log("Connected to database"))
  .catch(e => console.error("Connection error:", e));

// API server initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// User model
require("./UserDetails");
require("./imageDetails");

const User = mongoose.model("UserInfo");
const Images = mongoose.model("ImageDetails");

app.post("/register", async (req, res) => {
  const { fname, lname, email, password, userType } = req.body;
  console.log("Received data:", req.body);

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
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (await bcrypt.compare(password, user.password)) {
      return res.status(200).json({
        status: "ok",
        message: "Login successful",
        data: { email: user.email, _id: user._id, fname: user.fname, lname: user.lname }
      });
    }

    return res.status(401).json({
      status: "error",
      error: "Invalid password"
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      status: "error",
      error: "An unexpected error occurred."
    });
  }
});

app.get("/userData", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ 
      status: "error",
      message: "Email must be provided" 
    });
  }

  try {
    const userData = await User.findOne({ email }).select('-password');
    
    if (!userData) {
      return res.status(404).json({ 
        status: "error", 
        message: "User not found" 
      });
    }

    res.json({ 
      status: "ok", 
      data: userData 
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ 
      status: "error",
      message: "Internal server error" 
    });
  }
});

app.post("/upload-image", async (req, res) => {
  const { userId, email, fname, lname, base64 } = req.body;

  if (!userId || !email) {
    return res.status(400).send({ status: "error", message: "User ID and email must be provided" });
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.email !== email) {
      return res.status(400).send({ status: "error", message: "Invalid user credentials" });
    }

    const newImage = new Images({
      image: base64,
      userId,
      email,
      fname,
      lname
    });

    await newImage.save();
    res.status(200).send({ status: "ok", message: "Image uploaded successfully!" });
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).send({ status: "error", message: "Error saving image.", error: error.message });
  }
});

app.get("/getImage", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send({ status: "error", message: "User ID must be provided" });
  }

  try {
    const userImages = await Images.find({ userId }).populate('userId', 'email');

    res.status(200).send({
      status: "ok",
      data: userImages
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).send({ status: "error", error: error.message });
  }
});

app.get("/AllImages", async (req, res) => {
  try {
    const allImages = await Images.find({});
    
    const processedImages = allImages.map(image => ({
      ...image.toObject(),
      image: `data:image/jpeg;base64,${image.image}`
    }));

    res.send({ status: "ok", data: processedImages });
  } catch (error) {
    console.error("Error in /AllImages route:", error);
    res.status(500).send({ status: "error", error: error.message });
  }
});

app.delete("/delete-image/:imageId", async (req, res) => {
  const { userId } = req.query;
  const imageId = req.params.imageId;

  if (!userId) {
    return res.status(400).send({ status: "error", message: "User ID must be provided" });
  }

  try {
    const image = await Images.findOne({ _id: imageId, userId });

    if (!image) {
      return res.status(404).send({ 
        status: "error", 
        message: "Image not found or you do not have permission to delete this image" 
      });
    }

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
    const allUsers = await User.find({});
    res.send({ status: "ok", data: allUsers });
  } catch (error) {
    console.error("Error in /getAllUser route:", error);
    res.status(500).send({ status: "error", error: error.message });
  }
});

app.delete("/deleteUser/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).send({ status: "error", message: "User ID is required" });
    }
    await User.findByIdAndDelete(userId);
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