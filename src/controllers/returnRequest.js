const ReturnRequest = require('../models/returnRequest')
const Order = require('../models/orders')
const OrderItem = require('../models/orderItem')
const Product = require('../models/products')

const approveReturn = async (requestId, adminRemarks) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Update Return Request
        const request = await ReturnRequest.findByIdAndUpdate(
            requestId,
            { status: 1, remarks: adminRemarks },
            { session, new: true }
        );

        // 2. Update the OrderItem status to 'Returned'
        await OrderItem.findByIdAndUpdate(
            request.order_item_id,
            { active_status: 'returned' },
            { session }
        );

        // 3. Optional: Add logic to restock the ProductVariant or initiate Wallet Refund

        await session.commitTransaction();
        return request;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// @desc    Create a new return request
// @route   POST /api/return-requests
// @access  Private
const createReturnRequest = async (req, res) => {
  try {
    const {
      product_id,
      product_variant_id,
      order_id,
      order_item_id,
      remarks,
    } = req.body;

    // Verify if the order item belongs to the user
    const orderItem = await OrderItem.findById(order_item_id)
      .populate({
        path: "order_id",
        match: { user_id: req.user._id }
      });

    if (!orderItem || !orderItem.order_id) {
      return res.status(404).json({
        success: false,
        message: "Order item not found or doesn't belong to you"
      });
    }

    // Check if return request already exists for this order item
    const existingReturn = await ReturnRequest.findOne({
      order_item_id,
      status: { $ne: "rejected" } // Exclude rejected requests
    });

    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: "Return request already exists for this item"
      });
    }

    // Create return request
    const returnRequest = await ReturnRequest.create({
      user_id: req.user._id,
      product_id,
      product_variant_id,
      order_id,
      order_item_id,
      remarks,
    });

    res.status(201).json({
      success: true,
      data: returnRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating return request",
      error: error.message,
    });
  }
};

// @desc    Get all return requests (with filters for admin)
// @route   GET /api/return-requests
// @access  Private/Admin
const getReturnRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, sort = "-createdAt" } = req.query;

    // Build filter object
    const filter = {};
    
    // Non-admin users can only see their own requests
    if (req.user.role !== "admin") {
      filter.user_id = req.user._id;
    }
    
    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Execute query with population
    const returnRequests = await ReturnRequest.find(filter)
      .populate("user_id", "name email")
      .populate("product_id", "name images")
      .populate("product_variant_id", "size color price")
      .populate("order_id", "orderNumber totalAmount")
      .populate("order_item_id", "quantity price")
      .sort(sort)
      .skip(skip)
      .limit(limitNumber);

    // Get total count for pagination
    const total = await ReturnRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: returnRequests.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      data: returnRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching return requests",
      error: error.message,
    });
  }
};

// @desc    Get single return request
// @route   GET /api/return-requests/:id
// @access  Private
const getReturnRequestById = async (req, res) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id)
      .populate("user_id", "name email phone")
      .populate("product_id", "name images description")
      .populate("product_variant_id", "size color price sku")
      .populate("order_id", "orderNumber totalAmount paymentMethod")
      .populate("order_item_id", "quantity price subtotal");

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    // Check if user has permission to view this request
    if (req.user.role !== "admin" && returnRequest.user_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this return request",
      });
    }

    res.status(200).json({
      success: true,
      data: returnRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching return request",
      error: error.message,
    });
  }
};

// @desc    Update return request status (Admin only)
// @route   PUT /api/return-requests/:id/status
// @access  Private/Admin
const updateReturnRequestStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const returnRequest = await ReturnRequest.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    // Update status and remarks if provided
    returnRequest.status = status;
    if (remarks) {
      returnRequest.remarks = remarks;
    }

    await returnRequest.save();

    // Here you can add logic to handle different status updates
    // e.g., process refund when status becomes REFUNDED
    if (status === "refunded") {
      // Trigger refund process
      // await processRefund(returnRequest);
    }

    res.status(200).json({
      success: true,
      message: `Return request ${status} successfully`,
      data: returnRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating return request",
      error: error.message,
    });
  }
};

