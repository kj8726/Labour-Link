const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    userType: {
        type: String,
        enum: ['customer', 'labour'],
        required: true
    },
    profession: {
        type: String,
        required: function() { return this.userType === 'labour'; }
    },
    experience: {
        type: String,
        required: function() { return this.userType === 'labour'; }
    },
    wagePerHour: {
        type: Number,
        required: function() { return this.userType === 'labour'; }
    },
    wagePerDay: {
        type: Number,
        required: function() { return this.userType === 'labour'; }
    },
    profileImage: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);