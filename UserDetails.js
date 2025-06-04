// UserDetails.js
const mongoose = require("mongoose");

const UserDetailsSchema = new mongoose.Schema(
  {
    fname: String,
    lname: String,
    email: { type: String, unique: true },
    password: String,
    userType: String,
  },
  {
    collection: "UserInfo",
  }
);

// Register the model with the name 'UserInfo' (it should match when you reference it)
mongoose.model("UserInfo", UserDetailsSchema);
