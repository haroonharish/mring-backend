// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    // Check if there is an authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Extract the token from the authorization header (format: "Bearer <token>")
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      // Verify the JWT token using the secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ JWT DECODED:", decoded);
      // Attach the decoded token (userId & role) to the request object for later use
      req.user = decoded; 

      // Role-based access control (if roles array is provided)
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Access denied: You do not have the required role' });
      }

      // If everything is okay, proceed to the next middleware/route handler
      next();
    } catch (err) {
      console.error("❌ JWT ERROR:", err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
};

module.exports = authMiddleware;
