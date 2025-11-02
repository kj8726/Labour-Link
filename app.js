const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const connectDB = require('./models/connection');
const User = require('./models/User');
const Order = require('./models/Order');
const Work = require('./models/Work');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
        }
    }
});

// Connect to MongoDB
connectDB();

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'labourlink-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Add this middleware to debug sessions
app.use((req, res, next) => {
    console.log('Session data:', req.session);
    next();
});

// Multer error handling middleware
app.use(async (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).render('error', { 
                error: 'File too large. Maximum size is 5MB.',
                user: req.session.userId ? await User.findById(req.session.userId) : null
            });
        }
    } else if (error) {
        return res.status(400).render('error', { 
            error: error.message,
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
    next();
});

// ==================== ROUTES ====================

// Home Page Route
app.get("/", (req, res) => {
    res.redirect("/home");
});

app.get('/home', async (req, res) => {
    try {
        // Get featured labours for the homepage
        const featuredLabours = await User.find({ 
            userType: 'labour', 
            isActive: true,
            rating: { $gte: 4.0 }
        })
        .sort({ rating: -1, totalReviews: -1 })
        .limit(6);

        // Get recent jobs (from orders)
        const recentJobs = await Order.find({ status: 'pending' })
            .populate('customerId', 'name')
            .populate('labourId', 'name profession')
            .sort({ createdAt: -1 })
            .limit(6);

        // Get statistics for the homepage
        const totalLabours = await User.countDocuments({ userType: 'labour', isActive: true });
        const totalCustomers = await User.countDocuments({ userType: 'customer', isActive: true });
        const completedJobs = await Order.countDocuments({ status: 'completed' });

        res.render('home', {
            featuredLabours,
            recentJobs,
            stats: {
                totalLabours,
                totalCustomers,
                completedJobs
            },
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('home', { 
            featuredLabours: [],
            recentJobs: [],
            stats: { totalLabours: 0, totalCustomers: 0, completedJobs: 0 },
            user: null
        });
    }
});

// ==================== AUTH ROUTES ====================

// Login Page (GET)
app.get('/login', async (req, res) => {
    // If user is already logged in, redirect to appropriate profile
    if (req.session.userId) {
        if (req.session.userType === 'customer') {
            return res.redirect('/profile/customer');
        } else {
            return res.redirect('/profile/labour');
        }
    }
      
    const registerAs = req.query.register;
    console.log('Register parameter:', registerAs);
    
    res.render('login', { 
        error: null,
        preSelectUserType: registerAs === 'labour' ? 'labour' : 'customer'
    });
});

// Login Handler (POST)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            req.session.userType = user.userType;
            req.session.userName = user.name;
            
            console.log('Login successful - User:', user.name, 'Type:', user.userType);
            
            if (user.userType === 'customer') {
                res.redirect('/profile/customer');
            } else {
                res.redirect('/profile/labour');
            }
        } else {
            res.render('login', { error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'Login failed. Please try again.' });
    }
});

// Register Handler (POST)
app.post('/register', async (req, res) => {
    const { name, email, password, phone, age, userType, profession, experience, wagePerHour, wagePerDay } = req.body;
    
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('login', { error: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            name,
            email,
            password: hashedPassword,
            phone,
            age: parseInt(age),
            userType,
            profession: userType === 'labour' ? profession : undefined,
            experience: userType === 'labour' ? experience : undefined,
            wagePerHour: userType === 'labour' ? parseFloat(wagePerHour) : undefined,
            wagePerDay: userType === 'labour' ? parseFloat(wagePerDay) : undefined
        });
        
        await user.save();
        req.session.userId = user._id;
        req.session.userType = user.userType;
        
        if (userType === 'customer') {
            res.redirect('/profile/customer');
        } else {
            res.redirect('/profile/labour');
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.render('login', { error: 'Registration failed. Please try again.' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    const redirectTo = req.query.redirect;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        
        // Check if we should redirect to labour registration
        if (redirectTo === 'labour') {
            return res.redirect('/login?register=labour');
        }
        
        res.redirect('/');
    });
});

// ==================== PROFILE ROUTES ====================

// Customer Profile
app.get('/profile/customer', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            console.log('User not found');
            return res.redirect('/login');
        }
        
        // Check if user is actually a customer
        if (user.userType !== 'customer') {
            console.log('User is not a customer, redirecting to labour profile');
            return res.redirect('/profile/labour');
        }
        
        const orders = await Order.find({ customerId: req.session.userId })
            .populate('labourId', 'name profession profileImage')
            .sort({ createdAt: -1 });
        
        res.render('customerProfile', { 
            customer: user, 
            orders 
        });
    } catch (error) {
        console.error('Error loading customer profile:', error);
        res.status(500).render('error', { 
            error: 'Error loading profile',
            user: null
        });
    }
});

