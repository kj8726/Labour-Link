require("dotenv").config();


const multer = require("multer");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const connectDB = require('./models/connection');
const User = require('./models/User');
const Order = require('./models/Order');
const JobPost = require('./models/JobPost');
const Notification = require('./models/Notification');
const Work = require('./models/Work');
const bcrypt = require('bcryptjs');
const { workUpload } = require("./config/multer");
const upload = require("./config/multer");
const MongoStore = require('connect-mongo');


const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
connectDB().catch(console.error);

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Multer error handling middleware
app.use(async (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).render('error', { 
                error: 'File too large. Maximum size is 5MB.',
                user: req.session?.userId ? await User.findById(req.session.userId) : null
            });
        }
    } else if (error) {
        return res.status(400).render('error', { 
            error: error.message,
            user: req.session?.userId ? await User.findById(req.session.userId) : null
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
        const featuredLabours = await User.find({ 
            userType: 'labour', 
            isActive: true,
            rating: { $gte: 4.0 }
        })
        .sort({ rating: -1, totalReviews: -1 })
        .limit(6);

        const allLabours = await User.find({ 
            userType: 'labour', 
            isActive: true
        })
        .select('name profession rating location profileImage wagePerHour _id');

        const homeUser = req.session?.userId ? await User.findById(req.session.userId) : null;

        // Public job board postings — visible to logged-out visitors and to
        // workers (their own profession plus general/any-profession posts).
        // Not shown to customers.
        let publicJobPosts = [];
        if (!homeUser || homeUser.userType === 'labour') {
            await JobPost.updateMany(
                { status: 'open', expiresAt: { $lte: new Date() } },
                { $set: { status: 'expired' } }
            );

            const jobPostQuery = { status: 'open' };
            if (homeUser && homeUser.userType === 'labour') {
                jobPostQuery.$or = [{ profession: homeUser.profession }, { profession: null }];
            }
            publicJobPosts = await JobPost.find(jobPostQuery)
                .populate('customerId', 'name')
                .sort({ createdAt: -1 })
                .limit(6);
        }

        const totalLabours = await User.countDocuments({ userType: 'labour', isActive: true });
        const totalCustomers = await User.countDocuments({ userType: 'customer', isActive: true });
        const completedJobs = await Order.countDocuments({ status: 'completed' });

        const professionCounts = {
            'Plumber': await User.countDocuments({ userType: 'labour', profession: 'Plumber', isActive: true }),
            'Electrician': await User.countDocuments({ userType: 'labour', profession: 'Electrician', isActive: true }),
            'Carpenter': await User.countDocuments({ userType: 'labour', profession: 'Carpenter', isActive: true }),
            'Painter': await User.countDocuments({ userType: 'labour', profession: 'Painter', isActive: true }),
            'AC Repair': await User.countDocuments({ userType: 'labour', profession: 'AC Repair', isActive: true }),
            'Cleaner': await User.countDocuments({ userType: 'labour', profession: 'Cleaner', isActive: true }),
            'Gardener': await User.countDocuments({ userType: 'labour', profession: 'Gardener', isActive: true }),
            'Mason': await User.countDocuments({ userType: 'labour', profession: 'Mason', isActive: true })
        };

        res.render('home', {
            featuredLabours,
            allLabours: JSON.stringify(allLabours),
            publicJobPosts,
            stats: {
                totalLabours,
                totalCustomers,
                completedJobs
            },
            professionCounts,
            user: homeUser
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('home', { 
            featuredLabours: [],
            allLabours: '[]',
            publicJobPosts: [],
            stats: { totalLabours: 0, totalCustomers: 0, completedJobs: 0 },
            professionCounts: {},
            user: null
        });
    }
});

// ==================== AUTH ROUTES ====================

// Login Page (GET)
app.get('/login', async (req, res) => {
    if (req.session?.userId) {
        if (req.session.userType === 'customer') {
            return res.redirect('/profile/customer');
        } else {
            return res.redirect('/profile/labour');
        }
    }
      
    const registerAs = req.query.register;
    
    res.render('login', { 
        error: null,
        preSelectUserType: registerAs === 'labour' ? 'labour' : 'customer',
        user: null 
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
            res.render('login', {
                error: 'Invalid email or password. Please check your details and try again.',
                preSelectUserType: user ? user.userType : null,
                loginEmail: email
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'Login failed. Please try again.' });
    }
});

// Register Handler (POST)
app.post('/register', async (req, res) => {
    const { 
        name, email, password, phone, age, userType, 
        profession, experience, wagePerHour, wagePerDay,
        city, state, lat, lng 
    } = req.body;
    
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('login', { 
                error: 'User with this email already exists',
                preSelectUserType: userType 
            });
        }

        if (!name || !email || !password || !phone || !userType || !city || !state) {
            return res.render('login', { 
                error: 'All required fields must be filled',
                preSelectUserType: userType 
            });
        }

        if (userType === 'labour' && (!profession || !experience)) {
            return res.render('login', { 
                error: 'Profession and experience are required for professionals',
                preSelectUserType: userType 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userData = {
            name,
            email,
            password: hashedPassword,
            phone,
            age: age ? parseInt(age) : null,
            userType,
            address: {
                city,
                state,
                street: '',
                zipCode: ''
            },
            isActive: true
        };

        if (lat && lng) {
            userData.location = {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
        }

        if (userType === 'labour') {
            userData.profession = profession;
            userData.experience = experience;
            userData.wagePerHour = wagePerHour ? parseFloat(wagePerHour) : 0;
            userData.wagePerDay = wagePerDay ? parseFloat(wagePerDay) : 0;
            userData.rating = 0;
            userData.totalReviews = 0;
        }
        
        const user = new User(userData);
        await user.save();

        // Set session — plain assignment, no optional chaining on left side
        req.session.userId = user._id;
        req.session.userType = user.userType;
        req.session.userName = user.name;
        
        console.log('Registration successful - User:', user.name, 'Type:', user.userType);
        
        if (userType === 'customer') {
            res.redirect('/profile/customer');
        } else {
            res.redirect('/profile/labour');
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.render('login', { 
            error: 'Registration failed. Please try again.',
            preSelectUserType: req.body.userType 
        });
    }
});

// Logout
app.get('/logout', (req, res) => {
    const redirectTo = req.query.redirect;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        
        if (redirectTo === 'labour') {
            return res.redirect('/login?register=labour');
        }
        
        res.redirect('/');
    });
});

// ==================== PROFILE ROUTES ====================

// Professional Public Profile
app.get('/professional/:id', async (req, res) => {
    try {
        const professional = await User.findById(req.params.id);
        
        if (!professional || professional.userType !== 'labour') {
            return res.status(404).render('404', { 
                user: req.session?.userId ? await User.findById(req.session.userId) : null 
            });
        }

        const works = await Work.find({ labourId: req.params.id })
            .sort({ completedDate: -1 })
            .limit(10);

        const reviewSort = ['recent', 'highest', 'lowest'].includes(req.query.sort)
            ? req.query.sort
            : 'recent';

        const reviewSortOptions = {
            recent: { completedDate: -1 },
            highest: { customerRating: -1, completedDate: -1 },
            lowest: { customerRating: 1, completedDate: -1 }
        };

        const reviews = await Order.find({ 
            labourId: req.params.id, 
            customerRating: { $exists: true, $ne: null } 
        })
        .populate('customerId', 'name profileImage')
        .sort(reviewSortOptions[reviewSort])
        .limit(20);

        const averageRating = reviews.length > 0 
            ? (reviews.reduce((sum, review) => sum + review.customerRating, 0) / reviews.length).toFixed(1)
            : 0;

        const similarProfessionals = await User.find({
            _id: { $ne: req.params.id },
            userType: 'labour',
            profession: professional.profession,
            isActive: true
        })
        .select('name profession rating profileImage experience wagePerHour')
        .limit(4)
        .sort({ rating: -1 });

        res.render('showprofile', {
            professional,
            works,
            reviews,
            averageRating,
            totalReviews: reviews.length,
            reviewSort,
            similarProfessionals,
            user: req.session?.userId ? await User.findById(req.session.userId) : null,
            isOwner: req.session?.userId?.toString() === req.params.id
        });
    } catch (error) {
        console.error('Error loading professional profile:', error);
        res.status(500).render('error', { 
            error: 'Error loading professional profile',
            user: req.session?.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Contact Professional (Send Message/Request)
app.post('/contact-professional', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login to contact professionals' });
    }

    try {
        const { professionalId, message, serviceType, budget, timeline } = req.body;
        
        const professional = await User.findById(professionalId);

        if (!professional || professional.userType !== 'labour') {
            return res.status(404).json({ success: false, message: 'Professional not found' });
        }

        const order = new Order({
            customerId: req.session.userId,
            labourId: professionalId,
            service: serviceType || 'General Service',
            description: message,
            budget: budget ? parseFloat(budget) : null,
            amount: budget ? parseFloat(budget) : null,
            status: 'pending'
        });

        await order.save();

        res.json({ 
            success: true, 
            message: 'Your request has been sent successfully!',
            orderId: order._id
        });
    } catch (error) {
        console.error('Error contacting professional:', error);
        res.status(500).json({ success: false, message: 'Error sending request' });
    }
});

// ==================== PUBLIC JOB BOARD ====================

// Auto-expire job posts whose expiresAt has passed. Called lazily before
// any read of job posts rather than on a cron — keeps this simple and
// serverless-friendly (no background worker needed).
async function expireStaleJobPosts(filter = {}) {
    await JobPost.updateMany(
        { status: 'open', expiresAt: { $lte: new Date() }, ...filter },
        { $set: { status: 'expired' } }
    );
}

async function notify(userId, type, message, link, jobPostId) {
    try {
        await Notification.create({ userId, type, message, link, jobPostId });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Help & Support — content adapts based on whether the visitor is a
// logged-in customer, a logged-in worker, or not logged in at all.
app.get('/help', async (req, res) => {
    try {
        const user = req.session?.userId ? await User.findById(req.session.userId) : null;
        res.render('help', { user });
    } catch (error) {
        console.error('Error loading help page:', error);
        res.render('help', { user: null });
    }
});

// Form to create a public job post (customer only)
app.get('/post-job', async (req, res) => {
    if (!req.session?.userId) {
        return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.userType !== 'customer') {
        return res.redirect('/profile/labour');
    }

    res.render('postJob', {
        professions: JobPost.PROFESSIONS,
        user,
        editPost: null
    });
});

// Form to edit an existing job post (customer, own post, still open only)
app.get('/jobs/:id/edit', async (req, res) => {
    if (!req.session?.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId);
        const jobPost = await JobPost.findById(req.params.id);

        if (!jobPost || jobPost.customerId.toString() !== req.session.userId.toString()) {
            return res.status(404).render('404', { user });
        }

        if (jobPost.status !== 'open') {
            return res.redirect(`/jobs/${jobPost._id}/responses`);
        }

        res.render('postJob', {
            professions: JobPost.PROFESSIONS,
            user,
            editPost: jobPost
        });
    } catch (error) {
        console.error('Error loading job post for edit:', error);
        res.status(500).render('error', { error: 'Error loading job post', user: null });
    }
});

// Public job board listing — any logged-in worker can browse all open posts
// (not just their own profession), useful as a dedicated "browse jobs" page.
app.get('/jobs', async (req, res) => {
    try {
        const user = req.session?.userId ? await User.findById(req.session.userId) : null;

        await expireStaleJobPosts();

        const query = { status: 'open' };
        if (req.query.profession && req.query.profession !== 'all') {
            // Show posts for that exact profession PLUS general (no-profession) posts
            query.$or = [{ profession: req.query.profession }, { profession: null }];
        }

        const jobPosts = await JobPost.find(query)
            .populate('customerId', 'name')
            .sort({ createdAt: -1 });

        res.render('jobBoard', {
            jobPosts,
            professions: JobPost.PROFESSIONS,
            selectedProfession: req.query.profession || 'all',
            user
        });
    } catch (error) {
        console.error('Error loading job board:', error);
        res.status(500).render('error', { error: 'Error loading job board', user: null });
    }
});

// Create a public job post (customer only). Profession is optional —
// leaving it blank makes this a general request visible to every worker.
app.post('/jobs/create', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login to post a job' });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.userType !== 'customer') {
            return res.status(403).json({ success: false, message: 'Only customers can post public jobs' });
        }

        const { title, description, profession, budget, workersNeeded, street, city, state, zipCode } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        let cleanProfession = null;
        if (profession && profession !== 'all' && profession !== '') {
            if (!JobPost.PROFESSIONS.includes(profession)) {
                return res.status(400).json({ success: false, message: 'Invalid profession' });
            }
            cleanProfession = profession;
        }

        const jobPost = new JobPost({
            customerId: user._id,
            title,
            description,
            profession: cleanProfession,
            budget: budget ? parseFloat(budget) : null,
            workersNeeded: workersNeeded ? Math.max(1, parseInt(workersNeeded)) : 1,
            address: { street, city, state, zipCode }
        });

        await jobPost.save();

        // Notify workers whose profession matches (or all active workers, for a general request)
        const matchQuery = { userType: 'labour', isActive: true };
        if (cleanProfession) matchQuery.profession = cleanProfession;
        const matchingWorkers = await User.find(matchQuery).select('_id').limit(200);

        await Promise.all(matchingWorkers.map(w =>
            notify(
                w._id,
                'new_job_match',
                `New job posted: "${title}"${cleanProfession ? '' : ' (open to all professions)'}`,
                '/jobs',
                jobPost._id
            )
        ));

        res.json({ success: true, message: 'Job posted successfully!', jobPostId: jobPost._id });
    } catch (error) {
        console.error('Error creating job post:', error);
        res.status(500).json({ success: false, message: 'Error posting job' });
    }
});

// Update an existing job post (customer, own post, still open only)
app.post('/jobs/:id/edit', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login first' });
    }

    try {
        const jobPost = await JobPost.findById(req.params.id);
        if (!jobPost || jobPost.customerId.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (jobPost.status !== 'open') {
            return res.status(400).json({ success: false, message: 'Only open job posts can be edited' });
        }

        const { title, description, profession, budget, workersNeeded, street, city, state, zipCode } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        let cleanProfession = null;
        if (profession && profession !== 'all' && profession !== '') {
            if (!JobPost.PROFESSIONS.includes(profession)) {
                return res.status(400).json({ success: false, message: 'Invalid profession' });
            }
            cleanProfession = profession;
        }

        jobPost.title = title;
        jobPost.description = description;
        jobPost.profession = cleanProfession;
        jobPost.budget = budget ? parseFloat(budget) : null;
        jobPost.workersNeeded = workersNeeded ? Math.max(1, parseInt(workersNeeded)) : 1;
        jobPost.address = { street, city, state, zipCode };

        await jobPost.save();

        res.json({ success: true, message: 'Job post updated!', jobPostId: jobPost._id });
    } catch (error) {
        console.error('Error editing job post:', error);
        res.status(500).json({ success: false, message: 'Error updating job post' });
    }
});

// Customer closes/cancels their own job post without hiring anyone
app.post('/jobs/:id/cancel', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login first' });
    }

    try {
        const jobPost = await JobPost.findById(req.params.id);
        if (!jobPost || jobPost.customerId.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (jobPost.status !== 'open') {
            return res.status(400).json({ success: false, message: 'This job post is not open' });
        }

        jobPost.status = 'cancelled';
        await jobPost.save();

        res.json({ success: true, message: 'Job post cancelled.' });
    } catch (error) {
        console.error('Error cancelling job post:', error);
        res.status(500).json({ success: false, message: 'Error cancelling job post' });
    }
});

// Worker responds to / expresses interest in a public job post, optionally
// with a message (e.g. availability, quote, or a clarifying question).
app.post('/jobs/:id/respond', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login to respond to jobs' });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.userType !== 'labour') {
            return res.status(403).json({ success: false, message: 'Only professionals can respond to job posts' });
        }

        // Require a minimally complete profile before a worker can apply publicly —
        // cuts down on empty/spam profiles flooding customers with responses.
        if (!user.profession || !user.profileImage) {
            return res.status(403).json({
                success: false,
                message: 'Please complete your profile (profession and a profile photo) before applying to jobs'
            });
        }

        const jobPost = await JobPost.findById(req.params.id);
        if (!jobPost) {
            return res.status(404).json({ success: false, message: 'Job post not found' });
        }

        if (jobPost.status !== 'open' || jobPost.expiresAt <= new Date()) {
            if (jobPost.status === 'open') {
                jobPost.status = 'expired';
                await jobPost.save();
            }
            return res.status(400).json({ success: false, message: 'This job is no longer open' });
        }

        const alreadyResponded = jobPost.responses.some(
            r => r.labourId.toString() === user._id.toString()
        );
        if (alreadyResponded) {
            return res.status(400).json({ success: false, message: 'You have already responded to this job' });
        }

        const message = (req.body.message || '').toString().trim().slice(0, 500);

        jobPost.responses.push({
            labourId: user._id,
            message
        });

        await jobPost.save();

        await notify(
            jobPost.customerId,
            'new_response',
            `${user.name} responded to your job "${jobPost.title}"`,
            `/jobs/${jobPost._id}/responses`,
            jobPost._id
        );

        res.json({ success: true, message: 'Response sent to the customer!' });
    } catch (error) {
        console.error('Error responding to job post:', error);
        res.status(500).json({ success: false, message: 'Error sending response' });
    }
});

