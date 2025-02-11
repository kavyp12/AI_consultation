// api/contact.js
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

// MongoDB Connection
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Submission Schema
const submissionSchema = new mongoose.Schema({
  personName: String,
  personDesignation: String,
  email: { type: String, unique: true },
  contactNumber: String,
  companyName: String,
  companyWebsite: String,
  productName: String,
  productWebsite: String,
  createdAt: { type: Date, default: Date.now }
});

// Ensure model hasn't been compiled
const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

// Email Service
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendNotificationEmail = async (formData) => {
  const transporter = createTransporter();
  const emailContent = `
    New AI Analysis Request:
    Person Name: ${formData.personName}
    Designation: ${formData.personDesignation}
    Email: ${formData.email}
    Contact Number: ${formData.contactNumber}
    Company Name: ${formData.companyName}
    Company Website: ${formData.companyWebsite || 'Not provided'}
    Product Name: ${formData.productName}
    Product Website: ${formData.productWebsite || 'Not provided'}
    Submission Time: ${new Date().toLocaleString()}
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: process.env.COMPANY_EMAIL,
    subject: 'New AI Analysis Request',
    text: emailContent
  };

  await transporter.sendMail(mailOptions);
};

// API Handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle POST request
  if (req.method === 'POST') {
    try {
      await connectDB();
      
      // Create new submission
      const submission = new Submission(req.body);
      await submission.save();
      
      // Send email notification
      await sendNotificationEmail(req.body);
      
      res.status(201).json({ message: 'Form submitted successfully' });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: 'This email has already been submitted' });
      }
      console.error('Error processing request:', error);
      res.status(500).json({ message: 'Something went wrong!' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}