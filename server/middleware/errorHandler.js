// server/middleware/errorHandler.js – Global error handler
const errorHandler = (err, req, res, _next) => {
  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('ERROR:', err);
  }

  const response = {
    success: false,
    message,
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  // Handle Prisma-specific errors
  if (err.code === 'P2002') {
    response.message = `Duplicate value for field: ${err.meta?.target?.join(', ') || 'unknown'}`;
    return res.status(409).json(response);
  }

  if (err.code === 'P2025') {
    response.message = 'Record not found';
    return res.status(404).json(response);
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