// Customer views responses on their own job post
app.get('/jobs/:id/responses', async (req, res) => {
    if (!req.session?.userId) {
        return res.redirect('/login');
    }

    try {
        const jobPost = await JobPost.findById(req.params.id)
            .populate('responses.labourId', 'name profession rating totalReviews profileImage wagePerHour');

        if (!jobPost || jobPost.customerId.toString() !== req.session.userId.toString()) {
            return res.status(404).render('404', { user: await User.findById(req.session.userId) });
        }

        res.render('jobResponses', {
            jobPost,
            user: await User.findById(req.session.userId)
        });
    } catch (error) {
        console.error('Error loading job responses:', error);
        res.status(500).render('error', { error: 'Error loading responses', user: null });
    }
});

// Customer accepts a worker's response — converts it into a direct Order
// request using the existing flow. Supports hiring more than one worker:
// the post only fully closes once workersNeeded accepted responses are reached.
app.post('/jobs/:id/accept/:labourId', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login first' });
    }

    try {
        const jobPost = await JobPost.findById(req.params.id);
        if (!jobPost || jobPost.customerId.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (jobPost.status !== 'open') {
            return res.status(400).json({ success: false, message: 'This job post is not open' });
        }

        const response = jobPost.responses.find(
            r => r.labourId.toString() === req.params.labourId
        );
        if (!response) {
            return res.status(400).json({ success: false, message: 'This professional has not responded to this job' });
        }
        if (response.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'This response has already been handled' });
        }

        const order = new Order({
            customerId: jobPost.customerId,
            labourId: req.params.labourId,
            service: jobPost.title,
            description: jobPost.description,
            amount: jobPost.budget,
            address: jobPost.address,
            status: 'pending'
        });

        await order.save();

        response.status = 'accepted';
        response.orderId = order._id;

        const stillNeeded = jobPost.workersNeeded - jobPost.acceptedCount();
        if (stillNeeded <= 0) {
            jobPost.status = 'closed';
        }

        await jobPost.save();

        await notify(
            req.params.labourId,
            'response_accepted',
            `You were hired for "${jobPost.title}"! Check your requests.`,
            '/orders',
            jobPost._id
        );

        res.json({
            success: true,
            message: stillNeeded > 0
                ? `Request sent! Still looking for ${stillNeeded} more worker(s).`
                : 'Request sent! Job post closed.',
            orderId: order._id
        });
    } catch (error) {
        console.error('Error accepting job response:', error);
        res.status(500).json({ success: false, message: 'Error accepting response' });
    }
});

