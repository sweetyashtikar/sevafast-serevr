// Example: Middleware to set the app language based on user preference or header
const setLanguage = async (req, res, next) => {
    const langCode = req.headers['accept-language'] || 'en';
    
    const languageData = await Language.findOne({ code: langCode, status: 1 });
    
    if (languageData) {
        req.language = languageData.code;
        req.isRTL = languageData.is_rtl;
    } else {
        req.language = 'en';
        req.isRTL = false;
    }
    
    next();
};