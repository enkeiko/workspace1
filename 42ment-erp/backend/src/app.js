const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/v1/auth', require('./routes/auth.routes'));
app.use('/v1/company', require('./routes/company.routes'));
app.use('/v1/bank-accounts', require('./routes/bankAccount.routes'));
app.use('/v1/clients', require('./routes/client.routes'));
app.use('/v1/stores', require('./routes/store.routes'));
app.use('/v1/product-categories', require('./routes/productCategory.routes'));
app.use('/v1/quotes', require('./routes/quote.routes'));
app.use('/v1/orders', require('./routes/order.routes'));
app.use('/v1/contracts', require('./routes/contract.routes'));
app.use('/v1/invoices', require('./routes/invoice.routes'));
app.use('/v1/payments', require('./routes/payment.routes'));
app.use('/v1/settlements', require('./routes/settlement.routes'));
app.use('/v1/reports', require('./routes/report.routes'));
app.use('/v1/notifications', require('./routes/notification.routes'));
app.use('/v1/audit-logs', require('./routes/auditLog.routes'));
app.use('/v1/dashboard', require('./routes/dashboard.routes'));
app.use('/v1/sequences', require('./routes/sequence.routes'));
app.use('/v1/files', require('./routes/file.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
        details: err.meta
      }
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Record not found',
        details: err.meta
      }
    });
  }

  // Validation errors
  if (err.isJoi) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.details.reduce((acc, detail) => {
          const field = detail.path.join('.');
          if (!acc[field]) acc[field] = [];
          acc[field].push(detail.message);
          return acc;
        }, {})
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token expired'
      }
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

module.exports = app;
