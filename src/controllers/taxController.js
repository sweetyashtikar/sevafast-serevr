const Tax = require("../models/tax");

// CREATE: Add a new tax entry
const createTax = async (req, res) => {
  try {
    const { title, percentage, amount } = req.body;

    const tax = await Tax.findOne({title})
    if(tax) return res.status(400).json({ success: false, message: "Tax title already exists" });

    const newTax = await Tax.create({
      title,
      percentage,
      amount
    });

    res.status(201).json({
      success: true,
      message: "Tax created successfully",
      data: newTax
    });
  } catch (error) {
    // Handle duplicate title error
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Tax title already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ: Get all taxes (with optional status filtering)
const getAllTaxes = async (req, res) => {
    const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;
    const finalQuery = { ...searchQuery, ...filters };

  try {
    const taxes = await Tax.find(finalQuery)
    .sort(sort)
    .skip(offset)
    .limit(limit);

     const total = await Tax.countDocuments(finalQuery);
    

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      count: taxes.length,
      data: taxes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ: Get all taxes with status true
const getAllTaxesStatusTrue = async (req, res) => {
    const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;
    const finalQuery = { status : true,...searchQuery, ...filters };

  try {
    const taxes = await Tax.find(finalQuery)
    .sort(sort)
    .skip(offset)
    .limit(limit);

     const total = await Tax.countDocuments(finalQuery);
    

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      count: taxes.length,
      data: taxes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ: Get single tax by ID
const getTaxById = async (req, res) => {
    const id = req.params.id
  try {
    const tax = await Tax.findById(id);
    if (!tax) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }
    res.status(200).json({ success: true, data: tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE: Update tax details
const updateTax = async (req, res) => {
    const id = req.params.id
    const { title,percentage,status, amount} = req.body
  try {
    const tax = await Tax.findByIdAndUpdate(
      id,
      {
        title : title,
        percentage:percentage,
        status : status,
        amount: amount
      },
      { new: true, runValidators: true }
    );

    if (!tax) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }

    res.status(200).json({
      success: true,
      message: "Tax updated successfully",
      data: tax
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE: Remove a tax entry
const deleteTax = async (req, res) => {
  try {
    const tax = await Tax.findByIdAndDelete(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }
    res.status(200).json({ success: true, message: "Tax deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports={
deleteTax,
updateTax,
getTaxById,
getAllTaxes,
createTax,
getAllTaxesStatusTrue
}