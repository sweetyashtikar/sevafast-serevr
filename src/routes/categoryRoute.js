const express = require("express");
const Category = require("../controllers/categoryController");
const router = express.Router();
const { pagination } = require("../middleware/pagination");

router
  .route("/categories")
  .get(pagination, Category.getAllCategories)
  .post(Category.createCategory);

router
  .route("/categories/:id")
  .get(pagination, Category.getCategoryById)
  .put(Category.updateCategory)
  .put(Category.checkCategoryStatus)
  .delete(Category.deleteCategory);

module.exports = router;
