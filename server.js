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

// 1. Trust Proxy (Necessary for secure cookies and rate-limiting behind proxies)
app.set('trust proxy', 1);

// 2. CORS configurations
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. Rate Limiting for security
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.max,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 5. Scalable API Versioning Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/holiday', holidayRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Fallback Route
app.use('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server.`
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Database & Server Startup
const startServer = async () => {
  try {
    // Connect database
    await connectDB();

    // Auto-seed if database is empty
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('[Startup] No employees found. Running initial data seeder...');
      await seedDatabase();
    } else {
      console.log(`[Startup] Database already initialized with ${userCount} employee records.`);
    }

    // Connect Redis
    try {
      await connectRedis();
    } catch (redisErr) {
      console.warn('[Startup] Warning: Redis connection failed. OTP/Blacklist will fallback or fail. Make sure Redis server is running at C:\Users\rajki\Desktop\corvus-leave equivalents.', redisErr.message);
    }

    // Bind Port
    app.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(`🚀 Corvus Leave Portal Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`CORS Allowed Origin: ${config.frontendUrl}`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
