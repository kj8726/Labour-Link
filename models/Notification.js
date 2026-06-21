const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['new_job_match', 'new_response', 'response_accepted', 'response_declined', 'job_expired'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    link: String, // where clicking the notification should take the user
    jobPostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobPost'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);