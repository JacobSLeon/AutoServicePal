const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const { config } = require('../config/env');

const s3Client = new S3Client({
  region: process.env.CLOUD_STORAGE_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.CLOUD_STORAGE_KEY_ID || '',
    secretAccessKey: process.env.CLOUD_STORAGE_SECRET || '',
  },
});

/**
 * Uploads a local file to AWS S3 and returns the public URL.
 * 
 * @param {string} filePath - Local path to the file
 * @param {string} mimeType - e.g. 'image/webp'
 * @param {string} s3Key - The destination filename/path in S3
 * @returns {Promise<string>} The public URL of the uploaded image
 */
async function uploadToS3(filePath, mimeType, s3Key) {
  const bucketName = process.env.CLOUD_STORAGE_BUCKET;

  if (!bucketName || !process.env.CLOUD_STORAGE_KEY_ID) {
    throw new Error('AWS credentials or bucket name are not configured in environment variables.');
  }

  const fileStream = fs.createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileStream,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Construct and return the public URL
  return `https://${bucketName}.s3.${process.env.CLOUD_STORAGE_REGION || 'eu-west-2'}.amazonaws.com/${s3Key}`;
}

module.exports = {
  uploadToS3,
};