// Customer declines a worker's response without hiring them
app.post('/jobs/:id/decline/:labourId', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login first' });
    }

    try {
        const jobPost = await JobPost.findById(req.params.id);
        if (!jobPost || jobPost.customerId.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const response = jobPost.responses.find(
            r => r.labourId.toString() === req.params.labourId
        );
        if (!response || response.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Nothing to decline' });
        }

        response.status = 'declined';
        await jobPost.save();

        await notify(
            req.params.labourId,
            'response_declined',
            `Your response to "${jobPost.title}" was not selected.`,
            '/jobs',
            jobPost._id
        );

        res.json({ success: true, message: 'Response declined.' });
    } catch (error) {
        console.error('Error declining job response:', error);
        res.status(500).json({ success: false, message: 'Error declining response' });
    }
});

// Report a job post (spam, inappropriate, etc.)
app.post('/jobs/:id/report', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login to report a job' });
    }

    try {
        const jobPost = await JobPost.findById(req.params.id);
        if (!jobPost) {
            return res.status(404).json({ success: false, message: 'Job post not found' });
        }

        const alreadyReported = jobPost.reports.some(
            r => r.reportedBy.toString() === req.session.userId.toString()
        );
        if (alreadyReported) {
            return res.status(400).json({ success: false, message: 'You have already reported this job post' });
        }

        jobPost.reports.push({
            reportedBy: req.session.userId,
            reason: (req.body.reason || '').toString().trim().slice(0, 300)
        });

        await jobPost.save();

        res.json({ success: true, message: 'Thanks — this job post has been reported for review.' });
    } catch (error) {
        console.error('Error reporting job post:', error);
        res.status(500).json({ success: false, message: 'Error reporting job post' });
    }
});

