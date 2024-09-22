const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage configuration for both images and documents
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.mimetype.split("/")[1]; // Extract the extension

    // Check if the file is a document (pdf, doc, docx)
    if (
      [
        "pdf",
        "docx",
        "msword",
        "vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.mimetype.split("/")[1])
    ) {
      return {
        folder: "uploads/documents",
        resource_type: "raw", // 'raw' is required for non-image file types like documents
        allowed_formats: ["pdf", "doc", "docx"],
      };
    }

    // Check if the file is an image (jpg, jpeg, png)
    if (file.mimetype.startsWith("image/")) {
      return {
        folder: "uploads/images",
        resource_type: "image", // 'image' for image file types
        allowed_formats: ["jpg", "jpeg", "png"],
      };
    }

    // If file format isn't allowed, throw an error
    throw new Error("An unknown file format not allowed");
  },
});

// Multer middleware for handling file uploads
const upload = multer({ storage: storage });

module.exports = upload;
