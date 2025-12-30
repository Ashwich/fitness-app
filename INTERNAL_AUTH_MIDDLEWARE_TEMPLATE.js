/**
 * INTERNAL REQUEST AUTHENTICATION MIDDLEWARE TEMPLATE
 * 
 * This middleware should be used to protect internal endpoints
 * that are only accessible from other microservices.
 * 
 * USAGE:
 * 1. Copy this file to your microservice: src/middleware/internalAuth.js
 * 2. Use it in your internal routes: router.use(authenticateInternalRequest);
 */

/**
 * Middleware to authenticate internal service requests
 * Only allows requests from localhost/internal network with proper headers
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const authenticateInternalRequest = (req, res, next) => {
  // Check if request has internal header
  const isInternalRequest = req.headers['x-internal-request'] === 'true';
  
  // Get client IP address
  const clientIp = 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';

  // Check if request is from localhost/internal network
  const isLocalhost = 
    clientIp === '127.0.0.1' || 
    clientIp === '::1' || 
    clientIp === '::ffff:127.0.0.1' ||
    clientIp === 'localhost' ||
    clientIp.startsWith('192.168.') ||
    clientIp.startsWith('10.') ||
    clientIp.startsWith('172.16.') ||
    clientIp.startsWith('172.17.') ||
    clientIp.startsWith('172.18.') ||
    clientIp.startsWith('172.19.') ||
    clientIp.startsWith('172.20.') ||
    clientIp.startsWith('172.21.') ||
    clientIp.startsWith('172.22.') ||
    clientIp.startsWith('172.23.') ||
    clientIp.startsWith('172.24.') ||
    clientIp.startsWith('172.25.') ||
    clientIp.startsWith('172.26.') ||
    clientIp.startsWith('172.27.') ||
    clientIp.startsWith('172.28.') ||
    clientIp.startsWith('172.29.') ||
    clientIp.startsWith('172.30.') ||
    clientIp.startsWith('172.31.');

  // Optional: Validate service token if configured
  const serviceToken = req.headers['x-service-token'];
  const validToken = process.env.INTERNAL_SERVICE_TOKEN;
  const tokenValid = !validToken || serviceToken === validToken;

  // Log the request for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Internal Auth]', {
      ip: clientIp,
      isInternalRequest,
      isLocalhost,
      hasToken: !!serviceToken,
      tokenValid,
      path: req.path,
    });
  }

  // Reject if not internal request
  if (!isInternalRequest) {
    return res.status(403).json({
      success: false,
      message: 'Internal endpoints require X-Internal-Request header',
    });
  }

  // Reject if not from localhost/internal network
  if (!isLocalhost) {
    return res.status(403).json({
      success: false,
      message: 'Internal endpoints are only accessible from localhost/internal network',
      clientIp, // Don't expose in production
    });
  }

  // Reject if service token is invalid
  if (!tokenValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing service token',
    });
  }

  // Request is valid, proceed
  next();
};

/**
 * Optional: More strict middleware that requires specific source service
 * @param {string|string[]} allowedServices - Service names that can access this endpoint
 */
const authenticateInternalRequestFromServices = (allowedServices) => {
  const allowed = Array.isArray(allowedServices) ? allowedServices : [allowedServices];
  
  return (req, res, next) => {
    // First check basic internal auth
    authenticateInternalRequest(req, res, (err) => {
      if (err) return next(err);
      
      // Check source service
      const sourceService = req.headers['x-source-service'];
      if (!sourceService || !allowed.includes(sourceService)) {
        return res.status(403).json({
          success: false,
          message: `This endpoint is only accessible from: ${allowed.join(', ')}`,
        });
      }
      
      next();
    });
  };
};

module.exports = {
  authenticateInternalRequest,
  authenticateInternalRequestFromServices,
};







