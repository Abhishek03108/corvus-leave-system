import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from './src/config/index.js';
import { connectDB } from './src/config/database.js';
import { connectRedis } from './src/config/redis.js';
import { seedDatabase } from './src/config/seeder.js';

import { User } from './src/models/index.js';

// Routers
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import leaveRoutes from './src/routes/leaveRoutes.js';
import holidayRoutes from './src/routes/holidayRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';

// Middlewares
import { errorHandler } from './src/middlewares/errorHandler.js';

const app = express();

// =============================================
// Trust Proxy
// =============================================
app.set('trust proxy', 1);

// =============================================
// Allowed Frontend Origins
// =============================================
const allowedOrigins = [
  'http://localhost:5173',
  'https://leave-corvousstudio-frontend.onrender.com',
];

// =============================================
// CORS Configuration
// =============================================
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin
      // (Postman, mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },

    credentials: true,

    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// =============================================
// Middlewares
// =============================================
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// =============================================
// Rate Limiting
// =============================================
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,

  max: config.rateLimiting.max,

  message: {
    status: 'fail',
    message:
      'Too many requests from this IP, please try again after 15 minutes.',
  },

  standardHeaders: true,

  legacyHeaders: false,
});

app.use('/api/', limiter);

// =============================================
// API Routes
// =============================================
app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/user', userRoutes);

app.use('/api/v1/leave', leaveRoutes);

app.use('/api/v1/holiday', holidayRoutes);

app.use('/api/v1/admin', adminRoutes);

app.use('/api/v1/analytics', analyticsRoutes);

// =============================================
// Health Route
// =============================================
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Corvus Leave Portal API is running.',
  });
});

// =============================================
// 404 Route
// =============================================
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server.`,
  });
});

// =============================================
// Global Error Handler
// =============================================
app.use(errorHandler);

// =============================================
// Start Server
// =============================================
const startServer = async () => {
  try {
    // ============================
    // Connect PostgreSQL
    // ============================
    await connectDB();

    // ============================
    // Seed Database If Empty
    // ============================
    const userCount = await User.count();

    if (userCount === 0) {
      console.log(
        '[Startup] No employees found. Running initial data seeder...'
      );

      await seedDatabase();
    } else {
      console.log(
        `[Startup] Database already initialized with ${userCount} employee records.`
      );
    }

    // ============================
    // Connect Redis
    // ============================
    try {
      await connectRedis();
    } catch (redisErr) {
      console.warn(
        '[Startup] Warning: Redis connection failed.',
        redisErr.message
      );
    }

    // ============================
    // Start Express Server
    // ============================
    const PORT = config.port || process.env.PORT || 7655;

    app.listen(PORT, () => {
      console.log('===============================================');

      console.log(
        `🚀 Corvus Leave Portal Server running on port ${PORT}`
      );

      console.log(`Environment: ${config.nodeEnv}`);

      console.log(
        `Allowed Origins: ${allowedOrigins.join(', ')}`
      );

      console.log('===============================================');
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);

    process.exit(1);
  }
};

startServer();