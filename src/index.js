const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env-variables");
const cookieParser = require("cookie-parser");
const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const {
  authenticate,
  authorizePermission,
} = require("./middleware/authMiddleware");

const app = express();
const port = process.env.PORT || 5000;

const userRoute = require("./routes/userRoute");
const authRoute = require("./routes/authRoute");
const roleRoute = require("./routes/roleRoute");
const categoryRoute = require("./routes/categoryRoute");
const productRoute = require("./routes/productRoute");
const cityRoutes = require("./routes/cityRoutes");
const attributeSetRoute = require("./routes/attributeSet");
const attributeRoute = require("./routes/attributeRoute");
const attributeValueRoute = require("./routes/attributeValue");
const taxRoute = require("./routes/taxRoute");
const StatusRoute = require("./controllers/status");
const CartRoute = require("./routes/cartRoute");
const ZipcodeRoute = require("./routes/zipcodeRoute");
const areaRoute = require("./routes/areaRoute");
const addressRoute = require("./routes/addressRoute");
const sellerRoute = require("./routes/sellerRoute");
const faqRoute = require("./routes/faqroute");
const favouriteRoute = require("./routes/favouriteRoute");
const productFaqRoute = require("./routes/productFAQRoute");
const OrderItemRoute = require("./routes/orderItemRoute");
// const paymentRoutes = require('./src/controllers/razorpaycontroller');
const brandRoutes = require("./routes/brandRoute");
const viewCartRoute = require("./routes/viewCartRoute");
const userPermissionRoute = require("./routes/userPermissionRoute");
const tezRoute = require("./routes/tezRoute");
const DeliveryBoyRoute = require("./routes/deliveryBoyRoutes");
const ReturnRequestRoute = require("./routes/returnRequestRoute");
const BannerRoute = require("./routes/bannerRoute");
const CouponRoute = require("./routes/couponRoute");
const StockRoute = require("./routes/stockSalesRoute");

/* Middleware */
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());

/* MongoDB Connection */
mongoose.connect(MONGODB_URI);
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

/* Routes */
app.set("trust proxy", true);
app.use(
  "/api/updateStatus",
  authenticate,
  authorizePermission("can_manage_products"),
  StatusRoute,
);
app.use("/api", userRoute);
app.use("/api", authRoute);
app.use("/api/role", roleRoute);
app.use("/api/category", categoryRoute);
app.use("/api/product", productRoute);
app.use("/api/cities", cityRoutes);
app.use("/api/attributeSet", attributeSetRoute);
app.use("/api/attribute", attributeRoute);
app.use("/api/attributeValue", attributeValueRoute);
app.use("/api/tax", taxRoute);
// app.use('/api/cart',CartRoute)
app.use("/api/zipCode", ZipcodeRoute);
app.use("/api/area", areaRoute);
app.use("/api/address", addressRoute);
app.use("/api/seller", sellerRoute);
app.use("/api/faq", faqRoute);
app.use("/api/favourite", favouriteRoute);
app.use("/api/product-faqs", productFaqRoute);
app.use("/api/order", OrderItemRoute);
app.use("/api/payments", tezRoute);
app.use("/api/brands", brandRoutes);
app.use("/api/viewCart", viewCartRoute);
app.use("/api/userPermission", userPermissionRoute);
app.use("/api/delivery_boy", DeliveryBoyRoute);
app.use("/api/return_request", ReturnRequestRoute);
app.use("/api/banners", BannerRoute);
app.use("/api/coupons", CouponRoute);
app.use("/api/stock", StockRoute);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
