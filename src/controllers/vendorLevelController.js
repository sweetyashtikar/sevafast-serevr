const VendorLevel = require('../models/vendorLevel');

// Get all vendor levels
exports.getAllLevels = async (req, res) => {
    try {
        const query = {};
        if (req.query.subscriptionId) {
            query.subscriptionId = req.query.subscriptionId;
        }
        const levels = await VendorLevel.find(query).sort({ salesThreshold: 1 });
        res.json({ success: true, data: levels });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new vendor level
exports.createLevel = async (req, res) => {
    try {
        const { subscriptionId, levelName, salesThreshold, cashbackPercentage, description } = req.body;
        
        if (!subscriptionId) {
            return res.status(400).json({ success: false, message: "Subscription ID is required" });
        }

        const level = new VendorLevel({
            subscriptionId,
            levelName,
            salesThreshold,
            cashbackPercentage,
            description
        });
        
        await level.save();
        res.status(201).json({ success: true, data: level });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update a vendor level
exports.updateLevel = async (req, res) => {
    try {
        const level = await VendorLevel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!level) return res.status(404).json({ success: false, message: "Level not found" });
        res.json({ success: true, data: level });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a vendor level
exports.deleteLevel = async (req, res) => {
    try {
        const level = await VendorLevel.findByIdAndDelete(req.params.id);
        if (!level) return res.status(404).json({ success: false, message: "Level not found" });
        res.json({ success: true, message: "Level deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
