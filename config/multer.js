const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "profiles",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            { width: 500, height: 500, crop: "fill", quality: "auto:good" }
        ]
    }
});

const workStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "work-images",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            { width: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" }
        ]
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: 3 * 1024 * 1024 } // 3MB max
});

const workUpload = multer({
    storage: workStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max per image
});

// Keep default export as profileUpload for backward compatibility
module.exports = profileUpload;
module.exports.workUpload = workUpload;