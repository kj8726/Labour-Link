const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
    labourId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    images: [{
        url: String,
        caption: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    clientName: String,
    clientPhone: String,
    clientEmail: String,
    completedDate: {
        type: Date,
        required: true
    },
    amount: Number,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: String,
    tags: [String],
    location: {
        address: String,
        city: String,
        state: String
    },
    isFeatured: {
        type: Boolean,
        default: false
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

workSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Work', workSchema);