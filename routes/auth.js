const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ================= LOGIN ROUTES =================

// Login Page
router.get('/login', (req, res) => {
  res.render('login');
});

// Handle Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).render('login', {
        error: 'User not found'
      });
    }

    // NOTE:
    // Replace this with bcrypt.compare() if passwords are hashed
    if (user.password !== password) {
      return res.status(401).render('login', {
        error: 'Invalid password'
      });
    }

    if (user.userType !== role) {
      return res.status(401).render('login', {
        error: 'Role does not match'
      });
    }

    // Redirect according to role
    if (role === 'customer') {
      return res.redirect('/profile/customer');
    }

    if (role === 'labour') {
      return res.redirect('/profile/labour');
    }

    return res.redirect('/login');

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).render('login', {
      error: 'Server Error'
    });
  }
});

// ================= NEAREST LABOURS API =================

router.get('/nearest-labours', async (req, res) => {
  try {
    const { latitude, longitude, profession } = req.query;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and Longitude are required'
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Build query
    const query = {
      userType: 'labour'
    };

    if (profession && profession !== 'all') {
      query.profession = profession;
    }

    const labours = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          distanceField: 'distance',
          spherical: true,
          query,
          maxDistance: 50000 // 50 km (optional)
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          profession: 1,
          distance: 1,
          location: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      count: labours.length,
      labours
    });

  } catch (error) {
    console.error('Geo Search Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;