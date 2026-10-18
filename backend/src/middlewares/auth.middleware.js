const jwt = require('jsonwebtoken');

exports.protectAdmin = (req, res, next) => {
  // Look for the token in the headers
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // Attach admin info to the request
    next(); // Let them pass!
  } catch (err) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};