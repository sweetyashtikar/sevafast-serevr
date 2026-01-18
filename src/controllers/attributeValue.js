const AttributeValue = require("../models/attributeValue");
const Attribute = require("../models/attribute");
const { checkStatus } = require("../utils/sanitizer");

// CREATE: Add a new value (e.g., "Red" for attribute "Color")
const createAttributeValue = async (req, res) => {
  try {
    const {
      attribute_id,
      value,
      swatche_type,
      swatche_value,
      filterable,
      status,
    } = req.body;

    const checkStatusAttribute = await checkStatus(Attribute, attribute_id);
    if (!checkStatusAttribute) {
      return res.status(400).json({
        success: false,
        message: "Attribute is Inactive",
      });
    }

    // 2. Create the value
    const newValue = await AttributeValue.create({
      attribute_id,
      value,
      swatche_type,
      swatche_value,
      filterable,
    });

    res.status(201).json({
      success: true,
      message: "Attribute Value created successfully",
      data: newValue,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This value already exists for this attribute",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL: Can be filtered by attribute_id
const getAllAttributeValues = async (req, res) => {
     const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;
    const finalQuery = { ...searchQuery, ...filters };

  try {
    const values = await AttributeValue.find(finalQuery)
      .populate("attribute_id", "name type status")
      .sort(sort)
      .skip(offset)
      .limit(limit); 

      const total = await AttributeValue.countDocuments(finalQuery);

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      count: values.length,
      data: values,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL (With optional filtering by Set) recheck the code
const getAttributeByAttributeID = async (req, res) => {
  try {
    const { attribute_id } = req.query;
    let query = {};

    // If a set ID is passed in query params: /api/attributes?attribute_set_id=...
    if (attribute_id) query.attribute_id = attribute_id;

    const attributes = await Attribute.find(query)
      .populate("attribute_id", "name") // Join with AttributeSet to get the name
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: attributes.length, data: attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET SINGLE
const getAttributeValueById = async (req, res) => {
  const id = req.params.id;
  try {
    const attribute = await Attribute.findById(id).populate(
      "attribute_id",
      "name  type status"
    );
    if (!attribute)
      return res
        .status(404)
        .json({ success: false, message: "Attribute not found" });

    res.status(200).json({ success: true, data: attribute });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE: Update value or swatch data
const updateAttributeValue = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      attribute_id,
      value,
      swatche_type,
      swatche_value,
      filterable,
      status,
    } = req.body;

    const checkStatusAttribute = await checkStatus(Attribute, attribute_id);
    if (!checkStatusAttribute) {
      return res.status(400).json({
        success: false,
        message: "Attribute is Inactive",
      });
    }

    const updatedValue = await AttributeValue.findByIdAndUpdate(
      id,
      {
        attribute_id: attribute_id,
        value: value,
        swatche_type: swatche_type,
        swatche_value: swatche_value,
        filterable: filterable,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!updatedValue) {
      return res
        .status(404)
        .json({ success: false, message: "Value not found" });
    }

    res.status(200).json({
      success: true,
      message: "Updated successfully",
      data: updatedValue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
const deleteAttributeValue = async (req, res) => {
  try {
    const deleted = await AttributeValue.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Value not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Value deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAttributeValue,
  getAllAttributeValues,
  updateAttributeValue,
  deleteAttributeValue,
  getAttributeValueById
};
