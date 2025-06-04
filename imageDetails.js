const mongoose = require("mongoose");

const imageDetailsSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true, // Ensure the image field is required
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the User model
      required: true, // Ensure this is required
   
    },
    fname:{
      type: String,
      required: true,
    },

    lname:{
      type: String,
      required: true,
    },

    email: {
      type: String, // Directly store the email (optional, depending on your needs)
      required: true, // Ensure this is required
    },
    uploadedAt: {
      type: Date,
      default: Date.now, // Automatically set the current date/time
    },
  },
  { collection: "imageDetails" }
);

module.exports = mongoose.model("ImageDetails", imageDetailsSchema);
