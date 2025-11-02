const express = require('express');
const router = express.Router();

// Login page (GET)
router.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form (POST)
router.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  // (In real app: verify user credentials from database)
  // For demo, redirect based on role
  if (role === 'customer') {
    return res.redirect('/profile/customer');
  } else if (role === 'labour') {
    return res.redirect('/profile/labour');
  } else {
    return res.redirect('/login');
  }
});

module.exports = router;
