const AttributeSet = require("../models/attributeSet");

// CREATE: Create a new Attribute Set
const createAttributeSet = async (req, res) => {
  try {
    const { name } = req.body;
    const newSet = await AttributeSet.create({ name, status: true });

    res.status(201).json({
      success: true,
      message: "Attribute Set created succesfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Name already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ: Get all sets (with optional virtual population)
const getAllAttributeSets = async (req, res) => {
  const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;

  const finalQuery = { ...searchQuery, ...filters };
  try {
    const sets = await AttributeSet.find(finalQuery)
      .sort(sort)
      .limit(limit)
      .skip(offset);

    const total = await AttributeSet.countDocuments(finalQuery);

    res.status(200).json({
        success: true,
        total,
        limit,
        offset,
        count: sets.length,
        data: sets,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ: Get single set by ID
const getAttributeSetById = async (req, res) => {
  const id = req.params.id
  try {
    const set = await AttributeSet.findById(id);
    if (!set)
      return res.status(404).json({ success: false, message: "Set not found" });

    res.status(200).json({ success: true, data: set });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE: Update a set
const updateAttributeSet = async (req, res) => {
  const id = req.params.id;
  const { name, status } = req.body;
  try {
    const updateData = { name, status };
    const set = await AttributeSet.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!set)
      return res
        .status(404)
        .json({ success: false, message: "AttributeSet not found" });
    res.status(200).json({
      success: true,
      message: "Attribute updatd succesfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE: Remove a set
const deleteAttributeSet = async (req, res) => {
  try {
    const set = await AttributeSet.findByIdAndDelete(req.params.id);
    if (!set)
      return res
        .status(404)
        .json({ success: false, message: "AttributeSet not found" });

    res.status(200).json({ success: true, message: "Attribute set deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAttributeSet,
  getAllAttributeSets,
  deleteAttributeSet,
  updateAttributeSet,
  getAttributeSetById,
};
