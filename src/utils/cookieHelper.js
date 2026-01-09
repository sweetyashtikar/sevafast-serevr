const { JWT_EXPIRE, NODE_ENV } = require('../env-variables');

const setTokenCookie = (res, token) => {
    const cookieOptions = {
       expires: new Date(Date.now() + parseInt(JWT_EXPIRE) * 1000),
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    };
    
    res.cookie('token', token, cookieOptions);
};

const clearTokenCookie = (res) => {
    res.cookie('token', 'none', {
         expires: new Date(Date.now() + parseInt(JWT_EXPIRE) * 1000),
        httpOnly: true,
        secure:NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
};

module.exports = { setTokenCookie, clearTokenCookie };