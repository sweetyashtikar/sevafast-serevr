const express = require('express');
const router = express.Router();
const stockSalesController = require('../controllers/stockController');
const { authenticate } = require('../middleware/authMiddleware');



// Main view route (matches the image layout)
router.get('/view', stockSalesController.getStockSalesView);

// Summary cards for dashboard
router.get('/summary',authenticate, stockSalesController.getSummaryCards);

// Export data
router.get('/export', stockSalesController.exportStockSalesData);

// Product detail view
router.get('/product/:productId',stockSalesController.getProductDetailView);

module.exports = router;