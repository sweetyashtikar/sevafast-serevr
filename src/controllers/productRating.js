// Example: Get average rating and count for a product
const getAverageRating = async (productId) => {
    return await ProductRating.aggregate([
        { $match: { product_id: productId } },
        { 
            $group: { 
                _id: '$product_id', 
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            } 
        }
    ]);
};