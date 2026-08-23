// middleware/auth.js
// JWT-based route protection. Checks for a Bearer token in the Authorization header.
// Usage: router.get('/protected', authenticate, authorizeRoles('admin'), handler)

const jwt = require('jsonwebtoken');

// authenticate: verifies the JWT token and attaches the decoded user to req.user
function authenticate(req, res, next) {
  // Token can be in Authorization header ("Bearer <token>") or a cookie
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded contains { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// authorizeRoles: restricts access to specific roles
// Example: authorizeRoles('admin') — only admins can pass
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission.' });
    }
    next();
  };
}

module.exports = { authenticate, authorizeRoles };