// ==================== NOTIFICATIONS ====================

app.get('/notifications', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login' });
    }

    try {
        const notifications = await Notification.find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(30);

        const unreadCount = await Notification.countDocuments({
            userId: req.session.userId,
            isRead: false
        });

        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error('Error loading notifications:', error);
        res.status(500).json({ success: false, message: 'Error loading notifications' });
    }
});

app.post('/notifications/:id/read', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login' });
    }

    try {
        await Notification.updateOne(
            { _id: req.params.id, userId: req.session.userId },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ success: false, message: 'Error updating notification' });
    }
});

app.post('/notifications/read-all', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login' });
    }

    try {
        await Notification.updateMany(
            { userId: req.session.userId, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications read:', error);
        res.status(500).json({ success: false, message: 'Error updating notifications' });
    }
});

// Update Order Status (labour accepts/rejects/completes a request)
app.post('/update-order-status', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Please login to manage orders' });
    }
    try {
        const { orderId, status } = req.body;
        const allowedStatuses = ['in-progress', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const order = await Order.findOne({ _id: orderId, labourId: req.session.userId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or not authorized' });
        }
        order.status = status;
        if (status === 'completed') order.completedDate = new Date();
        await order.save();
        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
});

// Available Orders - redirect to new orders page
app.get('/available-orders', (req, res) => {
    if (!req.session?.userId) return res.redirect('/login');
    res.redirect('/orders');
});

// Orders Page - dedicated requests management page for labour
app.get('/orders', async (req, res) => {
    if (!req.session?.userId) return res.redirect('/login');
    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.userType !== 'labour') return res.redirect('/profile/customer');

        const orders = await Order.find({ labourId: req.session.userId })
            .populate('customerId', 'name profileImage phone')
            .sort({ createdAt: -1 });

        res.render('orders', { labour: user, orders });
    } catch (error) {
        console.error('Error loading orders page:', error);
        res.status(500).render('error', { error: 'Error loading orders', user: null });
    }
});

