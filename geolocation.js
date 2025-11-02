const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to database first, then import models to avoid circular dependencies
const connectDB = require('./models/connection');

// Sample data with location coordinates
const sampleCustomers = [
    {
        name: "John Smith",
        email: "john.smith@example.com",
        password: "password123",
        phone: "+1-555-0101",
        age: 32,
        address: {
            street: "123 Main Street",
            city: "New York",
            state: "NY",
            zipCode: "10001"
        },
        location: {
            type: "Point",
            coordinates: [-74.0060, 40.7128]
        },
        userType: "customer",
        profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
        name: "Sarah Johnson",
        email: "sarah.j@example.com",
        password: "password123",
        phone: "+1-555-0102",
        age: 28,
        address: {
            street: "456 Oak Avenue",
            city: "Brooklyn",
            state: "NY",
            zipCode: "11201"
        },
        location: {
            type: "Point",
            coordinates: [-73.9442, 40.6782]
        },
        userType: "customer",
        profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    {
        name: "Mike Wilson",
        email: "mike.wilson@example.com",
        password: "password123",
        phone: "+1-555-0103",
        age: 45,
        address: {
            street: "789 Pine Road",
            city: "Queens",
            state: "NY",
            zipCode: "11355"
        },
        location: {
            type: "Point",
            coordinates: [-73.7949, 40.7282]
        },
        userType: "customer",
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    }
];

const sampleLabours = [
    {
        name: "Rajesh Kumar",
        email: "rajesh.plumber@example.com",
        password: "password123",
        phone: "+91-9876543210",
        age: 35,
        address: {
            street: "123 Worker Street",
            city: "Mumbai",
            state: "MH",
            zipCode: "400001"
        },
        location: {
            type: "Point",
            coordinates: [72.8777, 19.0760]
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
        email: "amit.electrician@example.com",
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
            coordinates: [77.2090, 28.6139]
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
    {
        name: "Suresh Patel",
        email: "suresh.carpenter@example.com",
        password: "password123",
        phone: "+91-9876543212",
        age: 38,
        address: {
            street: "789 Woodwork Road",
            city: "Ahmedabad",
            state: "GJ",
            zipCode: "380001"
        },
        location: {
            type: "Point",
            coordinates: [72.5714, 23.0225]
        },
        userType: "labour",
        profession: "Carpenter",
        experience: "15 years",
        wagePerHour: 20,
        wagePerDay: 150,
        rating: 4.3,
        totalReviews: 34,
        profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face"
    },
    {
        name: "Priya Singh",
        email: "priya.painter@example.com",
        password: "password123",
        phone: "+91-9876543213",
        age: 29,
        address: {
            street: "321 Color Street",
            city: "Bangalore",
            state: "KA",
            zipCode: "560001"
        },
        location: {
            type: "Point",
            coordinates: [77.5946, 12.9716]
        },
        userType: "labour",
        profession: "Painter",
        experience: "6 years",
        wagePerHour: 18,
        wagePerDay: 130,
        rating: 4.6,
        totalReviews: 56,
        profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    {
        name: "Vikram Yadav",
        email: "vikram.mason@example.com",
        password: "password123",
        phone: "+91-9876543214",
        age: 48,
        address: {
            street: "654 Construction Road",
            city: "Pune",
            state: "MH",
            zipCode: "411001"
        },
        location: {
            type: "Point",
            coordinates: [73.8567, 18.5204]
        },
        userType: "labour",
        profession: "Mason",
        experience: "20 years",
        wagePerHour: 22,
        wagePerDay: 160,
        rating: 4.7,
        totalReviews: 78,
        profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    }
];

const sampleWorks = [
    {
        title: "Kitchen Plumbing Repair",
        description: "Fixed leaking pipes and installed new faucet in kitchen.",
        images: [
            "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop",
            "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop"
        ],
        clientName: "Mrs. Gupta",
        clientPhone: "+91-9876543290",
        completedDate: new Date('2023-10-15'),
        amount: 3500,
        rating: 5,
        review: "Excellent work! Rajesh was punctual and professional.",
        tags: ["plumbing", "kitchen", "repair"],
        location: {
            address: "456 Luxury Apartments",
            city: "Mumbai",
            state: "MH"
        },
        isFeatured: true
    },
    {
        title: "Complete House Wiring",
        description: "Rewired entire 3BHK apartment with modern safety standards.",
        images: [
            "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop"
        ],
        clientName: "Mr. Iyer",
        clientPhone: "+91-9876543291",
        completedDate: new Date('2023-10-10'),
        amount: 25000,
        rating: 5,
        review: "Amit did a fantastic job. Very professional and neat work.",
        tags: ["electrical", "wiring", "installation"],
        location: {
            address: "789 Green Valley",
            city: "Delhi",
            state: "DL"
        },
        isFeatured: true
    }
];

const sampleOrders = [
    {
        service: "Bathroom Plumbing Repair",
        description: "Fix leaking shower and replace bathroom faucet",
        status: "completed",
        amount: 2800,
        address: {
            street: "123 Main Street",
            city: "New York",
            state: "NY",
            zipCode: "10001"
        },
        scheduledDate: new Date('2023-10-12'),
        completedDate: new Date('2023-10-12'),
        customerRating: 5,
        customerReview: "Excellent service! Fixed everything quickly.",
        images: [
            "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=300&fit=crop"
        ]
    },
    {
        service: "Electrical Socket Installation",
        description: "Install 5 new electrical sockets in living room",
        status: "completed",
        amount: 1500,
        address: {
            street: "456 Oak Avenue",
            city: "Brooklyn",
            state: "NY",
            zipCode: "11201"
        },
        scheduledDate: new Date('2023-10-08'),
        completedDate: new Date('2023-10-08'),
        customerRating: 4,
        customerReview: "Good work, but arrived 30 minutes late.",
        images: []
    }
];

const seedDatabase = async () => {
    try {
        // Connect to database first
        await connectDB();
        
        // Import models AFTER connection to avoid circular dependencies
        const User = require('./models/User');
        const Order = require('./models/Order');
        const Work = require('./models/Work');
        
        console.log('🌱 Starting database seeding...');
        
        // Clear existing data
        await User.deleteMany({});
        await Order.deleteMany({});
        await Work.deleteMany({});
        
        console.log('🗑️ Cleared existing data');
        
        // Hash passwords and create users
        const hashedCustomers = await Promise.all(
            sampleCustomers.map(async (customer) => {
                const hashedPassword = await bcrypt.hash(customer.password, 10);
                return { ...customer, password: hashedPassword };
            })
        );
        
        const hashedLabours = await Promise.all(
            sampleLabours.map(async (labour) => {
                const hashedPassword = await bcrypt.hash(labour.password, 10);
                return { ...labour, password: hashedPassword };
            })
        );
        
        // Insert users
        const createdCustomers = await User.insertMany(hashedCustomers);
        const createdLabours = await User.insertMany(hashedLabours);
        
        console.log(`✅ Created ${createdCustomers.length} customers and ${createdLabours.length} labours`);
        
        // Create works with labour references
        const worksWithLabourIds = sampleWorks.map((work, index) => ({
            ...work,
            labourId: createdLabours[index]._id
        }));
        
        const createdWorks = await Work.insertMany(worksWithLabourIds);
        console.log(`✅ Created ${createdWorks.length} works`);
        
        // Create orders with customer and labour references
        const ordersWithReferences = sampleOrders.map((order, index) => ({
            ...order,
            customerId: createdCustomers[index]._id,
            labourId: createdLabours[index]._id
        }));
        
        const createdOrders = await Order.insertMany(ordersWithReferences);
        console.log(`✅ Created ${createdOrders.length} orders`);
        
        console.log('🎉 Database seeding completed successfully!');
        console.log('\n📊 Sample Data Summary:');
        console.log(`   👥 Customers: ${createdCustomers.length}`);
        console.log(`   🔧 Labours: ${createdLabours.length}`);
        console.log(`   📝 Works: ${createdWorks.length}`);
        console.log(`   📦 Orders: ${createdOrders.length}`);
        
        console.log('\n📍 All users have location coordinates for the map');
        console.log('\n🔑 Sample Login Credentials:');
        console.log('   Customers:');
        sampleCustomers.forEach(customer => {
            console.log(`     Email: ${customer.email} | Password: ${customer.password}`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;