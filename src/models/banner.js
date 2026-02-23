// models/Banner.js
const mongoose = require('mongoose');

const BannerType = {
    DEAL_OF_THE_DAY: 'deal of the day',
    HOME: 'home',
    HEADER: 'header',
    FOOTER: 'footer',
    COUPONS: 'coupons',
    ABOUT_US: 'about us',
    CATEGORY: 'category',
    PRODUCTS: 'products',
    CONTACT_US: 'contact us'
}

const bannerSchema = new mongoose.Schema({
    bannerType: {
        type: String,
        required: [true, 'Banner type is required'],
        enum: Object.values(BannerType),
        index: true
    },
    image: {
        type: String,
        required: [true, 'Banner image is required']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: function () {
            return this.bannerType === 'category';
        },
        validate: {
            validator: function (value) {
                // If banner type is 'category', category field is required
                if (this.bannerType === 'category' && !value) {
                    return false;
                }
                return true;
            },
            message: 'Category is required when banner type is "category"'
        }
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    status: {
        type: Boolean,
        default: true,
        index: true
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for efficient querying
bannerSchema.index({ bannerType: 1, isActive: 1, displayOrder: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if banner is currently active based on dates
bannerSchema.virtual('isCurrentlyActive').get(function () {
    const now = new Date();
    if (!this.isActive) return false;
    if (this.startDate && this.startDate > now) return false;
    if (this.endDate && this.endDate < now) return false;
    return true;
});

// Pre-save middleware to validate dates
bannerSchema.pre('save', function (next) {
    if (this.endDate && this.startDate && this.endDate < this.startDate) {
        next(new Error('End date cannot be before start date'));
    }
});

module.exports = mongoose.model('Banner', bannerSchema);