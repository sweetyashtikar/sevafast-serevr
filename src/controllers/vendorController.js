const User = require("../models/User");

const getVendorsByFieldManager = async (req, res) => {
  try {
    const { id } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const searchQuery = {
      field_manager: id,
      username: { $regex: search, $options: "i" },
    };

    const vendors = await User.find(searchQuery)
      .populate("role", "role")
      .populate("field_manager", "username email mobile")
      .select("-password -apikey")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: {
        vendors,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getVendorsByFieldManager,
};