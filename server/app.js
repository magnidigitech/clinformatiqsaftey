const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const casesRoutes = require('./routes/cases.routes');
const meddraRoutes = require('./routes/meddra.routes');
const instructorRoutes = require('./routes/instructor.routes');
const adminRoutes = require('./routes/admin.routes');
const usersRoutes = require('./routes/users.routes');
const collegesRoutes = require('./routes/colleges.routes');
const batchesRoutes = require('./routes/batches.routes');
const icdRoutes = require('./routes/icd.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/meddra', meddraRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/colleges', collegesRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/icd', icdRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '../dist');

if (process.env.NODE_ENV === 'production' || fs.existsSync(distPath)) {
  // Serve static assets from the Vite build directory
  app.use(express.static(distPath));

  // Fallback to index.html for React Router SPA navigation
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
