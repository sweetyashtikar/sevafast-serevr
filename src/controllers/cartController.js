const Product = require("../models/products");
const Cart = require("../models/cart");
const { PRODUCT_TYPES, VARIANT_STOCK_LEVEL_TYPES, STOCK_STATUS } = require("../types/productTypes");

const addToCart = async (req, res) => {
  try {
    const { productId, variantId, qty } = req.body;
    const userId = req.user._id;

    // 1. Fetch Product and validate existence/status
    const product = await Product.findOne({ _id: productId, status: true, isApproved:true, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // 2. Validate Quantity Constraints
    if (qty < product.minimumOrderQuantity) {
      return res.status(400).json({ message: `Minimum order quantity is ${product.minimumOrderQuantity}` });
    }
    if (qty % product.quantityStepSize !== 0) {
      return res.status(400).json({ message: `Quantity must be in multiples of ${product.quantityStepSize}` });
    }

    // 3. Stock & Variant Validation Logic
    let price = 0;
    
    if (product.productType === PRODUCT_TYPES.SIMPLE || product.productType === PRODUCT_TYPES.DIGITAL) {
      // SIMPLE PRODUCT LOGIC
      if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK || product.simpleProduct.sp_totalStock < qty) {
        return res.status(400).json({ message: "Product out of stock or insufficient quantity" });
      }
      price = product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price;

    } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
      // VARIABLE PRODUCT LOGIC
      if (!variantId) return res.status(400).json({ message: "Variant ID is required for variable products" });

      const variant = product.variants.id(variantId);
      if (!variant || !variant.variant_isActive) {
        return res.status(404).json({ message: "Variant not found or inactive" });
      }

      // Check stock based on Level Type
      if (product.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL) {
        if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK || variant.variant_totalStock < qty) {
          return res.status(400).json({ message: "Selected variant is out of stock" });
        }
      } else {
        // Product Level Stock
        if (product.productLevelStock.pls_stockStatus !== STOCK_STATUS.IN_STOCK || product.productLevelStock.pls_totalStock < qty) {
          return res.status(400).json({ message: "Product is out of stock" });
        }
      }
      price = variant.variant_specialPrice || variant.variant_price;
    }

    // 4. Update or Create Cart
    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Check if item already exists in cart
      const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId && 
        (variantId ? item.variantId?.toString() === variantId : true)
      );

      if (itemIndex > -1) {
        // Update existing item quantity
        const newQty = cart.items[itemIndex].qty + qty;
        if (newQty > product.totalAllowedQuantity) {
          return res.status(400).json({ message: "Maximum allowed quantity reached" });
        }
        cart.items[itemIndex].qty = newQty;
      } else {
        // Add new item to existing cart
        cart.items.push({ product: productId, variantId, qty });
      }
    } else {
      // Create brand new cart
      cart = new Cart({
        userId,
        items: [{ product: productId, variantId, qty }]
      });
    }

    await cart.save();
    res.status(200).json({success:true , message: "Added to cart successfully", cart });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCart = async (req, res) => {
    const userId = req.user._id
  try {
    const cart = await Cart.findOne({ userId }).populate("items.product");
    if (!cart) return res.status(200).json({ items: [], subtotal: 0 });

    // Map through items to attach the specific variant details
    const processedItems = cart.items.map(item => {
      const p = item.product;
      let details = {
        name: p.name,
        mainImage: p.mainImage,
        price: 0,
        stockStatus: ""
      };

      if (p.productType === PRODUCT_TYPES.VARIABLE && item.variantId) {
        const variant = p.variants.id(item.variantId);
        details.price = variant?.variant_specialPrice || variant?.variant_price;
        details.sku = variant?.variant_sku;
        details.image = variant?.variant_images?.[0] || p.mainImage;
        details.stockStatus = variant?.variant_stockStatus;
      } else {
        details.price = p.simpleProduct?.sp_specialPrice || p.simpleProduct?.sp_price;
        details.sku = p.simpleProduct?.sp_sku;
        details.stockStatus = p.simpleProduct.sp_stockStatus;
      }

      return {
        ...item._doc,
        itemDetails: details,
        lineTotal: details.price * item.qty
      };
    });

    const subtotal = processedItems.reduce((acc, curr) => acc + curr.lineTotal, 0);

    res.status(200).json({ success: true, items: processedItems, subtotal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. UPDATE QUANTITY
const updateQuantity = async (req, res) => {
  try {
    const { productId, variantId, newQty } = req.body;
    const userId = req.user._id    
    // 1. Fetch Product and validate existence/status
    const product = await Product.findOne({ _id: productId, status: true, isApproved:true, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // 2. Validate Quantity Constraints
    if (newQty < product.minimumOrderQuantity) {
      return res.status(400).json({ message: `Minimum order quantity is ${product.minimumOrderQuantity}` });
    }
    if (newQty % product.quantityStepSize !== 0) {
      return res.status(400).json({ message: `Quantity must be in multiples of ${product.quantityStepSize}` });
    }

    // 3. Stock & Variant Validation Logic
    let price = 0;
    
    if (product.productType === PRODUCT_TYPES.SIMPLE || product.productType === PRODUCT_TYPES.DIGITAL) {
      // SIMPLE PRODUCT LOGIC
      if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK || product.simpleProduct.sp_totalStock < newQty) {
        return res.status(400).json({ message: "Product out of stock or insufficient quantity" });
      }
      price = product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price;

    } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
      // VARIABLE PRODUCT LOGIC
      if (!variantId) return res.status(400).json({ message: "Variant ID is required for variable products" });

      const variant = product.variants.id(variantId);
      if (!variant || !variant.variant_isActive) {
        return res.status(404).json({ message: "Variant not found or inactive" });
      }

      // Check stock based on Level Type
      if (product.variantStockLevelType === VARIANT_STOCK_LEVEL_TYPES.VARIABLE_LEVEL) {
        if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK || variant.variant_totalStock < newQty) {
          return res.status(400).json({ message: "Selected variant is out of stock" });
        }
      } else {
        // Product Level Stock
        if (product.productLevelStock.pls_stockStatus !== STOCK_STATUS.IN_STOCK || product.productLevelStock.pls_totalStock < newQty) {
          return res.status(400).json({ message: "Product is out of stock" });
        }
      }
      price = variant.variant_specialPrice || variant.variant_price;
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: userId, "items.product": productId, "items.variantId": variantId },
      { $set: { "items.$.qty": newQty } },
      { new: true }
    );
    res.status(200).json(cart);
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false ,message: error.message });
  }
};

