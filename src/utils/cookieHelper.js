const { JWT_EXPIRE, NODE_ENV } = require('../env-variables');

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'strict' : 'lax', // Use 'lax' in dev
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
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