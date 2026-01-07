const express = require('express');
const Category = require('../controllers/categoryController');
const router = express.Router();



router.route('/categories')
    .get(Category.getAllCategories)
    .post(Category.createCategory);


router.route('/categories/:id')
    .get(Category.getCategoryById)
    .put(Category.updateCategory)
    .put(Category.checkCategoryStatus)
    .delete(Category.deleteCategory);


module.exports = router;