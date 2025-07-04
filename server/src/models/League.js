import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema({
    leagueId: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
leagueSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const League = mongoose.model('League', leagueSchema);

export default League; 