const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5000;

/* Middleware */
app.use(cors());
app.use(express.json()); // 👈 body-parser replace (simple & modern)

/* MongoDB Connection */
// mongoose.connect(uri);
// const connection = mongoose.connection;
// connection.once('open', () => {
//   console.log("MongoDB database connection established successfully");
// });

/* ✅ Simple GET Request */
app.get('/', (req, res) => {
  res.send('API is running successfully 🚀');
});

/* ✅ Simple POST Request */
app.post('/test', (req, res) => {
  const { name } = req.body;
  res.json({
    message: 'POST request working',
    name
  });
});


/* Server */
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
