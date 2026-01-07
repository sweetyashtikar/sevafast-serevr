const Category = require('../models/category');

// 1. Create Category
const createCategory = async (req, res) => {
    try {
        const { name, sub_category, image, banner, row_order } = req.body;

        // Auto-generate slug from name: "Men's Fashion" -> "mens-fashion"
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

        const newCategory = new Category({
            name,
            sub_category,
            slug,
            image,
            banner,
            row_order,
            status : "Active",
        });

        await newCategory.save();
        res.status(201).json({ success: true, message: 'Category created successfully', data: newCategory });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 2. Get All Categories (with Hierarchy)
const getAllCategories = async (req, res) => {
    try {
        // .populate('parent_id', 'name') helps see the parent name instead of just ID
        const categories = await Category.find().sort({ row_order: 1 });
            
        res.status(200).json({ success: true, count: categories.length, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Single Category & Increment Clicks
const getCategoryById = async (req, res) => {
    const id = req.params.id
    try {
        const category = await Category.findByIdAndUpdate(
            id, 
            { $inc: { clicks: 1 } }, // Automatically increment clicks by 1
            { new: true }
        );

        if (!category) return res.status(404).json({ message: "Not found" });
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update Category
const updateCategory = async (req, res) => {
    const id = req.params.id;
    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        );
        res.status(200).json({ success: true, message: 'Category updated successfully', data: updatedCategory });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 5. Delete Category
const deleteCategory = async (req, res) => {
    const id = req.params.id;
    try {
        await Category.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Category deleted succesfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

//controller to check for the status of category
const checkCategoryStatus = async (req,res) => {
    const id = req.params.id;
    const {status} = req.body;
    try{
        const updateCategoryStatus = await Category.findById(id, {status : status});

        if (!updateCategoryStatus) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        return res.status(200).json({ success: true, message: "Category status updated successfully"});
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    checkCategoryStatus
};