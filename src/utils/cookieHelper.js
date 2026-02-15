const { JWT_EXPIRE, NODE_ENV } = require('../env-variables');
const ms = require('ms')

// ✅ Set cookie function
const setTokenCookie = (res, token) => {
    const cookieExpiry = ms(JWT_EXPIRE);
    res.cookie('token', token, {
        expires: new Date(Date.now() + cookieExpiry),
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
};
const clearTokenCookie = (res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() - 86400000), // 1 day in the past
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    
    // OR simply:
    // res.clearCookie('token');
};

module.exports = { setTokenCookie, clearTokenCookie };