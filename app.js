const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const { connectToMongo } = require('../GECI MINIPROJECT/database/db');
const indexRouter = require('./routes/index');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Allow both variations
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Request logging
app.use(logger('dev'));

// Body parsing middleware - ORDER MATTERS!
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);

// Catch 404
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(req.app.get('env') === 'development' && { stack: err.stack })
    }
  });
});

// Connect to MongoDB
connectToMongo()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`CORS configured for: ${app.get('env') === 'development' ? 'Development' : 'Production'}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;