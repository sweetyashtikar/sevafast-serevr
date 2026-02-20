const Category = require('../models/category');

// 1. Create Category
const createCategory = async (req, res) => {
    console.log("Request Body:", req.body); 
    try {
        const { name, sub_category, row_order } = req.body;
        const image = req.files?.image?.[0]?.path; 
          const banner = req.files?.banner?.[0]?.path; 

        // Auto-generate slug from name: "Men's Fashion" -> "mens-fashion"
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

        const subCategoryArray = Array.isArray(sub_category) ? sub_category : (sub_category ? [sub_category] : []);

        const newCategory = new Category({
            name,
            sub_category : subCategoryArray,
            slug,
            image,
            banner,
            row_order,
        })

        await newCategory.save();
        res.status(201).json({ success: true, message: 'Category created successfully', data: newCategory });
    } catch (error) {
        console.log("error", error)
        res.status(400).json({ success: false, message: error.message });
    }
};

// 2. Get All Categories (with Hierarchy)
const getAllCategories = async (req, res) => {
    const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;

    const finalQuery = { ...searchQuery, ...filters };

    try {
        const categories = await Category.find(finalQuery)
        .sort(sort)
        .skip(offset)
        .limit(limit);

        const total = await Category.countDocuments(finalQuery);
            
        res.status(200).json({ 
            success: true,
            total,
            limit,
            offset, 
            count: categories.length,
            data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

//for fropdown to get categories with status true
const getAllCategoriesStatusTrue = async (req, res) => {
    const { limit, offset, sort, searchQuery, filters } = req.paginationQuery;

    const finalQuery = { status: true, ...searchQuery, ...filters };

    try {
        const categories = await Category.find(finalQuery)
        .sort(sort)
        .skip(offset)
        .limit(limit);

        const total = await Category.countDocuments(finalQuery);
            
        res.status(200).json({ 
            success: true,
            total,
            limit,
            offset, 
            count: categories.length,
            data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 3. Get Single Category & Increment Clicks
const getCategoryById = async (req, res) => {
    const id = req.params.id
    try {
        const category = await Category.findById(id);
        
        if (!category) return res.status(404).json({ message: "Not found" });

        await category.incrementClicks();
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
    const {newStatus} = req.body;
    console.log("Status:", newStatus);
    try{
        const updateCategoryStatus = await Category.findByIdAndUpdate(id, {status : newStatus, new: true});

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
    checkCategoryStatus,
    getAllCategoriesStatusTrue
};