const OrderTracking = require("../models/orderTracking")
    
    
    
const getTrackingDetails = async (req, res) => {
    const { orderItemId } = req.params;

    try {
        const tracking = await OrderTracking.findOne({ order_item_id: orderItemId });

        if (!tracking) {
            return res.status(404).json({ message: "Tracking information not found." });
        }

        res.status(200).json({
            success: true,
            agency: tracking.courier_agency,
            id: tracking.tracking_id,
            tracking_url: tracking.url
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
