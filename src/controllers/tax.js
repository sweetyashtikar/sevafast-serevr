const calculateTaxedAmount = async (subtotal, taxId) => {
    const tax = await Tax.findById(taxId);
    
    if (!tax || tax.status === 0) {
        return { taxedAmount: subtotal, taxValue: 0 };
    }

    const taxValue = (subtotal * tax.percentage) / 100;
    const taxedAmount = subtotal + taxValue;

    return { 
        taxedAmount: taxedAmount.toFixed(2), 
        taxValue: taxValue.toFixed(2),
        taxTitle: tax.title 
    };
};