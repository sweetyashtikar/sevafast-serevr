const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./src/env-variables');
const cookieParser = require('cookie-parser');

const { authenticate,authorizePermission} = require('./src/middleware/authMiddleware')




const app = express();
const port = process.env.PORT || 5000;

const userRoute = require('./src/routes/userRoute');
const authRoute = require('./src/routes/authRoute');
const roleRoute = require('./src/routes/roleRoute');
const categoryRoute = require('./src/routes/categoryRoute');
const productRoute = require('./src/routes/productRoute');
const cityRoutes = require('./src/routes/cityRoutes');
const attributeSetRoute = require('./src/routes/attributeSet')
const attributeRoute = require('./src/routes/attributeRoute')
const attributeValueRoute = require("./src/routes/attributeValue")
const taxRoute = require('./src/routes/taxRoute')
const StatusRoute = require('./src/controllers/status')
const CartRoute = require('./src/routes/cartRoute')
const ZipcodeRoute = require('./src/routes/zipcodeRoute')
const areaRoute = require('./src/routes/areaRoute')
const addressRoute = require('./src/routes/addressRoute')
const sellerRoute = require('./src/routes/sellerRoute')
const faqRoute = require('./src/routes/faqroute')
const favouriteRoute = require('./src/routes/favouriteRoute')
const productFaqRoute = require('./src/routes/productFAQRoute');
const OrderItemRoute = require('./src/routes/orderItemRoute')
// const paymentRoutes = require('./src/controllers/razorpaycontroller');
const brandRoutes = require('./src/routes/brandRoute');





/* Middleware */
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json()); // 👈 body-parser replace (simple & modern)
app.use(cookieParser());


/* MongoDB Connection */
mongoose.connect(MONGODB_URI);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});



/* Routes */
app.set('trust proxy', true);
app.use('/api/updateStatus',authenticate,authorizePermission("can_manage_products"),StatusRoute)
app.use('/api', userRoute);
app.use('/api', authRoute);
app.use('/api/role', roleRoute);
app.use('/api/category', categoryRoute);
app.use('/api/product', productRoute);
app.use('/api/cities', cityRoutes);
app.use('/api/attributeSet', attributeSetRoute)
app.use('/api/attribute', attributeRoute)
app.use('/api/attributeValue',attributeValueRoute)
app.use('/api/tax',taxRoute)
app.use('/api/cart',CartRoute)
app.use('/api/zipCode',ZipcodeRoute)
app.use('/api/area',areaRoute)
app.use('/api/address',addressRoute)
app.use('/api/seller', sellerRoute)
app.use('/api/faq', faqRoute)
app.use('/api/favourite', favouriteRoute)
app.use('/api/product-faqs', productFaqRoute);
app.use('/api/order', OrderItemRoute)
// app.use('/api/payments', paymentRoutes);
app.use('/api/brands', brandRoutes);




app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
