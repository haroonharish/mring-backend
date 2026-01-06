const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "misc_uploads";

    // Optional: organize by file type
    if (file.mimetype.startsWith("image/")) {
      folder = "visit_proofs/images";
    } else if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      folder = "excel_uploads";
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "visit_proofs/audio";
    }

    return {
      folder,
      resource_type: "auto", // 🔥 IMPORTANT
      public_id: `${Date.now()}_${file.originalname.split(".")[0]}`,
    };
  },
});

const upload = multer({ storage });

module.exports = upload;
