const calculateSplit = async (sellerId, categoryId, itemSubtotal) => {
    // Find the specific commission for this seller and category
    const rateDoc = await SellerCommission.findOne({ 
        seller_id: sellerId, 
        category_id: categoryId 
    });

    const commissionRate = rateDoc ? rateDoc.commission : 0; // fallback to 0 if not found
    
    const adminShare = (itemSubtotal * commissionRate) / 100;
    const sellerShare = itemSubtotal - adminShare;

    return { adminShare, sellerShare };
};