const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    iso3: { type: String, length: 3, uppercase: true },
    iso2: { type: String, length: 2, uppercase: true },
    numeric_code: { type: String },
    phonecode: { type: String },
    capital: { type: String },
    
    currency_info: {
        code: { type: String }, // e.g., 'AFN'
        name: { type: String }, // e.g., 'Afghan afghani'
        symbol: { type: String } // e.g., '؋'
    },

    tld: { type: String }, // Top Level Domain
    native: { type: String },
    region: { type: String },
    subregion: { type: String },

    // Standardized Geo-Location
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { 
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    },

    // Stored as an array of objects for easy querying
    timezones: [{
        zoneName: String,
        gmtOffset: Number,
        gmtOffsetName: String,
        abbreviation: String,
        tzName: String
    }],

    // Map for translations (allows querying like translations.kr)
    translations: {
        type: Map,
        of: String
    },

    emoji: { type: String },
    emojiU: { type: String },
    flag_active: { type: Boolean, default: true },
    wikiDataId: { type: String }
}, { 
    timestamps: true 
});

// Indexes for fast international lookups
countrySchema.index({ iso2: 1 });
countrySchema.index({ iso3: 1 });
countrySchema.index({ name: 1 });

module.exports = mongoose.model('Country', countrySchema);