// Chat Page
app.get('/chat/:orderId', async (req, res) => {
    if (!req.session?.userId) return res.redirect('/login');
    try {
        const Message = require('./models/message');
        const order = await Order.findById(req.params.orderId)
            .populate('customerId', 'name profileImage phone')
            .populate('labourId', 'name profileImage phone');

        if (!order) return res.status(404).render('404', { user: null });

        // Only the two parties can access this chat
        const isCustomer = order.customerId._id.toString() === req.session.userId;
        const isLabour   = order.labourId._id.toString()   === req.session.userId;
        if (!isCustomer && !isLabour) return res.status(403).render('error', { error: 'Access denied', user: null });

        const messages = await Message.find({ orderId: order._id })
            .populate('senderId', 'name profileImage')
            .sort({ createdAt: 1 });

        const otherUser  = isCustomer ? order.labourId : order.customerId;
        const viewerType = isCustomer ? 'customer' : 'labour';
        const backUrl    = isCustomer ? '/profile/customer' : '/orders';

        res.render('chat', { order, messages, otherUser, currentUserId: req.session.userId, viewerType, backUrl });
    } catch (error) {
        console.error('Error loading chat:', error);
        res.status(500).render('error', { error: 'Error loading chat', user: null });
    }
});

// Send a chat message
app.post('/chat/:orderId/send', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Not logged in' });
    try {
        const Message = require('./models/message');
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const isParty = [order.customerId.toString(), order.labourId.toString()].includes(req.session.userId);
        if (!isParty) return res.status(403).json({ success: false, message: 'Access denied' });

        if (order.status !== 'in-progress') {
            return res.status(403).json({ success: false, message: 'Chat is only available while the job is in progress' });
        }

        const text = (req.body.text || '').trim();
        if (!text) return res.status(400).json({ success: false, message: 'Message cannot be empty' });
        if (text.length > 1000) return res.status(400).json({ success: false, message: 'Message too long' });

        const msg = new Message({ orderId: order._id, senderId: req.session.userId, text });
        await msg.save();

        res.json({ success: true, message: { _id: msg._id, senderId: req.session.userId, text: msg.text, createdAt: msg.createdAt } });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

// Poll for new messages (long-polling fallback)
app.get('/chat/:orderId/poll', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ success: false });
    try {
        const Message = require('./models/message');
        const order = await Order.findById(req.params.orderId).select('status customerId labourId');
        if (!order) return res.status(404).json({ success: false });

        const isParty = [order.customerId.toString(), order.labourId.toString()].includes(req.session.userId);
        if (!isParty) return res.status(403).json({ success: false });

        const since = req.query.since ? new Date(req.query.since) : new Date(0);
        const messages = await Message.find({ orderId: order._id, createdAt: { $gt: since } })
            .populate('senderId', 'name profileImage')
            .sort({ createdAt: 1 });

        res.json({
            messages: messages.map(m => ({
                _id: m._id,
                senderId: m.senderId._id.toString(),
                text: m.text,
                createdAt: m.createdAt
            })),
            orderStatus: order.status
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Leave Review for Professional
app.post('/leave-review', async (req, res) => {

    if (!req.session?.userId) {
        return res.status(401).json({
            success: false,
            message: 'Please login to leave a review'
        });
    }

    try {

        const {
            professionalId,
            rating,
            comment,
            orderId
        } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.customerId.toString() !== req.session.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized review'
            });
        }

        if (order.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'You can only review completed orders'
            });
        }

        if (order.customerRating) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this order'
            });
        }

        order.customerRating = parseInt(rating);
        order.customerReview = comment;
        order.reviewDate = new Date();

        await order.save();

        const professionalReviews = await Order.find({
            labourId: professionalId,
            customerRating: { $exists: true }
        });

        const totalReviews = professionalReviews.length;

        const averageRating =
            totalReviews > 0
                ? professionalReviews.reduce(
                    (sum, review) => sum + review.customerRating,
                    0
                ) / totalReviews
                : 0;

        await User.findByIdAndUpdate(
            professionalId,
            {
                rating: Number(
                    averageRating.toFixed(1)
                ),
                totalReviews
            }
        );

        res.json({
            success: true,
            message: 'Review submitted successfully!',
            averageRating: averageRating.toFixed(1),
            totalReviews
        });

    } catch (error) {

        console.error(
            'Error leaving review:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Error submitting review'
        });
    }
});



