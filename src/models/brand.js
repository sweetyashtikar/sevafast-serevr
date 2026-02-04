const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters'],
    minlength: [2, 'Brand name must be at least 2 characters long']
  },
  
  icon: {
    type: String,
    // required: [true, 'Brand icon is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Basic URL validation or emoji/icon string validation
        return v && v.length > 0;
      },
      message: 'Icon must be a valid string'
    }
  },
  
  status: {
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update the updatedAt field before saving
brandSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
});

// Create text index for searching
brandSchema.index({ name: 'text' });

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;