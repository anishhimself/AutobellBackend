const cloudinary = require('cloudinary').v2;
const mycloudinary = require('../config/keys').cloudinary;

cloudinary.config({
  cloud_name: mycloudinary.cloud_name,
  api_key: mycloudinary.api_key,
  api_secret: mycloudinary.api_secret
});

module.exports = cloudinary;