// Customer Profile
app.get('/profile/customer', async (req, res) => {
    if (!req.session?.userId) {
        return res.redirect('/login');
    }
    
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.redirect('/login');
        }
        
        if (user.userType !== 'customer') {
            return res.redirect('/profile/labour');
        }
        
        const orders = await Order.find({ customerId: req.session.userId })
            .populate('labourId', 'name profession profileImage')
            .sort({ createdAt: -1 });

        const myJobPosts = await JobPost.find({ customerId: req.session.userId })
            .sort({ createdAt: -1 });

        res.render('customerProfile', { 
            customer: user, 
            orders,
            myJobPosts
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
    if (!req.session?.userId) {
        return res.redirect('/login');
    }
    
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.redirect('/login');
        }
        
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
    if (!req.session?.userId) {
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
    if (!req.session?.userId) {
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
        
        if (req.file) {
            updateData.profileImage = req.file.path;
            console.log('Cloudinary Image URL:', updateData.profileImage);
        }
        
        const user = await User.findById(req.session.userId);
        if (user.userType === 'labour') {
            updateData.profession = profession;
            updateData.experience = experience;
            updateData.wagePerHour = parseFloat(wagePerHour);
            updateData.wagePerDay = parseFloat(wagePerDay);
        }
        
        await User.findByIdAndUpdate(req.session.userId, updateData);
        
        if (user.userType === 'customer') {
            res.redirect('/profile/customer');
        } else {
            res.redirect('/profile/labour');
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).render('error', { 
            error: 'Error updating profile',
            user: req.session?.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// ==================== LABOUR MANAGEMENT ROUTES ====================

// Find Labour Page

app.get('/find-labour', async (req, res) => {
    try {

        const {
            search,
            profession,
            minRating,
            maxPrice,
            sortBy,
            latitude,
            longitude,
            page
        } = req.query;

        const PAGE_SIZE = 20;
        const currentPage = Math.max(1, parseInt(page) || 1);
        const skipCount = (currentPage - 1) * PAGE_SIZE;

        let filter = {
            userType: 'labour',
            isActive: true
        };

        if (search) {
            filter.$or = [
                {
                    name: {
                        $regex: search,
                        $options: 'i'
                    }
                },
                {
                    profession: {
                        $regex: search,
                        $options: 'i'
                    }
                },
                {
                    'address.city': {
                        $regex: search,
                        $options: 'i'
                    }
                }
            ];
        }

        if (profession && profession !== 'all') {
            filter.profession = profession;
        }

        if (minRating) {
            filter.rating = {
                $gte: parseFloat(minRating)
            };
        }

        if (maxPrice) {
            filter.wagePerHour = {
                $lte: parseFloat(maxPrice)
            };
        }

        let labours;
        let totalCount;

        // =========================
        // NEAREST WORKER ALGORITHM
        // =========================

        if (latitude && longitude) {

            totalCount = await User.countDocuments(filter);

            labours = await User.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: [
                                parseFloat(longitude),
                                parseFloat(latitude)
                            ]
                        },
                        distanceField: "distance",
                        spherical: true,
                        query: filter
                    }
                },
                { $skip: skipCount },
                { $limit: PAGE_SIZE }
            ]);

        } else {

            let sortOptions = {};

            switch (sortBy) {

                case 'rating':
                    sortOptions = { rating: -1 };
                    break;

                case 'price-low':
                    sortOptions = { wagePerHour: 1 };
                    break;

                case 'price-high':
                    sortOptions = { wagePerHour: -1 };
                    break;

                default:
                    sortOptions = {
                        rating: -1,
                        totalReviews: -1
                    };
            }

            totalCount = await User.countDocuments(filter);

            labours = await User
                .find(filter)
                .sort(sortOptions)
                .skip(skipCount)
                .limit(PAGE_SIZE);
        }

        const hasMore = skipCount + labours.length < totalCount;

        // AJAX "Load More" requests just want the next page of cards as JSON
        if (req.query.format === 'json') {
            return res.json({
                success: true,
                labours,
                hasMore,
                nextPage: currentPage + 1,
                totalCount
            });
        }

        const professions = await User.distinct(
            'profession',
            {
                userType: 'labour'
            }
        );

        res.render('findLabour', {
            labours,
            professions,
            hasMore,
            currentPage,
            totalCount,
            searchParams: {
                search: search || '',
                profession: profession || '',
                minRating: minRating || '',
                maxPrice: maxPrice || '',
                sortBy: sortBy || 'rating',
                latitude: latitude || '',
                longitude: longitude || ''
            },
            user: req.session?.userId
                ? await User.findById(req.session.userId)
                : null
        });

    } catch (error) {

        console.error(error);

        if (req.query.format === 'json') {
            return res.status(500).json({ success: false, message: 'Error loading more professionals' });
        }

        res.status(500).render('error', {
            error: 'Error loading labour search page',
            user: req.session?.userId
                ? await User.findById(req.session.userId)
                : null
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
                user: req.session?.userId ? await User.findById(req.session.userId) : null 
            });
        }
        
        res.render('labourDetail', {
            labour,
            works,
            reviews,
            user: req.session?.userId ? await User.findById(req.session.userId) : null
        });
        
    } catch (error) {
        console.error('Error loading labour detail:', error);
        res.status(500).render('error', { 
            error: 'Error loading labour profile',
            user: req.session?.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Add new work
app.post('/add-work', workUpload.array('workImages', 5), async (req, res) => {
    if (!req.session?.userId || req.session.userType !== 'labour') {
        return res.redirect('/login');
    }
    
    try {
        const { title, description, clientName, completedDate } = req.body;
        
        const work = new Work({
            labourId: req.session.userId,
            title,
            description,
            clientName,
            completedDate: completedDate ? new Date(completedDate) : new Date(),
            images: req.files ? req.files.map(f => f.path) : []
        });
        
        await work.save();
        res.redirect('/profile/labour');
    } catch (error) {
        console.error('Error adding work:', error);
        res.status(500).render('error', { 
            error: 'Error adding work',
            user: req.session?.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Update wage information
app.post('/update-wage', async (req, res) => {
    if (!req.session?.userId || req.session.userType !== 'labour') {
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
            user: req.session?.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use(async (req, res) => {
    res.status(404).render('404', { 
        user: req.session?.userId ? await User.findById(req.session.userId) : null 
    });
});

// Error Handler
app.use(async (err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).render('error', { 
        error: 'Internal server error',
        user: req.session?.userId ? await User.findById(req.session.userId) : null 
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});