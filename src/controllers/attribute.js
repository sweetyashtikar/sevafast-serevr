const Attribute = require("../models/attribute");
const AttributeSet = require("../models/attributeSet");
const { checkStatus } = require("../utils/sanitizer");
// CREATE
const createAttribute = async (req, res) => {
  try {
    const { attribute_set_id, name, type } = req.body;

    const attribute = await Attribute.findOne({ name });
    if (attribute)
      return res
        .status(400)
        .json({ success: false, message: "Name already exists" });

    const checkStatusAttributeSet = await checkStatus( AttributeSet, attribute_set_id );
    if (!checkStatusAttributeSet) {
      return res.status(400).json({
        success: false,
        message: "Attribute Set is Inactive",
      });
    }

    const newAttribute = await Attribute.create({
      attribute_set_id,
      name,
      type,
      status: true,
    });

    res.status(201).json({
      success: true,
      message: "Attribute created succesfully",
      data: newAttribute,
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

const getAllAttributes = async (req, res) => {
  try {
    const attributes = await Attribute.find()
      .populate("attribute_set_id", "name status") // Join with AttributeSet to get the name
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: attributes.length, data: attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL (With optional filtering by Set)
const getAttributeByAttributeSetID = async (req, res) => {
  try {
    const { attribute_set_id } = req.query;
    let query = {};

    // If a set ID is passed in query params: /api/attributes?attribute_set_id=...
    if (attribute_set_id) query.attribute_set_id = attribute_set_id;

    const attributes = await Attribute.find(query)
      .populate("attribute_set_id", "name") // Join with AttributeSet to get the name
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: attributes.length, data: attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET SINGLE
const getAttributeById = async (req, res) => {
    const id = req.params.id
  try {
    const attribute = await Attribute.findById(id).populate(
      "attribute_set_id",
      "name status"
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

// UPDATE
const updateAttribute = async (req, res) => {
  const id = req.params.id;
  const { attribute_set_id, name, type, status } = req.body;

   const checkStatusAttributeSet = await checkStatus( AttributeSet, attribute_set_id );
    if (!checkStatusAttributeSet) {
      return res.status(400).json({
        success: false,
        message: "Attribute Set is Inactive",
      });
    }
  try {
    const attribute = await Attribute.findByIdAndUpdate(
      id,
      {
        attribute_set_id: attribute_set_id,
        name: name,
        type: type,
        status: status,
      },
      { new: true, runValidators: true }
    );

    if (!attribute)
      return res
        .status(404)
        .json({ success: false, message: "Attribute not found" });

    res.status(200).json({
      success: true,
      message: "Attribute Updated successfully",
      data: attribute,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
const deleteAttribute = async (req, res) => {
    const id = req.params.id
  try {
    const attribute = await Attribute.findByIdAndDelete(id);
    if (!attribute)
      return res
        .status(404)
        .json({ success: false, message: "Attribute not found" });

    res
      .status(200)
      .json({ success: true, message: "Attribute deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  deleteAttribute,
  updateAttribute,
  createAttribute,
  getAttributeByAttributeSetID,
  getAttributeById,
  getAllAttributes,
};
