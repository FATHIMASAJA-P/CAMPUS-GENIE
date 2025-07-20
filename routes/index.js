// routes/index.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// GET Home Page
router.get('/', (req, res) => {
  res.render('index', { title: 'Campus Genie Login' });
});

// POST /submit - Save login data to database
router.post('/submit', async (req, res) => {
  const db = getDb();
  const collection = db.collection('users');

  const { username, password } = req.body;

  try {
    const existingUser = await collection.findOne({ username });

    if (!existingUser) {
      const newUser = {
        username,
        password,
        role: 'student',
        createdAt: new Date()
      };

      await collection.insertOne(newUser);
    }

    res.status(200).json({
      token: 'dummy-token-123',
      user: {
        username,
        role: existingUser ? existingUser.role : 'student'
      }
    });

  } catch (err) {
    console.error('❌ Error inserting data:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /submit-request - Save certificate request
router.post('/submit-request', async (req, res) => {
  const db = getDb();
  console.log(req.body);
  
  const requestsCollection = db.collection('requests');
  
  try {
    const requestData = req.body;
    const requestId = `REQ-${uuidv4().substr(0, 8).toUpperCase()}`;
    
    const newRequest = {
      requestId,
      studentId: requestData.studentId,
      studentName: requestData.studentName,
      timestamp: new Date(),
      status: 'Submitted',
      formData: requestData,
      updates: [
        {
          status: 'Submitted',
          timestamp: new Date(),
          message: 'Request has been received and is under initial review.'
        }
      ]
    };

    await requestsCollection.insertOne(newRequest);

    res.status(201).json({
      success: true,
      requestId,
      message: 'Request submitted successfully'
    });

  } catch (err) {
    console.error('❌ Error saving request:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to submit request'
    });
  }
});

// GET /track-request - Get request status
router.get('/track-request/:requestId', async (req, res) => {
  const db = getDb();
  const requestsCollection = db.collection('requests');
  
  try {
    const requestId = req.params.requestId;
    const request = await requestsCollection.findOne({ requestId });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.status(200).json({
      success: true,
      request
    });

  } catch (err) {
    console.error('❌ Error fetching request:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch request details'
    });
  }
});

// Add this new route to your index.js
router.get('/faculty/requests', async (req, res) => {
  const db = getDb();
  const requestsCollection = db.collection('requests');
  
  try {
    // Get query parameters for filtering
    const { status, type, search } = req.query;
    
    // Build query object
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (type && type !== 'all') {
      query['formData.certificatesRequested'] = { $in: [type] };
    }
    
    if (search) {
      query.$or = [
        { 'formData.name': { $regex: search, $options: 'i' } },
        { 'formData.regNo': { $regex: search, $options: 'i' } }
      ];
    }
    
    const requests = await requestsCollection.find(query)
      .sort({ timestamp: -1 }) // Newest first
      .toArray();
    
    res.status(200).json({
      success: true,
      requests
    });
    
  } catch (err) {
    console.error('❌ Error fetching requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch requests'
    });
  }
});

// Add this route for approving/rejecting requests
router.put('/faculty/requests/:requestId', async (req, res) => {
  const db = getDb();
  const requestsCollection = db.collection('requests');
  
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }
    
    const status = action === 'approve' ? 'Approved' : 'Rejected';
    const message = action === 'approve' 
      ? 'Request has been approved by faculty' 
      : 'Request has been rejected by faculty';
    
    const update = {
      $set: { status },
      $push: {
        updates: {
          status,
          timestamp: new Date(),
          message
        }
      }
    };
    
    const result = await requestsCollection.updateOne(
      { requestId },
      update
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`
    });
    
  } catch (err) {
    console.error('❌ Error updating request:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update request'
    });
  }
});

module.exports = router;