const mongoose = require('mongoose');

const PROFESSIONS = [
    'Plumber',
    'Electrician',
    'Carpenter',
    'Painter',
    'Mason',
    'AC Repair',
    'Cleaner',
    'Gardener',
    'Welder',
    'Mechanic',
    'Technician'
];

// How long a job post stays open before auto-expiring, if the customer
// doesn't close/cancel it sooner.
const DEFAULT_EXPIRY_DAYS = 14;

const jobPostSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    // null/undefined profession = general request, visible to all workers
    profession: {
        type: String,
        enum: PROFESSIONS,
        required: false,
        default: null
    },
    budget: Number,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    // open: accepting responses
    // closed: filled (enough workers hired) or manually closed by customer
    // cancelled: customer pulled the post without hiring anyone
    // expired: auto-closed after expiresAt passed
    status: {
        type: String,
        enum: ['open', 'closed', 'cancelled', 'expired'],
        default: 'open'
    },
    // How many workers this job needs. Once that many responses are
    // accepted, the post auto-closes. Defaults to 1 (single-hire jobs).
    workersNeeded: {
        type: Number,
        default: 1,
        min: 1
    },
    expiresAt: {
        type: Date,
        default: function() {
            return new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        }
    },
    // Workers who have responded/applied to this public posting.
    // Accepting a response creates a real Order via the existing direct-request
    // flow — this array just tracks who applied and the outcome.
    responses: [{
        labourId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: String,
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Lightweight abuse reporting. Doesn't auto-hide the post; gives
    // admins/customers a signal something needs review.
    reports: [{
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        reason: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

jobPostSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// How many responses on this post have been accepted so far.
jobPostSchema.methods.acceptedCount = function() {
    return this.responses.filter(r => r.status === 'accepted').length;
};

jobPostSchema.statics.PROFESSIONS = PROFESSIONS;
jobPostSchema.statics.DEFAULT_EXPIRY_DAYS = DEFAULT_EXPIRY_DAYS;

module.exports = mongoose.model('JobPost', jobPostSchema);