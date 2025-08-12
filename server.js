const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();

// Trust first proxy (important for rate limiting behind proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use the client's IP address as the key for rate limiting
    return req.ip;
  }
});

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://staysphere-3.onrender.com', 'http://localhost:3000']
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Add request ID middleware
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  next();
});

// Middleware
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    w: 'majority'
  };

  try {
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('MongoDB connected successfully');
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't exit in production to allow for auto-restart
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB connection disconnected');
    if (process.env.NODE_ENV === 'production') {
      console.log('Attempting to reconnect...');
      connectDB();
    }
  });

  // Create indexes in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    try {
      const createMessageIndexes = require('./models/indexes/message.indexes');
      await createMessageIndexes();
      console.log('Message indexes created successfully');
    } catch (error) {
      console.warn('Warning: Could not create message indexes:', error.message);
    }
  }
};

// Initialize database connection
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  if (process.env.NODE_ENV === 'production') {
    // In production, keep the process alive to allow for auto-restart
    console.log('Server will continue to run and attempt to reconnect to MongoDB...');
  } else {
    process.exit(1);
  }
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const propertyUpdatesRoutes = require('./routes/propertyUpdates');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');
const messagesRoutes = require('./routes/messages');

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/property-updates', propertyUpdatesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/messages', messagesRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  const clientPublicPath = path.join(__dirname, 'client', 'public');
  
  console.log('\n📂 Checking for build directory at:', clientBuildPath);
  
  // Serve static files from public directory first (for favicon, manifest, etc.)
  if (fs.existsSync(clientPublicPath)) {
    console.log('📂 Serving static files from public directory:', clientPublicPath);
    
    // Serve static files from public directory
    app.use(express.static(clientPublicPath, {
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Set correct content types for common files
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
        } else if (path.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.ico')) {
          res.setHeader('Content-Type', 'image/x-icon');
        }
      }
    }));
  }
  
  // Check if build directory exists
  if (fs.existsSync(clientBuildPath)) {
    console.log('✅ Found build directory at:', clientBuildPath);
    console.log('📂 Build directory contents:', fs.readdirSync(clientBuildPath));
    
    // Serve static files from the build directory
    app.use(express.static(clientBuildPath, {
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Cache static assets for 1 year
        if (!path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        } else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    
    // Handle all other routes by serving index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } 
  // If no build directory, serve from public
  else if (fs.existsSync(clientPublicPath)) {
    console.log('⚠️  Build directory not found, falling back to public directory');
    
    // Handle all other routes by serving index.html from public
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientPublicPath, 'index.html'));
    });
  }
  // If neither exists, show error
  else {
    console.error('❌ Neither build nor public directory found');
    console.log('📁 Client directory contents:', fs.readdirSync(path.join(__dirname, 'client')));
    
    app.get('*', (req, res) => {
      res.status(500).send(`
        <html>
          <head><title>Build Error</title></head>
          <body>
            <h1>Frontend Build Missing</h1>
            <p>The frontend build directory was not found at: ${clientBuildPath}</p>
            <p>Also tried: ${clientPublicPath}</p>
            <h3>To fix this issue:</h3>
            <ol>
              <li>Run <code>cd client && npm install && npm run build</code> locally</li>
              <li>Commit the build directory to your repository</li>
              <li>Push the changes and redeploy</li>
            </ol>
          </body>
        </html>
      `);
    });
    return;
  }
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    const indexPath = path.resolve(clientBuildPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      console.log(`🔄 Serving index.html for ${req.path}`);
      res.sendFile(indexPath);
    } else if (fs.existsSync(path.join(clientPublicPath, 'index.html'))) {
      console.log(`🔄 Serving index.html from public for ${req.path}`);
      res.sendFile(path.join(clientPublicPath, 'index.html'));
    } else {
      res.status(404).send(`
        <html>
          <head><title>404 Not Found</title></head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The requested URL ${req.path} was not found on this server.</p>
          </body>
        </html>
      `);
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Error handler for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // In production, we might want to log this to an external service
});

// Error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // In production, we might want to log this to an external service
  // Process should exit in production to avoid undefined behavior
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
  
  // Log all environment variables (except sensitive ones) for debugging
  const envVars = Object.keys(process.env)
    .filter(key => !key.toLowerCase().includes('key') && 
                  !key.toLowerCase().includes('secret') &&
                  !key.toLowerCase().includes('password'));
  console.log('Environment variables:', envVars);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
  
  // Force close server after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
});

module.exports = app;