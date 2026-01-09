const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../env-variables');

const resetToken = (id, email, purpose)=>{
    const token = jwt.sign({ id, email, purpose}, JWT_SECRET, {
        expiresIn: "10m",
    });
    return token;
}

const decodeToken = (token) => {
    try {
        if (!token) {
            return null;
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        console.log("Token decode error:", error.message);
        return null;
    }
};

module.exports = {resetToken, decodeToken};