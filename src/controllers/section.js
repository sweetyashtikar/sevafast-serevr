const getHomeSections = async (req, res) => {
    const sections = await Section.find().sort({ row_order: 1 });
    
    const homeData = await Promise.all(sections.map(async (section) => {
        let query = {};
        
        // Apply category filters if they exist
        if (section.categories.length > 0) {
            query.category_id = { $in: section.categories };
        }

        // Apply product type logic
        if (section.product_type === 'new_added_products') {
            // Get 10 newest products
            const products = await Product.find(query).sort({ date_added: -1 }).limit(10);
            return { ...section._doc, products };
        }
        
        // Handle other types like 'most_selling_products' etc.
        return section;
    }));

    res.json(homeData);
};