// server.js
const express = require('express');
const cors = require('cors');
const { pool, initializeDatabase } = require('./db');
const { sendNotificationEmail } = require('./emailService');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }));
  
app.use(express.json());

// Routes
app.post('/api/contact', async (req, res) => {
  try {
    const {
      personName,
      personDesignation,
      email,
      contactNumber,
      companyName,
      companyWebsite,
      productName,
      productWebsite
    } = req.body;

    // Insert into database
    const [result] = await pool.query(
      `INSERT INTO contact_submissions 
       (person_name, person_designation, email, contact_number, 
        company_name, company_website, product_name, product_website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [personName, personDesignation, email, contactNumber,
       companyName, companyWebsite, productName, productWebsite]
    );

    // Send notification email
    await sendNotificationEmail(req.body);

    res.status(201).json({ 
      message: 'Form submitted successfully',
      submissionId: result.insertId 
    });
  } catch (error) {
    console.error('Error processing submission:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ 
        message: 'This email has already been submitted'
      });
    } else {
      res.status(500).json({ 
        message: 'Error processing your submission'
      });
    }
  }
});

// Start server function
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Start the server
startServer();