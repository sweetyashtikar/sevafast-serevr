const express = require("express");
const Category = require("../controllers/categoryController");
const router = express.Router();
const { pagination } = require("../middleware/pagination");
const { authenticate, authorizePermission } = require("../middleware/authMiddleware");

router
  .route("/")
  .get(pagination, Category.getAllCategories)
  .post( authenticate,
         authorizePermission("can_manage_products"),Category.createCategory);

router
  .route("/:id")
  .get(pagination, Category.getCategoryById)
  .put(Category.updateCategory)
  .put(Category.checkCategoryStatus)
  .delete(Category.deleteCategory);

module.exports = router;
