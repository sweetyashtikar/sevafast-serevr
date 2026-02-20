const Brand = require('../models/brand');

// @desc    Create a new brand
// @route   POST /api/brands
// @access  Public/Private (adjust as needed)
const createBrand = async (req, res) => {
  const { name, status } = req.body;
const icon = req.files?.icon?.[0]?.path; 
  console.log("req.body", req.body)
  try {

    // Check if brand already exists
    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists'
      });
    }

    // Create brand
    const brand = await Brand.create({
      name,
      icon,
     status: status !== undefined ? status : true
    });
    console.log("brand", brand)

    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand
    });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public/Private
const getAllBrands = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Brand.countDocuments();

    // Filtering
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Sorting
    const sort = {};
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.order === 'desc' ? -1 : 1;
      sort[sortField] = sortOrder;
    } else {
      sort.createdAt = -1; // Default: newest first
    }

    // Execute query
    const brands = await Brand.find(filter)
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: brands.length,
      pagination: {
        ...pagination,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      },
      data: brands
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single brand by ID
// @route   GET /api/brands/:id
// @access  Public/Private
const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Public/Private
const updateBrand = async (req, res) => {
  try {
    const { name, icon, status } = req.body;

    // Check if brand exists
    let brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if new name already exists (if name is being updated)
    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({ name });
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: 'Brand with this name already exists'
        });
      }
    }

    // Update fields
    const updateData = {};
    if (name) updateData.name = name;
    if (icon) updateData.icon = icon;
    if (status) updateData.status = status;

    // Update brand
    brand = await Brand.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      data: brand
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Public/Private
const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    await brand.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting brand:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get brands by status
// @route   GET /api/brands/status/:status
// @access  Public/Private
const getBrandsByStatus = async (req, res) => {
  try {
    const { status } = req.params;    
    // Validate status
    // const validStatuses = [true, false];
    // if (!validStatuses.includes(status)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid status value'
    //   });
    // }

    const brands = await Brand.find({ status })
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    console.error('Error fetching brands by status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports={
    createBrand,
    getAllBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
    getBrandsByStatus

}