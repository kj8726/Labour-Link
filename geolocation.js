require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// User Schema (make sure this matches your existing schema)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    age: Number,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        }
    },
    userType: {
        type: String,
        enum: ['customer', 'labour']
    },
    profession: String,
    experience: String,
    wagePerHour: Number,
    wagePerDay: Number,
    rating: Number,
    totalReviews: Number,
    profileImage: String
});

// Create 2dsphere index for location
userSchema.index({ location: '2dsphere' });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const seedGeolocationData = async () => {
    try {
        console.log('🌍 Starting geolocation data seeding...');
        
        const laboursWithGeolocation = [
            // Original 6 labours from major cities
            {
                name: "Rajesh Kumar",
                email: "rajesh.plumbewfer@example.com",
                password: "password123",
                phone: "+91-9876543210",
                age: 35,
                address: {
                    street: "123 Main Street",
                    city: "Mumbai",
                    state: "MH",
                    zipCode: "400001"
                },
                location: {
                    type: "Point",
                    coordinates: [72.8777, 19.0760] // Mumbai
                },
                userType: "labour",
                profession: "Plumber",
                experience: "8 years",
                wagePerHour: 25,
                wagePerDay: 180,
                rating: 4.5,
                totalReviews: 47,
                profileImage: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Amit Sharma",
                email: "amit.electridedcian@example.com",
                password: "password123",
                phone: "+91-9876543211",
                age: 42,
                address: {
                    street: "456 Electric Lane",
                    city: "Delhi",
                    state: "DL",
                    zipCode: "110001"
                },
                location: {
                    type: "Point",
                    coordinates: [77.2090, 28.6139] // Delhi
                },
                userType: "labour",
                profession: "Electrician",
                experience: "12 years",
                wagePerHour: 30,
                wagePerDay: 220,
                rating: 4.8,
                totalReviews: 89,
                profileImage: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face"
            },

            // MAHARASHTRA SPECIFIC LABOURS - PUNE AREA
            {
                name: "Sanjay Patil",
                email: "sanjay.pluewwmber@pune.com",
                password: "password123",
                phone: "+91-9876543220",
                age: 32,
                address: {
                    street: "45 Shivaji Nagar",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411005"
                },
                location: {
                    type: "Point",
                    coordinates: [73.8567, 18.5204] // Pune Central
                },
                userType: "labour",
                profession: "Plumber",
                experience: "6 years",
                wagePerHour: 22,
                wagePerDay: 160,
                rating: 4.3,
                totalReviews: 28,
                profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Ramesh Jadhav",
                email: "ramesh.electewcwrician@pune.com",
                password: "password123",
                phone: "+91-9876543221",
                age: 45,
                address: {
                    street: "78 Kothrud Road",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411038"
                },
                location: {
                    type: "Point",
                    coordinates: [73.8185, 18.5074] // Kothrud, Pune
                },
                userType: "labour",
                profession: "Electrician",
                experience: "15 years",
                wagePerHour: 28,
                wagePerDay: 200,
                rating: 4.7,
                totalReviews: 67,
                profileImage: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Vikas Deshmukh",
                email: "vikas.carpentwecer@pune.com",
                password: "password123",
                phone: "+91-9876543222",
                age: 38,
                address: {
                    street: "23 Karve Road",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411004"
                },
                location: {
                    type: "Point",
                    coordinates: [73.8302, 18.5080] // Karve Nagar, Pune
                },
                userType: "labour",
                profession: "Carpenter",
                experience: "12 years",
                wagePerHour: 26,
                wagePerDay: 190,
                rating: 4.6,
                totalReviews: 45,
                profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Mahesh Kulkarni",
                email: "mahesh.painter@pune.com",
                password: "password123",
                phone: "+91-9876543223",
                age: 41,
                address: {
                    street: "56 FC Road",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411005"
                },
                location: {
                    type: "Point",
                    coordinates: [73.8424, 18.5235] // FC Road, Pune
                },
                userType: "labour",
                profession: "Painter",
                experience: "14 years",
                wagePerHour: 24,
                wagePerDay: 170,
                rating: 4.5,
                totalReviews: 52,
                profileImage: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Deepak More",
                email: "deepak.acrepair@pune.com",
                password: "password123",
                phone: "+91-9876543224",
                age: 29,
                address: {
                    street: "89 Aundh Road",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411007"
                },
                location: {
                    type: "Point",
                    coordinates: [73.8194, 18.5624] // Aundh, Pune
                },
                userType: "labour",
                profession: "AC Repair",
                experience: "5 years",
                wagePerHour: 32,
                wagePerDay: 230,
                rating: 4.4,
                totalReviews: 31,
                profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Sachin Pawar",
                email: "sachin.cleaner@pune.com",
                password: "password123",
                phone: "+91-9876543225",
                age: 27,
                address: {
                    street: "34 Baner Road",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411045"
                },
                location: {
                    type: "Point",
                    coordinates: [73.7763, 18.5635] // Baner, Pune
                },
                userType: "labour",
                profession: "Cleaner",
                experience: "4 years",
                wagePerHour: 16,
                wagePerDay: 120,
                rating: 4.2,
                totalReviews: 23,
                profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Nitin Thakur",
                email: "nitin.gardener@pune.com",
                password: "password123",
                phone: "+91-9876543226",
                age: 50,
                address: {
                    street: "12 Koregaon Park",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411001"
                },
                location: {
                    type: "Point",
                    coordinates: [73.8952, 18.5393] // Koregaon Park, Pune
                },
                userType: "labour",
                profession: "Gardener",
                experience: "20 years",
                wagePerHour: 18,
                wagePerDay: 130,
                rating: 4.8,
                totalReviews: 89,
                profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Ajit Nair",
                email: "ajit.mason@pune.com",
                password: "password123",
                phone: "+91-9876543227",
                age: 44,
                address: {
                    street: "67 Hadapsar",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411028"
                },
                location: {
                    type: "Point",
                    coordinates: [73.9419, 18.4966] // Hadapsar, Pune
                },
                userType: "labour",
                profession: "Mason",
                experience: "18 years",
                wagePerHour: 20,
                wagePerDay: 150,
                rating: 4.7,
                totalReviews: 74,
                profileImage: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Prakash Joshi",
                email: "prakash.welder@pune.com",
                password: "password123",
                phone: "+91-9876543228",
                age: 36,
                address: {
                    street: "90 Pimpri",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411018"
                },
                location: {
                    type: "Point",
                    coordinates: [73.7923, 18.6279] // Pimpri, Pune
                },
                userType: "labour",
                profession: "Welder",
                experience: "9 years",
                wagePerHour: 30,
                wagePerDay: 210,
                rating: 4.5,
                totalReviews: 38,
                profileImage: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Rahul Bansal",
                email: "rahul.mechanic@pune.com",
                password: "password123",
                phone: "+91-9876543229",
                age: 31,
                address: {
                    street: "23 Chinchwad",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411033"
                },
                location: {
                    type: "Point",
                    coordinates: [73.7826, 18.6271] // Chinchwad, Pune
                },
                userType: "labour",
                profession: "Mechanic",
                experience: "7 years",
                wagePerHour: 28,
                wagePerDay: 200,
                rating: 4.4,
                totalReviews: 42,
                profileImage: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face"
            },
            {
                name: "Anand Iyer",
                email: "anand.technician@pune.com",
                password: "password123",
                phone: "+91-9876543230",
                age: 33,
                address: {
                    street: "56 Wakad",
                    city: "Pune",
                    state: "MH",
                    zipCode: "411057"
                },
                location: {
                    type: "Point",
                    coordinates: [73.7593, 18.5993] // Wakad, Pune
                },
                userType: "labour",
                profession: "Technician",
                experience: "8 years",
                wagePerHour: 35,
                wagePerDay: 240,
                rating: 4.6,
                totalReviews: 56,
                profileImage: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face"
            }
        ];

        // Hash passwords and create users
        const hashedLabours = await Promise.all(
            laboursWithGeolocation.map(async (labour) => {
                const hashedPassword = await bcrypt.hash(labour.password, 10);
                return { ...labour, password: hashedPassword };
            })
        );
        
        // Insert users
        const createdLabours = await User.insertMany(hashedLabours);
        
        console.log(`✅ Created ${createdLabours.length} labours with geolocation data`);
        
        console.log('🎉 Geolocation data seeding completed successfully!');
        console.log('\n📍 Labours added in:');
        console.log('   - Mumbai (1 labour)');
        console.log('   - Delhi (1 labour)');
        console.log('   - Pune (10 labours across different areas)');
        
        console.log('\n🏙️  Pune Areas Covered:');
        console.log('   - Shivaji Nagar, Kothrud, Karve Road, FC Road');
        console.log('   - Aundh, Baner, Koregaon Park, Hadapsar');
        console.log('   - Pimpri, Chinchwad, Wakad');
        
        console.log('\n🔑 Sample Pune Login:');
        console.log('   Email: sanjay.plumber@pune.com');
        console.log('   Password: password123');
        
        console.log('\n🗺️  Your map will now show dense markers in Pune area!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error seeding geolocation data:', error);
        process.exit(1);
    }
};

// Run the seeding
seedGeolocationData();