// @desc    Update return request (User can only update remarks)
// @route   PUT /api/return-requests/:id
// @access  Private
const updateReturnRequest = async (req, res) => {
  try {
    const { remarks } = req.body;
    if(!req.body.remarks){
         return res.status(400).json({
        success: false,
        message: "Please enter Remarks",
      });
    }

    const returnRequest = await ReturnRequest.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    // Check if user owns this request
    if (returnRequest.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this return request",
      });
    }

    // Only allow updates if status is pending
    if (returnRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update return request after it has been processed",
      });
    }

    // Update only remarks
    if (remarks) {
      returnRequest.remarks = remarks;
      await returnRequest.save();
    }

    res.status(200).json({
      success: true,
      message: "Return request updated successfully",
      data: returnRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating return request",
      error: error.message,
    });
  }
};

// @desc    Cancel return request (User only)
// @route   DELETE /api/return-requests/:id
// @access  Private
const cancelReturnRequest = async (req, res) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    // Check if user owns this request
    if (returnRequest.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this return request",
      });
    }

    // Only allow cancellation if status is pending
    if (returnRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel return request after it has been processed",
      });
    }

    await returnRequest.deleteOne();

    res.status(200).json({
      success: true,
      message: "Return request cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling return request",
      error: error.message,
    });
  }
};

// @desc    Get return request statistics (Admin only)
// @route   GET /api/return-requests/stats
// @access  Private/Admin
const getReturnStats = async (req, res) => {
  try {
    const stats = await ReturnRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await ReturnRequest.countDocuments();

    res.status(200).json({
      success: true,
      total,
      stats: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching return statistics",
      error: error.message,
    });
  }
};



// const validateReturnRequest = {
//   create: [
//     body("product_id")
//       .notEmpty()
//       .withMessage("Product ID is required")
//       .isMongoId()
//       .withMessage("Invalid Product ID format"),
    
//     body("product_variant_id")
//       .notEmpty()
//       .withMessage("Product variant ID is required")
//       .isMongoId()
//       .withMessage("Invalid Product Variant ID format"),
    
//     body("order_id")
//       .notEmpty()
//       .withMessage("Order ID is required")
//       .isMongoId()
//       .withMessage("Invalid Order ID format"),
    
//     body("order_item_id")
//       .notEmpty()
//       .withMessage("Order item ID is required")
//       .isMongoId()
//       .withMessage("Invalid Order Item ID format"),
    
//     body("remarks")
//       .optional()
//       .isString()
//       .trim()
//       .isLength({ max: 500 })
//       .withMessage("Remarks cannot exceed 500 characters"),
    
//     (req, res, next) => {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ 
//           success: false, 
//           errors: errors.array() 
//         });
//       }
//       next();
//     },
//   ],

//   updateStatus: [
//     param("id")
//       .isMongoId()
//       .withMessage("Invalid return request ID"),
    
//     body("status")
//       .notEmpty()
//       .withMessage("Status is required")
//       .isIn(["pending", "approved", "rejected", "picked_up", "refunded"])
//       .withMessage("Invalid status value"),
    
//     body("remarks")
//       .optional()
//       .isString()
//       .trim()
//       .isLength({ max: 500 })
//       .withMessage("Remarks cannot exceed 500 characters"),
    
//     (req, res, next) => {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ 
//           success: false, 
//           errors: errors.array() 
//         });
//       }
//       next();
//     },
//   ],

//   updateRemarks: [
//     param("id")
//       .isMongoId()
//       .withMessage("Invalid return request ID"),
    
//     body("remarks")
//       .optional()
//       .isString()
//       .trim()
//       .isLength({ max: 500 })
//       .withMessage("Remarks cannot exceed 500 characters"),
    
//     (req, res, next) => {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ 
//           success: false, 
//           errors: errors.array() 
//         });
//       }
//       next();
//     },
//   ],

//   idParam: [
//     param("id")
//       .isMongoId()
//       .withMessage("Invalid return request ID"),
    
//     (req, res, next) => {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ 
//           success: false, 
//           errors: errors.array() 
//         });
//       }
//       next();
//     },
//   ],
// };

// module.exports = validateReturnRequest;

module.exports = {
  createReturnRequest,
  getReturnRequests,
  getReturnRequestById,
  updateReturnRequestStatus,
  updateReturnRequest,
  cancelReturnRequest,
  getReturnStats,
};