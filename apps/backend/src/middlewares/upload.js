'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure multer storage for local development
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, file.fieldname + '-' + Date.now() + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  // Only accept images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit (client should compress before sending)
  },
  fileFilter: fileFilter,
});

module.exports = upload;
