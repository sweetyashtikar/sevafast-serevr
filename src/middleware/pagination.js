const pagination = (req, res, next) => {
    const { 
        limit, offset, sort, order, search, ...rest 
    } = req.query;

    // 1. Pagination Logic
    const finalLimit = parseInt(limit, 10) || 25;
    const finalOffset = parseInt(offset, 10) || 0;

    // 2. Sorting Logic (Handles p.id, c.name, etc.)
    // Mongoose uses 'field' or '-field' for ASC/DESC
    const sortField = sort ? sort.replace(/^[a-z]\./, '') : 'id'; 
    const sortOrder = order && order.toUpperCase() === 'ASC' ? '' : '-';
    const finalSort = `${sortOrder}${sortField}`;

    // 3. Search Logic
    let searchQuery = {};
    if (search) {
        // Assuming search applies to 'name' or 'title'
        searchQuery = { $or: [
            { name: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } }
        ]};
    }

    // 4. Custom Filters (rest contains category_id, min_price, etc.)
    const filters = { ...rest };
    
    // Convert string booleans/numbers if necessary
    Object.keys(filters).forEach(key => {
        if (filters[key] === 'true') filters[key] = true;
        if (filters[key] === 'false') filters[key] = false;
    });

    // Attach to request object
    req.paginationQuery = {
        limit: finalLimit,
        offset: finalOffset,
        sort: finalSort,
        searchQuery,
        filters
    };

    next();
};

module.exports = {pagination};