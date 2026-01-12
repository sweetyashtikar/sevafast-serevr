const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./src/env-variables');




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



/* Middleware */
app.use(cors());
app.use(express.json()); // 👈 body-parser replace (simple & modern)


/* MongoDB Connection */
mongoose.connect(MONGODB_URI);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});



/* Routes */
app.set('trust proxy', true);
app.use('/api', userRoute);
app.use('/api', authRoute);
app.use('/api/role', roleRoute);
app.use('/api/category', categoryRoute);
app.use('/api/product', productRoute);
app.use('/api/cities', cityRoutes);
app.use('/api/attributeSet', attributeSetRoute)
app.use('/api/attribute', attributeRoute)
app.use('/api/attributeValue',attributeValueRoute)




app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
