const express = require("express");
const Category = require("../controllers/categoryController");
const router = express.Router();
const { pagination } = require("../middleware/pagination");
const { authenticate, authorizePermission } = require("../middleware/authMiddleware");

router
  .route("/")
  .get(authenticate,authorizePermission("can_manage_products"),pagination, Category.getAllCategories)
  .post( authenticate,authorizePermission("can_manage_products"),Category.createCategory);

router
  .route("/:id")
  .get(authenticate,authorizePermission("can_manage_products"),Category.getCategoryById)
  .put(authenticate,authorizePermission("can_manage_products"),Category.updateCategory)
  .patch(authenticate,authorizePermission("can_manage_products"),Category.checkCategoryStatus)
  .delete(authenticate,authorizePermission("can_manage_products"),Category.deleteCategory);

module.exports = router;