// Labour Profile
app.get('/profile/labour', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.redirect('/login');
        }
        
        // Check if user is actually a labour
        if (user.userType !== 'labour') {
            return res.redirect('/profile/customer');
        }
        
        const works = await Work.find({ labourId: req.session.userId }).sort({ completedDate: -1 });
        const orders = await Order.find({ labourId: req.session.userId })
            .populate('customerId', 'name profileImage')
            .sort({ createdAt: -1 });
        
        res.render('labourProfile', { 
            labour: user, 
            works, 
            orders 
        });
    } catch (error) {
        console.error('Error loading labour profile:', error);
        res.status(500).render('error', { 
            error: 'Error loading profile',
            user: null
        });
    }
});

// Edit Profile Page
app.get('/edit-profile', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.redirect('/login');
        }
        
        res.render('editprofile', { 
            user: user,
            userType: user.userType
        });
    } catch (error) {
        console.error('Error loading edit profile:', error);
        res.status(500).render('error', { 
            error: 'Error loading edit profile',
            user: null
        });
    }
});

// Update Profile
app.post('/update-profile', upload.single('profileImage'), async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    try {
        const { name, age, email, phone, street, city, state, zipCode, profession, experience, wagePerHour, wagePerDay } = req.body;
        
        const updateData = {
            name,
            age: parseInt(age),
            email,
            phone,
            address: {
                street: street || '',
                city: city || '',
                state: state || '',
                zipCode: zipCode || ''
            }
        };
        
        // Handle profile image upload
        if (req.file) {
            updateData.profileImage = '/uploads/' + req.file.filename;
            console.log('Image uploaded:', updateData.profileImage);
        }
        
        // Add labour-specific fields if user is a labour
        const user = await User.findById(req.session.userId);
        if (user.userType === 'labour') {
            updateData.profession = profession;
            updateData.experience = experience;
            updateData.wagePerHour = parseFloat(wagePerHour);
            updateData.wagePerDay = parseFloat(wagePerDay);
        }
        
        await User.findByIdAndUpdate(req.session.userId, updateData);
        
        // Redirect back to appropriate profile
        if (user.userType === 'customer') {
            res.redirect('/profile/customer');
        } else {
            res.redirect('/profile/labour');
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).render('error', { 
            error: 'Error updating profile',
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// ==================== LABOUR MANAGEMENT ROUTES ====================

// Find Labour Page
app.get('/find-labour', async (req, res) => {
    try {
        const { search, profession, minRating, maxPrice, sortBy } = req.query;
        
        // Build filter object
        let filter = { userType: 'labour', isActive: true };
        
        // Search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { profession: { $regex: search, $options: 'i' } },
                { 'address.city': { $regex: search, $options: 'i' } }
            ];
        }
        
        // Profession filter
        if (profession && profession !== 'all') {
            filter.profession = profession;
        }
        
        // Rating filter
        if (minRating) {
            filter.rating = { $gte: parseFloat(minRating) };
        }
        
        // Price filter
        if (maxPrice) {
            filter.$or = [
                { wagePerHour: { $lte: parseFloat(maxPrice) } },
                { wagePerDay: { $lte: parseFloat(maxPrice) } }
            ];
        }
        
        // Sort options
        let sortOptions = {};
        switch(sortBy) {
            case 'rating':
                sortOptions = { rating: -1 };
                break;
            case 'price-low':
                sortOptions = { wagePerHour: 1 };
                break;
            case 'price-high':
                sortOptions = { wagePerHour: -1 };
                break;
            case 'experience':
                sortOptions = { rating: -1 };
                break;
            default:
                sortOptions = { rating: -1, totalReviews: -1 };
        }
        
        const labours = await User.find(filter).sort(sortOptions);
        const professions = await User.distinct('profession', { userType: 'labour' });
        
        res.render('findLabour', {
            labours,
            professions,
            searchParams: {
                search: search || '',
                profession: profession || '',
                minRating: minRating || '',
                maxPrice: maxPrice || '',
                sortBy: sortBy || 'rating'
            },
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
        
    } catch (error) {
        console.error('Error finding labour:', error);
        res.status(500).render('error', { 
            error: 'Error loading labour search page',
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Labour Detail Page
app.get('/labour/:id', async (req, res) => {
    try {
        const labour = await User.findById(req.params.id);
        const works = await Work.find({ labourId: req.params.id })
            .sort({ completedDate: -1 })
            .limit(6);
        const reviews = await Order.find({ 
            labourId: req.params.id, 
            customerRating: { $exists: true } 
        })
        .populate('customerId', 'name profileImage')
        .sort({ completedDate: -1 })
        .limit(10);
        
        if (!labour || labour.userType !== 'labour') {
            return res.status(404).render('404', { 
                user: req.session.userId ? await User.findById(req.session.userId) : null 
            });
        }
        
        res.render('labourDetail', {
            labour,
            works,
            reviews,
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
        
    } catch (error) {
        console.error('Error loading labour detail:', error);
        res.status(500).render('error', { 
            error: 'Error loading labour profile',
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Add new work
app.post('/add-work', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'labour') {
        return res.redirect('/login');
    }
    
    try {
        const { title, description, clientName, completedDate } = req.body;
        
        const work = new Work({
            labourId: req.session.userId,
            title,
            description,
            clientName,
            completedDate: completedDate ? new Date(completedDate) : new Date()
        });
        
        await work.save();
        res.redirect('/profile/labour');
    } catch (error) {
        console.error('Error adding work:', error);
        res.status(500).render('error', { 
            error: 'Error adding work',
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Update wage information
app.post('/update-wage', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'labour') {
        return res.redirect('/login');
    }
    
    try {
        const { wagePerHour, wagePerDay } = req.body;
        
        await User.findByIdAndUpdate(req.session.userId, {
            wagePerHour: parseFloat(wagePerHour),
            wagePerDay: parseFloat(wagePerDay)
        });
        
        res.redirect('/profile/labour');
    } catch (error) {
        console.error('Error updating wage information:', error);
        res.status(500).render('error', { 
            error: 'Error updating wage information',
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// ==================== ERROR HANDLING ====================

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // If it's a multer file upload error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).send('File too large');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).send('Too many files');
    }
    
    res.status(err.status || 500);
    
    // Check if the request expects JSON
    if (req.accepts('json')) {
        res.json({ 
            error: err.message || 'Something went wrong!',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    } else {
        // Fallback to simple text response
        res.type('txt').send(err.message || 'Something went wrong!');
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404);
    
    if (req.accepts('json')) {
        res.json({ error: 'Not found' });
    } else {
        res.type('txt').send('Not found');
    }
});


// 404 Handler
app.use(async (req, res) => {
    res.status(404).render('404', { 
        user: req.session.userId ? await User.findById(req.session.userId) : null 
    });
});

// Error Handler
app.use(async (err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).render('error', { 
        error: 'Internal server error',
        user: req.session.userId ? await User.findById(req.session.userId) : null 
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});