// 3. REMOVE ITEM
const removeItem = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const cart = await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { items: { product: productId, variantId: variantId } } },
      { new: true }
    );
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. SYNC GUEST CART (Merge Logic)
const syncCart = async (req, res) => {
  try {
    const { guestItems } = req.body; // Array of {productId, variantId, qty}
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: guestItems });
    } else {
      guestItems.forEach(gItem => {
        const existing = cart.items.find(i => 
          i.product.toString() === gItem.productId && 
          i.variantId?.toString() === gItem.variantId
        );
        if (existing) {
          existing.qty += gItem.qty; // Or overwrite, depending on policy
        } else {
          cart.items.push(gItem);
        }
      });
    }
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. VALIDATE BEFORE CHECKOUT
const validateCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate("items.product");
    const errors = [];

    for (const item of cart.items) {
      const p = item.product;
      if (!p || !p.status || p.isDeleted) {
        errors.push(`${p?.name || "A product"} is no longer available.`);
        continue;
      }

      // Stock Check
      if (p.productType === PRODUCT_TYPES.SIMPLE) {
        if (p.simpleProduct.sp_totalStock < item.qty) errors.push(`${p.name} stock insufficient.`);
      } else {
        const variant = p.variants.id(item.variantId);
        if (!variant || variant.variant_totalStock < item.qty) {
          errors.push(`Variant for ${p.name} is out of stock.`);
        }
      }
    }

    if (errors.length > 0) return res.status(400).json({ errors });
    res.status(200).json({success: true ,message: "Cart valid" });
  } catch (error) {
    res.status(500).json({ success: false , message: error.message });
  }
};

module.exports = {
    addToCart,
    getCart,
    updateQuantity,
    validateCart,
    syncCart,
    removeItem
}