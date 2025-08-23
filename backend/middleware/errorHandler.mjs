export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.details = err.details;
  } else if (err.name === 'MulterError') {
    error.status = 400;
    error.message = 'File Upload Error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error.message = 'Too many files';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error.message = 'Unexpected file field';
    }
  } else if (err.code === 'ENOENT') {
    error.status = 404;
    error.message = 'File not found';
  } else if (err.code === 'EACCES') {
    error.status = 403;
    error.message = 'Permission denied';
  } else if (err.code === 'ENOSPC') {
    error.status = 507;
    error.message = 'Insufficient storage space';
  }

  // Send error response
  res.status(error.status).json({
    success: false,
    error: {
      message: error.message,
      status: error.status,
      ...(error.details && { details: error.details }),
      ...(error.stack && { stack: error.stack })
    },
    timestamp: new Date().toISOString()
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
