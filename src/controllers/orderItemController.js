const OrderItem = require('../models/orderItem');
const Order = require('../models/orders');
const User = require('../models/User');
const Product = require('../models/products');
const mongoose = require('mongoose');
const Address = require('../models/address');
const { checkId, checkStatus } = require('../utils/sanitizer');
const { PaymentMethod } = require('../models/orders');
const { PRODUCT_TYPES, STOCK_STATUS } = require('../types/productTypes');
const { emailService } = require('../utils/sendmail');
const ShipRocketService = require('../services/shiprocket.service');
const tezGateway = require('../services/tezPayment.service')
const {OrderStatus} = require('../models/orders')
const DeliveryBoy = require('../models/deliveryBoy')

/**
 * ORDER ITEM CRUD CONTROLLER
 */

// 1. CREATE - Create single order item (usually done via Order creation)
// const createOrderItem = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const {
//             address_id,
//             mobile,
//             address,
//             location,
//             items,
//             payment_method,
//             promo_details,
//             discount,
//             tax_amount,
//             delivery_info,
//             shipping_method = 'standard' // Add shipping method option
//         } = req.body;

//         const user_id = req.user._id;

//         // Validate User and Address IDs
//         await checkId(User, user_id);

//         // Fetch user details for email
//         const user = await User.findById(user_id).select('name email phone username');

//         // Fetch address with populated area and city
//         const userAddress = await Address.findById(address_id)
//             .populate({
//                 path: 'area_id',
//                 select: 'delivery_charges minimum_free_delivery_order_amount name active'
//             })
//             .populate({
//                 path: 'city_id',
//                 select: 'name active'
//             });

//         if (!userAddress) {
//             throw new Error('Address not found');
//         }

//         // Get delivery charge from area and convert to number
//         const areaDeliveryCharge = parseFloat(userAddress.area_id.delivery_charges) || 0;
//         const minimumFreeDeliveryAmount = parseFloat(userAddress.area_id.minimum_free_delivery_order_amount) || 0;

//         // Check ShipRocket serviceability if shipping_method is 'shiprocket'
//         let shiprocketServiceability = null;
//         let shiprocketDeliveryCharge = areaDeliveryCharge;

//         if (shipping_method === 'shiprocket') {
//             try {
//                 const pincode = userAddress.pincode || userAddress.city_id?.pincode;
//                  if (!pincode) {
//                     throw new Error('Pincode not found for address');
//                 }
//                     //calculate total weight of items
//                     const totalWeight = items.reduce((sum, item) => {
//                         // You might want to fetch actual product weight from database
//                         return sum + (item.quantity * 0.5); // Assuming 0.5kg per item
//                     }, 0);
//                     // Check serviceability
//                     shiprocketServiceability = await ShipRocketService.checkServiceability(
//                         pincode,
//                         totalWeight || 0.5,
//                         15, // length in cm
//                         15, // breadth in cm
//                         15  // height in cm
//                     );
//                     if (shiprocketServiceability && shiprocketServiceability.data.available) {
//                         // Use ShipRocket's freight charge if available
//                         shiprocketDeliveryCharge = parseFloat(shiprocketServiceability.data.freight_charge) || areaDeliveryCharge;
//                     }
                

//             } catch (shiprocketError) {
//                 console.warn('ShipRocket serviceability check failed, using default charges:', shiprocketError.message)
//             }
//         }

//         // Group items by product to efficiently validate variants
//         const productVariantMap = {};
//         items.forEach(item => {
//             if (!productVariantMap[item.product_id]) {
//                 productVariantMap[item.product_id] = [];
//             }
//             productVariantMap[item.product_id].push({
//                 variantId: item.product_variant_id,
//                 quantity: item.quantity
//             });
//         });

//         // Validate all product variants exist and have sufficient stock
//         for (const [productId, variants] of Object.entries(productVariantMap)) {
//             const product = await Product.findById(productId);

//             if (!product) {
//                 throw new Error(`Product ${productId} not found`);
//             }

//             // Check if product is active and approved
//             if (!product.status || !product.isApproved || product.isDeleted) {
//                 throw new Error(`Product ${productId} is not available`);
//             }

//             if (items.product_variant_id) {
//                 // For each variant in this product
//                 for (const variantInfo of variants) {
//                     const variant = product.variants.id(variantInfo.variantId);

//                     if (!variant) {
//                         throw new Error(`Variant ${variantInfo.variantId} not found in product ${productId}`);
//                     }

//                     if (!variant.variant_isActive) {
//                         throw new Error(`Variant ${variantInfo.variantId} is not active`);
//                     }

//                     // Check stock availability
//                     if (product.productType === PRODUCT_TYPES.SIMPLE) {
//                         // For simple products, check simple product stock
//                         if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK ||
//                             product.simpleProduct.sp_totalStock < variantInfo.quantity) {
//                             throw new Error(`Insufficient stock for product ${product.name}`);
//                         }
//                     } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                         // For variable products, check variant stock
//                         if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK ||
//                             variant.variant_totalStock < variantInfo.quantity) {
//                             throw new Error(`Insufficient stock for variant ${product.name}`);
//                         }
//                     }
//                 }
//             }
//         }

//         // Calculate sub_total for each item
//         const itemsWithDetails = await Promise.all(items.map(async (item) => {
//             const product = await Product.findById(item.product_id);

//             let variant = null;
//             let price = undefined;

//             // Check if price was explicitly provided in req.body
//             const hasPriceInRequest = item.price !== undefined && item.price !== null;

//             if (hasPriceInRequest) {
//                 // Use price from req.body
//                 price = parseFloat(item.price);
//             }
//             if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                 if (item.product_variant_id) {
//                     variant = product.variants.id(item.product_variant_id);
//                     if (!variant) {
//                         throw new Error(`Variant ${item.product_variant_id} not found`);
//                     }

//                     // If price wasn't provided in request, get from variant
//                     if (!hasPriceInRequest) {
//                         // Use special price if available, otherwise regular price
//                         price = parseFloat(variant.variant_specialPrice || variant.variant_price);
//                     }
//                 } else {
//                     throw new Error(`Variant ID required for variable product ${product.name}`);
//                 }
//             } else if (product.productType === PRODUCT_TYPES.SIMPLE) {
//                 // If price wasn't provided in request, get from simple product
//                 if (!hasPriceInRequest) {
//                     // Use special price if available, otherwise regular price
//                     price = parseFloat(product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price || product.simpleProduct.price);
//                 }
//             }

//             // Final validation
//             if (price === undefined || price === null || isNaN(price) || price <= 0) {
//                 throw new Error(`Invalid price for product ${product.name}. Price: ${price}`);
//             }

//             const sub_total = price * item.quantity;
//             const vendorId = item.vendorId = product.vendorId;
//             console.log("vendorId", vendorId);

//             // Create better variant name
//             let variantName = product.name;
//             if (variant) {
//                 variantName = `${product.name} - ${variant.variant_sku || 'Variant'}`;
//             }
//             console.log("item", item)

//             return {
//                 ...item,
//                 price,
//                 sub_total,
//                 product_name: product.name,
//                 variant_name: variantName,
//                 seller_id: vendorId,
//             };
//         }));
//         const itemsTotal = itemsWithDetails.reduce((sum, item) => sum + item.sub_total, 0);
//         const promoDiscount = parseFloat(promo_details?.discount) || 0;

//         // Determine final delivery charge based on minimum free delivery amount
//         let finalDeliveryCharge = areaDeliveryCharge;
//         if (minimumFreeDeliveryAmount > 0 && itemsTotal >= minimumFreeDeliveryAmount) {
//             finalDeliveryCharge = 0; // Free delivery if order meets minimum
//         }

//         // Calculate totals using area delivery charge
//         const total = itemsTotal +
//             finalDeliveryCharge -
//             (parseFloat(discount) || 0) -
//             promoDiscount +
//             (parseFloat(tax_amount) || 0);

//         // Create Order
//         const order = new Order({
//             user_id,
//             address_id,
//             mobile,
//             address: address || userAddress.address,
//             location: location || userAddress.location,
//             total: itemsTotal,
//             delivery_charge: finalDeliveryCharge,
//             discount: discount || 0,
//             promo_details: promo_details ? {
//                 code: promo_details.code,
//                 discount: parseFloat(promo_details.discount) || 0,
//                 discount_type: promo_details.discount_type || 'fixed'
//             } : undefined,
//             tax_amount: parseFloat(tax_amount) || 0,
//             total_payable: total,
//             final_total: total,
//             payment: {
//                 method: payment_method,
//                 status: payment_method === PaymentMethod.COD ? 'pending' : 'pending'
//             },
//             delivery_info: delivery_info || {},
//             status: 'received',
//             status_timestamps: {
//                 received: new Date()
//             }
//         });

//         await order.save({ session });

//         // Create Order Items
//         const orderItems = itemsWithDetails.map(item => ({
//             user_id,
//             order_id: order._id,
//             seller_id: item.vendorId,
//             product_id: item.product_id,
//             product_variant_id: item.product_variant_id,
//             product_name: item.product_name,
//             variant_name: item.variant_name,
//             quantity: item.quantity,
//             price: item.price,
//             discounted_price: parseFloat(item.discounted_price) || item.price,
//             tax_percent: parseFloat(item.tax_percent) || 0,
//             tax_amount: parseFloat(item.tax_amount) || 0,
//             discount: parseFloat(item.discount) || 0,
//             sub_total: item.sub_total,
//             active_status: 'awaiting',
//             status_history: [{
//                 status: 'awaiting',
//                 timestamp: new Date()
//             }]
//         }));
//         console.log(" orderItems ", orderItems);

//         await OrderItem.insertMany(orderItems, { session });

//         // Update product stock (important!)
//         for (const item of itemsWithDetails) {
//             const product = await Product.findById(item.product_id).session(session);

//             if (product.productType === PRODUCT_TYPES.SIMPLE) {
//                 product.simpleProduct.sp_totalStock -= item.quantity;
//                 if (product.simpleProduct.sp_totalStock <= 0) {
//                     product.simpleProduct.sp_stockStatus = STOCK_STATUS.OUT_OF_STOCK;
//                 }
//             } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                 const variant = product.variants.id(item.product_variant_id);
//                 if (variant) {
//                     variant.variant_totalStock -= item.quantity;
//                     if (variant.variant_totalStock <= 0) {
//                         variant.variant_stockStatus = STOCK_STATUS.OUT_OF_STOCK;
//                     }
//                 }
//             }

//             await product.save({ session });
//         }

//         await session.commitTransaction();

//         // Send email in background (non-blocking)
//         setTimeout(() => {
//             sendOrderEmailInBackground(
//                 order,
//                 user,
//                 itemsWithDetails
//             );
//         }, 0);

//         res.status(201).json({
//             success: true,
//             message: 'Order created successfully',
//             data: {
//                 order_id: order._id,
//                 order_number: order.order_number,
//                 delivery_charge: finalDeliveryCharge,
//                 total: total,
//                 email_sent: true
//             }
//         });

//     } catch (error) {
//         console.error("Order creation error:", error);
//         await session.abortTransaction();
//         res.status(500).json({
//             success: false,
//             message: 'Failed to create order',
//             error: error.message
//         });
//     } finally {
//         session.endSession();
//     }
// };

// const createOrderItem = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const {
//             address_id,
//             mobile,
//             address,
//             location,
//             items,
//             payment_method,
//             promo_details,
//             discount,
//             tax_amount,
//             delivery_info,
//             shipping_method = 'standard'
//         } = req.body;

//         const user_id = req.user._id;

//         // Validate User and Address IDs
//         await checkId(User, user_id);

//         // Fetch user details
//         const user = await User.findById(user_id).select('name email phone username');

//         // Fetch address
//         const userAddress = await Address.findById(address_id)
//             .populate({
//                 path: 'area_id',
//                 select: 'delivery_charges minimum_free_delivery_order_amount name active'
//             })
//             .populate({
//                 path: 'city_id',
//                 select: 'name active pincode'
//             });

//         if (!userAddress) {
//             throw new Error('Address not found');
//         }

//         // Get delivery charge
//         const areaDeliveryCharge = parseFloat(userAddress.area_id.delivery_charges) || 0;
//         const minimumFreeDeliveryAmount = parseFloat(userAddress.area_id.minimum_free_delivery_order_amount) || 0;

//         // ShipRocket serviceability check
//         let shiprocketServiceability = null;
//         let shiprocketDeliveryCharge = areaDeliveryCharge;
//         let totalWeight = 0;

//         if (shipping_method === 'shiprocket') {
//             try {
//                 const pincode = userAddress.pincode || userAddress.city_id?.pincode;
//                 if (!pincode) {
//                     throw new Error('Pincode not found for address');
//                 }
                
//                 totalWeight = items.reduce((sum, item) => {
//                     return sum + (item.quantity * 0.5);
//                 }, 0);
                
//                 shiprocketServiceability = await ShipRocketService.checkServiceability(
//                     pincode,
//                     totalWeight || 0.5,
//                     15, 15, 15
//                 );
                
//                 if (shiprocketServiceability?.data?.available) {
//                     shiprocketDeliveryCharge = parseFloat(shiprocketServiceability.data.freight_charge) || areaDeliveryCharge;
//                 }
//             } catch (shiprocketError) {
//                 console.warn('ShipRocket serviceability check failed:', shiprocketError.message);
//             }
//         }

//         // Validate products and stock
//         const productVariantMap = {};
//         items.forEach(item => {
//             if (!productVariantMap[item.product_id]) {
//                 productVariantMap[item.product_id] = [];
//             }
//             productVariantMap[item.product_id].push({
//                 variantId: item.product_variant_id,
//                 quantity: item.quantity
//             });
//         });

//         for (const [productId, variants] of Object.entries(productVariantMap)) {
//             const product = await Product.findById(productId);
//             if (!product) throw new Error(`Product ${productId} not found`);
//             if (!product.status || !product.isApproved || product.isDeleted) {
//                 throw new Error(`Product ${productId} is not available`);
//             }

//             for (const variantInfo of variants) {
//                 if (!variantInfo.variantId && product.productType === PRODUCT_TYPES.SIMPLE) {
//                     if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK ||
//                         product.simpleProduct.sp_totalStock < variantInfo.quantity) {
//                         throw new Error(`Insufficient stock for product ${product.name}`);
//                     }
//                     continue;
//                 }
                
//                 const variant = product.variants.id(variantInfo.variantId);
//                 if (!variant) throw new Error(`Variant ${variantInfo.variantId} not found`);
//                 if (!variant.variant_isActive) throw new Error(`Variant ${variantInfo.variantId} is not active`);
                
//                 if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                     if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK ||
//                         variant.variant_totalStock < variantInfo.quantity) {
//                         throw new Error(`Insufficient stock for variant ${product.name}`);
//                     }
//                 }
//             }
//         }

//         // Calculate item details
//         const itemsWithDetails = await Promise.all(items.map(async (item) => {
//             const product = await Product.findById(item.product_id);
//             let variant = null;
//             let price = item.price !== undefined ? parseFloat(item.price) : undefined;
            
//             if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                 if (item.product_variant_id) {
//                     variant = product.variants.id(item.product_variant_id);
//                     if (!variant) throw new Error(`Variant ${item.product_variant_id} not found`);
//                     if (price === undefined) {
//                         price = parseFloat(variant.variant_specialPrice || variant.variant_price);
//                     }
//                 } else {
//                     throw new Error(`Variant ID required for variable product ${product.name}`);
//                 }
//             } else if (product.productType === PRODUCT_TYPES.SIMPLE && price === undefined) {
//                 price = parseFloat(product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price || product.simpleProduct.price);
//             }

//             if (!price || price <= 0 || isNaN(price)) {
//                 throw new Error(`Invalid price for product ${product.name}`);
//             }

//             const sub_total = price * item.quantity;
//             let variantName = product.name;
//             if (variant) {
//                 variantName = `${product.name} - ${variant.variant_sku || 'Variant'}`;
//             }

//             return {
//                 ...item,
//                 price,
//                 sub_total,
//                 product_name: product.name,
//                 variant_name: variantName,
//                 vendorId: product.vendorId,
//             };
//         }));
        
//         const itemsTotal = itemsWithDetails.reduce((sum, item) => sum + item.sub_total, 0);
//         const promoDiscount = parseFloat(promo_details?.discount) || 0;

//         // Calculate delivery charge
//         let finalDeliveryCharge = shipping_method === 'shiprocket' ? shiprocketDeliveryCharge : areaDeliveryCharge;
//         if (minimumFreeDeliveryAmount > 0 && itemsTotal >= minimumFreeDeliveryAmount) {
//             finalDeliveryCharge = 0;
//         }

//         // Calculate total
//         const total = itemsTotal + finalDeliveryCharge - (parseFloat(discount) || 0) - promoDiscount + (parseFloat(tax_amount) || 0);

//         // Check if payment method is Tez
//         const isTezPayment = payment_method === PaymentMethod.TEZ || payment_method === 'tez';

//         // **VALIDATE MOBILE FOR TEZ PAYMENT**
//         let paymentMobile = mobile || user.phone || userAddress.mobile;
        
//         if (isTezPayment) {
//             // Ensure we have a mobile number for Tez payment
//             if (!paymentMobile) {
//                 throw new Error('Mobile number is required for Tez payment');
//             }
            
//             // Validate mobile format for Tez
//             const formattedMobile = tezGateway.formatMobileNumber(paymentMobile);
//             if (!tezGateway.validateMobileNumber(formattedMobile)) {
//                 throw new Error(`Invalid mobile number for Tez payment: ${paymentMobile}. Please provide a valid 10-digit Indian mobile number.`);
//             }
//             paymentMobile = formattedMobile; // Use formatted mobile
//         }

//         // Create Order
//         const order = new Order({
//             user_id,
//             address_id,
//             mobile: paymentMobile, // Use validated/formatted mobile
//             address: address || userAddress.address,
//             location: location || userAddress.location,
//             total: itemsTotal,
//             delivery_charge: finalDeliveryCharge,
//             discount: discount || 0,
//             promo_details: promo_details ? {
//                 code: promo_details.code,
//                 discount: parseFloat(promo_details.discount) || 0,
//                 discount_type: promo_details.discount_type || 'fixed'
//             } : undefined,
//             tax_amount: parseFloat(tax_amount) || 0,
//             total_payable: total,
//             final_total: total,
//             payment: {
//                 method: payment_method,
//                 status: isTezPayment ? 'pending' : (payment_method === PaymentMethod.COD ? 'pending' : 'pending'),
//                 gateway: isTezPayment ? 'tez' : null
//             },
//             delivery_info: {
//                 ...delivery_info,
//                 shipping_method: shipping_method,
//                 shiprocket_data: shipping_method === 'shiprocket' ? {
//                     serviceability: shiprocketServiceability,
//                     weight: totalWeight,
//                     delivery_charge: shiprocketDeliveryCharge
//                 } : undefined
//             },
//             status: 'received',
//             status_timestamps: {
//                 received: new Date()
//             }
//         });

//         await order.save({ session });

//         // Create Order Items
//         const orderItems = itemsWithDetails.map(item => ({
//             user_id,
//             order_id: order._id,
//             seller_id: item.vendorId,
//             product_id: item.product_id,
//             product_variant_id: item.product_variant_id,
//             product_name: item.product_name,
//             variant_name: item.variant_name,
//             quantity: item.quantity,
//             price: item.price,
//             discounted_price: parseFloat(item.discounted_price) || item.price,
//             tax_percent: parseFloat(item.tax_percent) || 0,
//             tax_amount: parseFloat(item.tax_amount) || 0,
//             discount: parseFloat(item.discount) || 0,
//             sub_total: item.sub_total,
//             active_status: 'awaiting',
//             status_history: [{
//                 status: 'awaiting',
//                 timestamp: new Date()
//             }]
//         }));

//         await OrderItem.insertMany(orderItems, { session });

//         // Update product stock
//         for (const item of itemsWithDetails) {
//             const product = await Product.findById(item.product_id).session(session);
//             if (product.productType === PRODUCT_TYPES.SIMPLE) {
//                 product.simpleProduct.sp_totalStock -= item.quantity;
//                 if (product.simpleProduct.sp_totalStock <= 0) {
//                     product.simpleProduct.sp_stockStatus = STOCK_STATUS.OUT_OF_STOCK;
//                 }
//             } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                 const variant = product.variants.id(item.product_variant_id);
//                 if (variant) {
//                     variant.variant_totalStock -= item.quantity;
//                     if (variant.variant_totalStock <= 0) {
//                         variant.variant_stockStatus = STOCK_STATUS.OUT_OF_STOCK;
//                     }
//                 }
//             }
//             await product.save({ session });
//         }

//         await session.commitTransaction();

//         console.log('Order saved successfully:', {
//             orderId: order._id,
//             orderNumber: order.order_number,
//             paymentMethod: payment_method,
//             totalAmount: total,
//             mobile: paymentMobile
//         });

//         // **TEZ PAYMENT INTEGRATION**
//         let paymentResponse = null;
//         if (isTezPayment) {
//             try {
//                 console.log('Initiating Tez payment for order:', {
//                     orderId: order._id,
//                     orderNumber: order.order_number,
//                     amount: total,
//                     mobile: paymentMobile
//                 });
                
//                 // Use order_number as order_id for Tez
//                 const tezOrderId = order.order_number || `ORD_${order._id}`;
                
//                 paymentResponse = await tezGateway.createPaymentOrder({
//                     customerMobile: paymentMobile,
//                     amount: total.toString(),
//                     orderId: tezOrderId,
//                     remark1: `Order: ${order.order_number}`.substring(0, 50),
//                     remark2: `Customer: ${user.name || user.email}`.substring(0, 50)
//                 });

//                 console.log('Tez payment initiated successfully:', {
//                     orderId: order._id,
//                     paymentUrl: paymentResponse.paymentUrl,
//                     transactionId: paymentResponse.transactionId,
//                     message: paymentResponse.message
//                 });

//                 // Update order with payment details
//                 await Order.findByIdAndUpdate(order._id, {
//                     'payment.transaction_id': paymentResponse.transactionId,
//                     'payment.payment_url': paymentResponse.paymentUrl,
//                     'payment.gateway_response': paymentResponse.paymentData,
//                     'payment.remark1': paymentResponse.paymentData.remark1,
//                     'payment.remark2': paymentResponse.paymentData.remark2
//                 });

//             } catch (paymentError) {
//                 console.error('Failed to create Tez payment:', {
//                     error: paymentError.message,
//                     orderId: order._id,
//                     mobile: paymentMobile
//                 });
                
//                 // Update order to reflect payment failure
//                 await Order.findByIdAndUpdate(order._id, {
//                     'payment.status': 'failed',
//                     'payment.failure_reason': paymentError.message
//                 });

//                 // Rollback stock for Tez payment failure
//                 await mongoose.startSession().then(async (rollbackSession) => {
//                     rollbackSession.startTransaction();
//                     try {
//                         for (const item of itemsWithDetails) {
//                             const product = await Product.findById(item.product_id).session(rollbackSession);
//                             if (product.productType === PRODUCT_TYPES.SIMPLE) {
//                                 product.simpleProduct.sp_totalStock += item.quantity;
//                                 product.simpleProduct.sp_stockStatus = STOCK_STATUS.IN_STOCK;
//                             } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
//                                 const variant = product.variants.id(item.product_variant_id);
//                                 if (variant) {
//                                     variant.variant_totalStock += item.quantity;
//                                     variant.variant_stockStatus = STOCK_STATUS.IN_STOCK;
//                                 }
//                             }
//                             await product.save({ session: rollbackSession });
//                         }
//                         await rollbackSession.commitTransaction();
//                     } catch (rollbackError) {
//                         console.error('Failed to rollback stock:', rollbackError);
//                         await rollbackSession.abortTransaction();
//                     } finally {
//                         rollbackSession.endSession();
//                     }
//                 });

//                 return res.status(400).json({
//                     success: false,
//                     message: 'Payment initialization failed',
//                     error: paymentError.message,
//                     order_id: order._id,
//                     order_number: order.order_number,
//                     requires_payment_retry: true
//                 });
//             }
//         }

//         // Create ShipRocket shipment for non-Tez prepaid orders
//         if (shipping_method === 'shiprocket' && payment_method !== PaymentMethod.COD && !isTezPayment) {
//             setTimeout(async () => {
//                 try {
//                     await createShipRocketShipmentInBackground(order._id, user, userAddress, itemsWithDetails);
//                 } catch (error) {
//                     console.error('Failed to create ShipRocket shipment:', error);
//                 }
//             }, 1000);
//         }

//         // Send email
//         setTimeout(() => {
//             sendOrderEmailInBackground(order, user, itemsWithDetails);
//         }, 0);

//         // Prepare response
//         const responseData = {
//             success: true,
//             message: isTezPayment ? 'Order created. Please complete Tez payment.' : 'Order created successfully',
//             data: {
//                 order_id: order._id,
//                 order_number: order.order_number,
//                 delivery_charge: finalDeliveryCharge,
//                 shipping_method: shipping_method,
//                 shiprocket_available: shipping_method === 'shiprocket' ? 
//                     (shiprocketServiceability?.data?.available || false) : null,
//                 total: total,
//                 email_sent: true
//             }
//         };

//         // Add Tez payment details if applicable
//         if (isTezPayment && paymentResponse) {
//             responseData.data.payment = {
//                 method: 'tez',
//                 status: 'pending',
//                 payment_url: paymentResponse.paymentUrl,
//                 transaction_id: paymentResponse.transactionId,
//                 redirect_required: true,
//                 message: paymentResponse.message
//             };
//         }

//         res.status(201).json(responseData);

//     } catch (error) {
//         console.error("Order creation error:", error);
//         await session.abortTransaction();
//         res.status(500).json({
//             success: false,
//             message: 'Failed to create order',
//             error: error.message
//         });
//     } finally {
//         session.endSession();
//     }
// };

//with payment gateway
const createOrderItem = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            address_id,
            mobile,
            address,
            location,
            items,
            payment_method,
            promo_details,
            discount,
            tax_amount,
            delivery_info,
            shipping_method = 'standard'
        } = req.body;

        const user_id = req.user._id;

        // Validate User and Address IDs
        await checkId(User, user_id);

        // Fetch user details
        const user = await User.findById(user_id).select('name email phone username');

        // Fetch address
        const userAddress = await Address.findById(address_id)
            .populate({
                path: 'area_id',
                select: 'delivery_charges minimum_free_delivery_order_amount name active'
            })
            .populate({
                path: 'city_id',
                select: 'name active pincode'
            });

        if (!userAddress) {
            throw new Error('Address not found');
        }

        // Get delivery charge
        const areaDeliveryCharge = parseFloat(userAddress.area_id.delivery_charges) || 0;
        const minimumFreeDeliveryAmount = parseFloat(userAddress.area_id.minimum_free_delivery_order_amount) || 0;

        // ShipRocket serviceability check
        let shiprocketServiceability = null;
        let shiprocketDeliveryCharge = areaDeliveryCharge;
        let totalWeight = 0;

        if (shipping_method === 'shiprocket') {
            try {
                const pincode = userAddress.pincode || userAddress.city_id?.pincode;
                if (!pincode) {
                    throw new Error('Pincode not found for address');
                }
                
                totalWeight = items.reduce((sum, item) => {
                    return sum + (item.quantity * 0.5);
                }, 0);
                
                shiprocketServiceability = await ShipRocketService.checkServiceability(
                    pincode,
                    totalWeight || 0.5,
                    15, 15, 15
                );
                
                if (shiprocketServiceability?.data?.available) {
                    shiprocketDeliveryCharge = parseFloat(shiprocketServiceability.data.freight_charge) || areaDeliveryCharge;
                }
            } catch (shiprocketError) {
                console.warn('ShipRocket serviceability check failed:', shiprocketError.message);
            }
        }

        // Validate products and stock
        const productVariantMap = {};
        items.forEach(item => {
            if (!productVariantMap[item.product_id]) {
                productVariantMap[item.product_id] = [];
            }
            productVariantMap[item.product_id].push({
                variantId: item.product_variant_id,
                quantity: item.quantity
            });
        });

        for (const [productId, variants] of Object.entries(productVariantMap)) {
            const product = await Product.findById(productId);
            if (!product) throw new Error(`Product ${productId} not found`);
            if (!product.status || !product.isApproved || product.isDeleted) {
                throw new Error(`Product ${productId} is not available`);
            }

            for (const variantInfo of variants) {
                if (!variantInfo.variantId && product.productType === PRODUCT_TYPES.SIMPLE) {
                    if (product.simpleProduct.sp_stockStatus !== STOCK_STATUS.IN_STOCK ||
                        product.simpleProduct.sp_totalStock < variantInfo.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name}`);
                    }
                    continue;
                }
                
                const variant = product.variants.id(variantInfo.variantId);
                if (!variant) throw new Error(`Variant ${variantInfo.variantId} not found`);
                if (!variant.variant_isActive) throw new Error(`Variant ${variantInfo.variantId} is not active`);
                
                if (product.productType === PRODUCT_TYPES.VARIABLE) {
                    if (variant.variant_stockStatus !== STOCK_STATUS.IN_STOCK ||
                        variant.variant_totalStock < variantInfo.quantity) {
                        throw new Error(`Insufficient stock for variant ${product.name}`);
                    }
                }
            }
        }

        // Calculate item details
        const itemsWithDetails = await Promise.all(items.map(async (item) => {
            const product = await Product.findById(item.product_id);
            let variant = null;
            let price = item.price !== undefined ? parseFloat(item.price) : undefined;
            
            if (product.productType === PRODUCT_TYPES.VARIABLE) {
                if (item.product_variant_id) {
                    variant = product.variants.id(item.product_variant_id);
                    if (!variant) throw new Error(`Variant ${item.product_variant_id} not found`);
                    if (price === undefined) {
                        price = parseFloat(variant.variant_specialPrice || variant.variant_price);
                    }
                } else {
                    throw new Error(`Variant ID required for variable product ${product.name}`);
                }
            } else if (product.productType === PRODUCT_TYPES.SIMPLE && price === undefined) {
                price = parseFloat(product.simpleProduct.sp_specialPrice || product.simpleProduct.sp_price || product.simpleProduct.price);
            }

            if (!price || price <= 0 || isNaN(price)) {
                throw new Error(`Invalid price for product ${product.name}`);
            }

            const sub_total = price * item.quantity;
            let variantName = product.name;
            if (variant) {
                variantName = `${product.name} - ${variant.variant_sku || 'Variant'}`;
            }

            return {
                ...item,
                price,
                sub_total,
                product_name: product.name,
                variant_name: variantName,
                vendorId: product.vendorId,
            };
        }));
        
        const itemsTotal = itemsWithDetails.reduce((sum, item) => sum + item.sub_total, 0);
        const promoDiscount = parseFloat(promo_details?.discount) || 0;

        // Calculate delivery charge
        let finalDeliveryCharge = shipping_method === 'shiprocket' ? shiprocketDeliveryCharge : areaDeliveryCharge;
        if (minimumFreeDeliveryAmount > 0 && itemsTotal >= minimumFreeDeliveryAmount) {
            finalDeliveryCharge = 0;
        }

        // Calculate total
        const total = itemsTotal + finalDeliveryCharge - (parseFloat(discount) || 0) - promoDiscount + (parseFloat(tax_amount) || 0);

        // Create Order
        const order = new Order({
            user_id,
            address_id,
            mobile: paymentMobile, // Use validated/formatted mobile
            address: address || userAddress.address,
            location: location || userAddress.location,
            total: itemsTotal,
            delivery_charge: finalDeliveryCharge,
            discount: discount || 0,
            promo_details: promo_details ? {
                code: promo_details.code,
                discount: parseFloat(promo_details.discount) || 0,
                discount_type: promo_details.discount_type || 'fixed'
            } : undefined,
            tax_amount: parseFloat(tax_amount) || 0,
            total_payable: total,
            final_total: total,
            payment: {
                method: payment_method,
                status: isTezPayment ? 'pending' : (payment_method === PaymentMethod.COD ? 'pending' : 'pending'),
                gateway: isTezPayment ? 'tez' : null
            },
            delivery_info: {
                ...delivery_info,
                shipping_method: shipping_method,
                shiprocket_data: shipping_method === 'shiprocket' ? {
                    serviceability: shiprocketServiceability,
                    weight: totalWeight,
                    delivery_charge: shiprocketDeliveryCharge
                } : undefined
            },
            status: OrderStatus.PLACED,
            status_timestamps: {
                placed: new Date()
            }
        });

        await order.save({ session });

        // Create Order Items
        const orderItems = itemsWithDetails.map(item => ({
            user_id,
            order_id: order._id,
            seller_id: item.vendorId,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            product_name: item.product_name,
            variant_name: item.variant_name,
            quantity: item.quantity,
            price: item.price,
            discounted_price: parseFloat(item.discounted_price) || item.price,
            tax_percent: parseFloat(item.tax_percent) || 0,
            tax_amount: parseFloat(item.tax_amount) || 0,
            discount: parseFloat(item.discount) || 0,
            sub_total: item.sub_total,
            active_status: 'awaiting',
            status_history: [{
                status: 'awaiting',
                timestamp: new Date()
            }]
        }));

        await OrderItem.insertMany(orderItems, { session });

        // Update product stock
        for (const item of itemsWithDetails) {
            const product = await Product.findById(item.product_id).session(session);
            if (product.productType === PRODUCT_TYPES.SIMPLE) {
                product.simpleProduct.sp_totalStock -= item.quantity;
                if (product.simpleProduct.sp_totalStock <= 0) {
                    product.simpleProduct.sp_stockStatus = STOCK_STATUS.OUT_OF_STOCK;
                }
            } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
                const variant = product.variants.id(item.product_variant_id);
                if (variant) {
                    variant.variant_totalStock -= item.quantity;
                    if (variant.variant_totalStock <= 0) {
                        variant.variant_stockStatus = STOCK_STATUS.OUT_OF_STOCK;
                    }
                }
            }
            await product.save({ session });
        }

        await session.commitTransaction();

        console.log('Order saved successfully:', {
            orderId: order._id,
            orderNumber: order.order_number,
            paymentMethod: payment_method,
            totalAmount: total,
            mobile: paymentMobile
        });

        // **TEZ PAYMENT INTEGRATION**
        // let paymentResponse = null;
        // if (isTezPayment) {
        //     try {
        //         console.log('Initiating Tez payment for order:', {
        //             orderId: order._id,
        //             orderNumber: order.order_number,
        //             amount: total,
        //             mobile: paymentMobile
        //         });
                
        //         // Use order_number as order_id for Tez
        //         const tezOrderId = order.order_number || `ORD_${order._id}`;
                
        //         paymentResponse = await tezGateway.createPaymentOrder({
        //             customerMobile: paymentMobile,
        //             amount: total.toString(),
        //             orderId: tezOrderId,
        //             remark1: `Order: ${order.order_number}`.substring(0, 50),
        //             remark2: `Customer: ${user.name || user.email}`.substring(0, 50)
        //         });

        //         console.log('Tez payment initiated successfully:', {
        //             orderId: order._id,
        //             paymentUrl: paymentResponse.paymentUrl,
        //             transactionId: paymentResponse.transactionId,
        //             message: paymentResponse.message
        //         });

        //         // Update order with payment details
        //         await Order.findByIdAndUpdate(order._id, {
        //             'payment.transaction_id': paymentResponse.transactionId,
        //             'payment.payment_url': paymentResponse.paymentUrl,
        //             'payment.gateway_response': paymentResponse.paymentData,
        //             'payment.remark1': paymentResponse.paymentData.remark1,
        //             'payment.remark2': paymentResponse.paymentData.remark2
        //         });

        //     } catch (paymentError) {
        //         console.error('Failed to create Tez payment:', {
        //             error: paymentError.message,
        //             orderId: order._id,
        //             mobile: paymentMobile
        //         });
                
        //         // Update order to reflect payment failure
        //         await Order.findByIdAndUpdate(order._id, {
        //             'payment.status': 'failed',
        //             'payment.failure_reason': paymentError.message
        //         });

        //         // Rollback stock for Tez payment failure
        //         await mongoose.startSession().then(async (rollbackSession) => {
        //             rollbackSession.startTransaction();
        //             try {
        //                 for (const item of itemsWithDetails) {
        //                     const product = await Product.findById(item.product_id).session(rollbackSession);
        //                     if (product.productType === PRODUCT_TYPES.SIMPLE) {
        //                         product.simpleProduct.sp_totalStock += item.quantity;
        //                         product.simpleProduct.sp_stockStatus = STOCK_STATUS.IN_STOCK;
        //                     } else if (product.productType === PRODUCT_TYPES.VARIABLE) {
        //                         const variant = product.variants.id(item.product_variant_id);
        //                         if (variant) {
        //                             variant.variant_totalStock += item.quantity;
        //                             variant.variant_stockStatus = STOCK_STATUS.IN_STOCK;
        //                         }
        //                     }
        //                     await product.save({ session: rollbackSession });
        //                 }
        //                 await rollbackSession.commitTransaction();
        //             } catch (rollbackError) {
        //                 console.error('Failed to rollback stock:', rollbackError);
        //                 await rollbackSession.abortTransaction();
        //             } finally {
        //                 rollbackSession.endSession();
        //             }
        //         });

        //         return res.status(400).json({
        //             success: false,
        //             message: 'Payment initialization failed',
        //             error: paymentError.message,
        //             order_id: order._id,
        //             order_number: order.order_number,
        //             requires_payment_retry: true
        //         });
        //     }
        // }

        // Create ShipRocket shipment for non-Tez prepaid orders
        if (shipping_method === 'shiprocket' && payment_method !== PaymentMethod.COD && !isTezPayment) {
            setTimeout(async () => {
                try {
                    await createShipRocketShipmentInBackground(order._id, user, userAddress, itemsWithDetails);
                } catch (error) {
                    console.error('Failed to create ShipRocket shipment:', error);
                }
            }, 1000);
        }

        // Send email
        setTimeout(() => {
            sendOrderEmailInBackground(order, user, itemsWithDetails);
        }, 0);

        // Prepare response
        const responseData = {
            success: true,
            message: isTezPayment ? 'Order created. Please complete Tez payment.' : 'Order created successfully',
            data: {
                order_id: order._id,
                order_number: order.order_number,
                delivery_charge: finalDeliveryCharge,
                shipping_method: shipping_method,
                shiprocket_available: shipping_method === 'shiprocket' ? 
                    (shiprocketServiceability?.data?.available || false) : null,
                total: total,
                email_sent: true
            }
        };

        // Add Tez payment details if applicable
        if (isTezPayment && paymentResponse) {
            responseData.data.payment = {
                method: 'tez',
                status: 'pending',
                payment_url: paymentResponse.paymentUrl,
                transaction_id: paymentResponse.transactionId,
                redirect_required: true,
                message: paymentResponse.message
            };
        }

        res.status(201).json(responseData);

    } catch (error) {
        console.error("Order creation error:", error);
        await session.abortTransaction();
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};



// 2. BULK CREATE - Create multiple order items (for order creation)
const bulkCreateOrderItems = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { order_id, items } = req.body;

        if (!order_id || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Order ID and items array are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order ID format'
            });
        }

        // Check if order exists
        const order = await Order.findById(order_id).session(session);
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const createdItems = [];
        const errors = [];

        for (const [index, item] of items.entries()) {
            try {
                // Validate item
                const required = ['product_variant_id', 'product_name', 'quantity', 'price', 'seller_id'];
                const missing = required.filter(field => !item[field]);

                if (missing.length > 0) {
                    errors.push({
                        index,
                        error: `Missing fields: ${missing.join(', ')}`,
                        item
                    });
                    continue;
                }

                // Calculate item totals
                const finalPrice = item.discounted_price || item.price;
                const subTotal = finalPrice * item.quantity;
                const taxPercent = item.tax_percent || 0;
                const taxAmount = (subTotal * taxPercent) / 100;

                const orderItem = new OrderItem({
                    order_id,
                    user_id: order.user_id, // Inherit from order
                    seller_id: item.seller_id,
                    product_variant_id: item.product_variant_id,
                    product_name: item.product_name.trim(),
                    variant_name: item.variant_name?.trim() || null,
                    quantity: item.quantity,
                    price: item.price,
                    discounted_price: item.discounted_price || null,
                    tax_percent: taxPercent,
                    tax_amount: taxAmount,
                    discount: item.discount || 0,
                    sub_total: subTotal,
                    admin_commission_amount: item.admin_commission_amount || 0,
                    seller_commission_amount: item.seller_commission_amount || 0,
                    active_status: 'awaiting',
                    status_history: [{
                        status: 'awaiting',
                        timestamp: new Date()
                    }]
                });

                await orderItem.save({ session });
                createdItems.push(orderItem._id);

            } catch (itemError) {
                errors.push({
                    index,
                    error: itemError.message,
                    item
                });
            }
        }

        // If all items failed
        if (createdItems.length === 0 && errors.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'All items failed validation',
                errors
            });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Order items created successfully',
            data: {
                total_requested: items.length,
                successful: createdItems.length,
                failed: errors.length,
                created_ids: createdItems,
                errors: errors.length > 0 ? errors : undefined
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error bulk creating order items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order items',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 3. READ - Get all order items (with filtering)
const getAllOrderItems = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            order_id,
            seller_id,
            user_id,
            product_variant_id,
            active_status,
            start_date,
            end_date,
            search,
            sort_by = 'date_added',
            sort_order = 'desc'
        } = req.query;

        // Build query
        const query = {};

        // Filter by order
        if (order_id) {
            if (!mongoose.Types.ObjectId.isValid(order_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Order ID format'
                });
            }
            query.order_id = order_id;
        }

        // Filter by seller
        if (seller_id) {
            if (!mongoose.Types.ObjectId.isValid(seller_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Seller ID format'
                });
            }
            query.seller_id = seller_id;
        }

        // Filter by user
        if (user_id) {
            if (!mongoose.Types.ObjectId.isValid(user_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid User ID format'
                });
            }
            query.user_id = user_id;
        }

        // Filter by product variant
        if (product_variant_id) {
            if (!mongoose.Types.ObjectId.isValid(product_variant_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Product Variant ID format'
                });
            }
            query.product_variant_id = product_variant_id;
        }

        // Filter by status
        if (active_status) {
            query.active_status = active_status;
        }

        // Filter by date range
        if (start_date || end_date) {
            query.date_added = {};
            if (start_date) query.date_added.$gte = new Date(start_date);
            if (end_date) query.date_added.$lte = new Date(end_date);
        }

        // Search in product name
        if (search) {
            query.product_name = { $regex: search, $options: 'i' };
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await OrderItem.countDocuments(query);

        // Determine sort
        const sort = {};
        sort[sort_by] = sort_order === 'desc' ? -1 : 1;

        // Get order items with populated data
        const orderItems = await OrderItem.find(query)
            .populate('order_id', 'order_number status date_added')
            .populate('seller_id', 'username email mobile')
            .populate('user_id', 'username email')
            .populate('product_variant_id', 'sku product_id')
            .populate({
                path: 'product_variant_id',
                populate: {
                    path: 'product_id',
                    select: 'name category images'
                }
            })
            .populate('delivery_boy_id', 'username mobile')
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get summary statistics
        const summary = {
            total_items: total,
            total_quantity: await OrderItem.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).then(result => result[0]?.total || 0),
            total_revenue: await OrderItem.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$sub_total' } } }
            ]).then(result => result[0]?.total || 0),
            status_counts: await OrderItem.aggregate([
                { $match: query },
                { $group: { _id: '$active_status', count: { $sum: 1 } } }
            ])
        };

        res.status(200).json({
            success: true,
            message: 'Order items retrieved successfully',
            data: {
                order_items: orderItems,
                summary,
                pagination: {
                    current_page: pageNum,
                    total_pages: Math.ceil(total / limitNum),
                    total_items: total,
                    items_per_page: limitNum,
                    has_next: pageNum < Math.ceil(total / limitNum),
                    has_previous: pageNum > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order items'
        });
    }
};

// 4. READ - Get order item by ID
const getOrderItemById = async (req, res) => {
    try {
        const { order_id } = req.params;
          const user_id = req.user._id;

        const order = await Order.findOne({
            _id: order_id,
        }).lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const items = await OrderItem.find({ order_id })
            .populate('product_variant_id', 'images attributes')
            .populate('seller_id', 'name email');

        res.json({
            success: true,
            data: { ...order, items }
        });

    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details',
            error: error.message
        });
    }
}

// 5. READ - Get order items by order ID
const getOrderItemsByOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        const {
            seller_id,
            status,
            group_by_seller, // Added this parameter
            populate_seller = 'true',
            populate_product = 'true',
            limit,
            page = 1
        } = req.query;

        // Validate order ID
        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Order ID format'
            });
        }

        // Check if order exists
        const order = await Order.findById(order_id).select('order_number status total payment total_payable final_total');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Build query
        const query = { order_id };

        if (seller_id) {
            if (!mongoose.Types.ObjectId.isValid(seller_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Seller ID format'
                });
            }
            query.seller_id = seller_id;
        }

        if (status) {
            // Validate active_status against enum values
            const validStatuses = ['awaiting', 'placed', 'processed', 'shipped', 'delivered', 'cancelled', 'returned'];
            if (!validStatuses.includes(active_status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid active_status value'
                });
            }
            query.active_status = active_status;
        }

        // Build population options
        const populateOptions = [];

        if (populate_seller === 'true') {
            populateOptions.push({
                path: 'seller_id',
                select: 'username shop_name email mobile profile_image'
            });
        }

        if (populate_product === 'true') {
            populateOptions.push({
                path: 'product_variant_id',
                select: 'sku variant_images',
                populate: {
                    path: 'product_id',
                    select: 'name images category_id brand_id'
                }
            });
        }

        // Build delivery boy population if needed
        populateOptions.push({
            path: 'delivery_boy_id',
            select: 'username mobile',
            model: 'User'
        });

        // Calculate pagination
        const itemsPerPage = limit ? parseInt(limit) : 20;
        const skip = (parseInt(page) - 1) * itemsPerPage;

        // Get order items with pagination
        const orderItemsQuery = OrderItem.find(query);

        // Apply population
        if (populateOptions.length > 0) {
            populateOptions.forEach(option => {
                orderItemsQuery.populate(option);
            });
        }

        // Apply sorting and pagination
        orderItemsQuery.sort({ date_added: 1 });

        if (limit) {
            orderItemsQuery.skip(skip).limit(itemsPerPage);
        }

        const orderItems = await orderItemsQuery.lean();

        // Get total count for pagination
        const totalItems = await OrderItem.countDocuments(query);

        // Group by seller if requested
        let groupedData = null;
        if (group_by_seller === 'true') {
            groupedData = {};
            orderItems.forEach(item => {
                if (!item.seller_id) return;

                const sellerId = item.seller_id._id.toString();
                if (!groupedData[sellerId]) {
                    groupedData[sellerId] = {
                        seller: item.seller_id,
                        items: [],
                        total_amount: 0,
                        total_quantity: 0,
                        total_commission: 0,
                        status_summary: {}
                    };
                }

                groupedData[sellerId].items.push(item);
                groupedData[sellerId].total_amount += item.sub_total;
                groupedData[sellerId].total_quantity += item.quantity;
                groupedData[sellerId].total_commission += item.seller_commission_amount || 0;

                // Track status counts
                const status = item.active_status;
                groupedData[sellerId].status_summary[status] = (groupedData[sellerId].status_summary[status] || 0) + 1;
            });
        }

        // Calculate comprehensive order summary
        const orderSummary = {
            total_items: totalItems,
            total_quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
            total_amount: orderItems.reduce((sum, item) => sum + item.sub_total, 0),
            total_tax: orderItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0),
            total_discount: orderItems.reduce((sum, item) => sum + (item.discount || 0), 0),
            total_admin_commission: orderItems.reduce((sum, item) => sum + (item.admin_commission_amount || 0), 0),
            total_seller_commission: orderItems.reduce((sum, item) => sum + (item.seller_commission_amount || 0), 0),
            sellers_count: new Set(orderItems.map(item => item.seller_id?._id?.toString()).filter(Boolean)).size,
            status_breakdown: orderItems.reduce((acc, item) => {
                acc[item.active_status] = (acc[item.active_status] || 0) + 1;
                return acc;
            }, {})
        };

        // Prepare response
        const response = {
            success: true,
            message: 'Order items retrieved successfully',
            data: {
                order: {
                    id: order._id,
                    order_number: order.order_number,
                    status: order.status,
                    total: order.total,
                    total_payable: order.total_payable,
                    final_total: order.final_total,
                    payment_status: order.payment?.status
                },
                items: orderItems,
                summary: orderSummary,
                pagination: limit ? {
                    current_page: parseInt(page),
                    items_per_page: itemsPerPage,
                    total_pages: Math.ceil(totalItems / itemsPerPage),
                    total_items: totalItems,
                    has_next_page: skip + orderItems.length < totalItems,
                    has_previous_page: page > 1
                } : undefined
            }
        };

        // Add grouped data if requested
        if (group_by_seller === 'true' && groupedData) {
            response.data.grouped_by_seller = Object.values(groupedData);
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order items',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 6. UPDATE - Update order item status
const updateOrderItemStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const {
            active_status,
            notes,
            updated_by,
            otp,
            deliver_by,
            delivery_boy_id
        } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Validate status
        const validStatuses = ['awaiting', 'placed', 'processed', 'shipped', 'delivered', 'cancelled', 'returned'];
        if (!active_status || !validStatuses.includes(active_status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id).session(session);
        console.log(" orderItem ", orderItem);
        if (!orderItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if status transition is valid
        if (!isValidItemStatusTransition(orderItem.active_status, active_status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${orderItem.active_status} to ${active_status}`
            });
        }

        // Update order item
        orderItem.active_status = active_status;

        // Add to status history
        orderItem.status_history.push({
            status: active_status,
            timestamp: new Date(),
            notes: notes || undefined
        });

        // Update additional fields if provided
        if (delivery_boy_id) {
            if (!mongoose.Types.ObjectId.isValid(delivery_boy_id)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Delivery Boy ID format'
                });
            }
            orderItem.delivery_boy_id = delivery_boy_id;
        }

        if (otp !== undefined) orderItem.otp = otp;
        if (deliver_by) orderItem.deliver_by = deliver_by;
        if (updated_by) orderItem.updated_by = updated_by;

        await orderItem.save({ session });

        // Update order status if all items have same status
        await updateParentOrderStatus(orderItem.order_id, session);

        await session.commitTransaction();
        session.endSession();

        // Get updated item
        const updatedItem = await OrderItem.findById(id)
            .populate('order_id', 'order_number')
            .populate('seller_id', 'username')
            .lean();

        // Send notifications
        // await sendOrderItemStatusNotification(
        //     orderItem.user_id,
        //     orderItem.seller_id,
        //     orderItem.order_id,
        //     active_status
        // );

        res.status(200).json({
            success: true,
            message: `Order item status updated to ${active_status}`,
            data: updatedItem
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error updating order item status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order item status'
        });
    }
};

// 7. UPDATE - Update order item details
const updateOrderItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id);
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if item can be modified
        // if (!canModifyOrderItem(orderItem)) {
        //     return res.status(400).json({
        //         success: false,
        //         message: `Cannot modify order item in ${orderItem.active_status} status`
        //     });
        // }

        // Allowed fields to update
        const allowedFields = [
            'discounted_price', 'tax_percent', 'discount',
            'admin_commission_amount', 'seller_commission_amount',
            'deliver_by', 'notes'
        ];

        const updateFields = {};

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                updateFields[field] = updateData[field];
            }
        });

        // Recalculate if price-related fields changed
        const needsRecalculation =
            updateFields.discounted_price !== undefined ||
            updateFields.tax_percent !== undefined ||
            updateFields.discount !== undefined;

        if (needsRecalculation) {
            const finalPrice = updateFields.discounted_price || orderItem.discounted_price || orderItem.price;
            const quantity = orderItem.quantity;
            const taxPercent = updateFields.tax_percent || orderItem.tax_percent;
            const discount = updateFields.discount || orderItem.discount;

            const subTotal = finalPrice * quantity;
            const taxAmount = (subTotal * taxPercent) / 100;

            updateFields.sub_total = subTotal;
            updateFields.tax_amount = taxAmount;
            updateFields.discount = discount;
        }

        // Update order item
        const updatedItem = await OrderItem.findByIdAndUpdate(
            id,
            updateFields,
            { new: true, runValidators: true }
        )
            .populate('order_id', 'order_number')
            .populate('seller_id', 'username')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Order item updated successfully',
            data: updatedItem
        });

    } catch (error) {
        console.error('Error updating order item:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update order item'
        });
    }
};

// 8. UPDATE - Mark commission as credited
const markCommissionAsCredited = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { credited_by } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id).session(session);
        if (!orderItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if already credited
        if (orderItem.is_credited) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Commission already credited'
            });
        }

        // Check if item is delivered
        if (orderItem.active_status !== 'delivered') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Commission can only be credited for delivered items'
            });
        }

        // Mark as credited
        orderItem.is_credited = true;
        orderItem.updated_by = credited_by || null;

        // Add to status history
        orderItem.status_history.push({
            status: 'commission_credited',
            timestamp: new Date(),
            notes: 'Commission credited to seller'
        });

        await orderItem.save({ session });

        // Credit amount to seller's wallet
        await User.findByIdAndUpdate(
            orderItem.seller_id,
            {
                $inc: {
                    balance: orderItem.seller_commission_amount,
                    cash_received: orderItem.seller_commission_amount
                }
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Commission credited successfully',
            data: {
                order_item_id: orderItem._id,
                seller_id: orderItem.seller_id,
                amount_credited: orderItem.seller_commission_amount,
                credited_at: new Date()
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error crediting commission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to credit commission'
        });
    }
};

// 9. DELETE - Cancel/remove order item
const cancelOrderItem = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const user_id = req.user._id
    try {
        const { id } = req.params;
        const { reason, initiated_by,
            refund_amount,
            refund_to_wallet = true } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid Order Item ID format'
            });
        }

        // Validate required fields
        if (!reason || !initiated_by) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: reason, initiated_by, user_id'
            });
        }

        // Validate initiated_by
        const validInitiators = ['customer', 'seller', 'admin', 'system'];
        if (!validInitiators.includes(initiated_by)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Invalid initiated_by. Must be one of: ${validInitiators.join(', ')}`
            });
        }

        // Get order item
        const orderItem = await OrderItem.findById(id).session(session);
        if (!orderItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        // Check if user has permission to cancel
        if (initiated_by === 'customer' && orderItem.user_id.toString() !== user_id) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to cancel this order item'
            });
        }

        // Check if can be cancelled
        if (!canCancelOrderItem(orderItem)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Cannot cancel item in ${orderItem.active_status} status. Allowed statuses: awaiting, received`
            });
        }

        // Calculate refund amount (if not provided)
        const calculatedRefundAmount = refund_amount || calculateRefundAmount(orderItem);
        // Update status to cancelled
        orderItem.active_status = 'cancelled';
        orderItem.status_history.push({
            status: 'cancelled',
            timestamp: new Date(),
            notes: `Cancelled by ${initiated_by}: ${reason}`,
            refund_amount: calculatedRefundAmount
        });

        await orderItem.save({ session });

        // Get the parent order
        const order = await Order.findById(orderItem.order_id).session(session);
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Parent order not found'
            });
        }

        // Update order cancellation details
        order.cancellation = {
            reason,
            initiated_by,
            user_id: mongoose.Types.ObjectId.isValid(user_id) ? user_id : null,
            refund_status: 'pending',
            refund_amount: calculatedRefundAmount,
            cancelled_at: new Date()
        };

        // Process refund if applicable
        let refundProcessed = false;
        if (calculatedRefundAmount > 0) {
            refundProcessed = await processRefund(
                order,
                orderItem,
                calculatedRefundAmount,
                refund_to_wallet,
                session
            );

            if (refundProcessed) {
                order.cancellation.refund_status = 'processed';
                order.cancellation.refund_processed_at = new Date();
                order.cancellation.refund_method = refund_to_wallet ? 'wallet' : 'original_payment';
            }
        }

        await order.save({ session });

        // Update order totals
        await updateOrderTotals(orderItem.order_id, session);

        // Update parent order status based on all items
        await updateParentOrderStatusEnhanced(orderItem.order_id, session);

        await session.commitTransaction();
        session.endSession();

        // Get updated order with populated data
        const updatedOrder = await Order.findById(order._id)
            .populate('user_id', 'name email')
            .lean();

        // Send notifications
        // await sendCancellationNotification(
        //     orderItem.user_id,
        //     orderItem.seller_id,
        //     order,
        //     orderItem,
        //     reason,
        //     initiated_by,
        //     calculatedRefundAmount,
        //     refundProcessed
        // );

        res.status(200).json({
            success: true,
            message: 'Order item cancelled successfully',
            data: {
                order_item: {
                    _id: orderItem._id,
                    product_name: orderItem.product_name,
                    variant_name: orderItem.variant_name,
                    quantity: orderItem.quantity,
                    price: orderItem.price,
                    status: orderItem.active_status,
                    cancelled_at: new Date()
                },
                refund: {
                    amount: calculatedRefundAmount,
                    status: refundProcessed ? 'processed' : 'pending',
                    method: refund_to_wallet ? 'wallet' : 'original_payment',
                    processed_at: refundProcessed ? new Date() : null
                },
                order: {
                    _id: updatedOrder._id,
                    order_number: updatedOrder.order_number,
                    status: updatedOrder.status,
                    updated_total: updatedOrder.total_payable,
                    cancellation: updatedOrder.cancellation
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error cancelling order item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order item',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 10. ANALYTICS - Get seller performance
const getSellerPerformance = async (req, res) => {
    try {
        const { seller_id } = req.params;
        const { start_date, end_date } = req.query;

        if (!mongoose.Types.ObjectId.isValid(seller_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Seller ID format'
            });
        }

        // Check if seller exists
        const seller = await User.findById(seller_id);
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        // Build match query
        const matchQuery = { seller_id: mongoose.Types.ObjectId(seller_id) };
        if (start_date || end_date) {
            matchQuery.date_added = {};
            if (start_date) matchQuery.date_added.$gte = new Date(start_date);
            if (end_date) matchQuery.date_added.$lte = new Date(end_date);
        }

        // Get performance metrics
        const performance = await OrderItem.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    total_items_sold: { $sum: '$quantity' },
                    total_revenue: { $sum: '$sub_total' },
                    total_commission: { $sum: '$seller_commission_amount' },
                    total_orders: { $addToSet: '$order_id' },
                    status_counts: {
                        $push: '$active_status'
                    }
                }
            },
            {
                $project: {
                    total_items_sold: 1,
                    total_revenue: 1,
                    total_commission: 1,
                    total_orders: { $size: '$total_orders' },
                    avg_order_value: { $divide: ['$total_revenue', { $size: '$total_orders' }] },
                    status_counts: {
                        $arrayToObject: {
                            $map: {
                                input: { $setUnion: ['$status_counts'] },
                                as: 'status',
                                in: {
                                    k: '$$status',
                                    v: {
                                        $size: {
                                            $filter: {
                                                input: '$status_counts',
                                                as: 's',
                                                cond: { $eq: ['$$s', '$$status'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]);

        // Get top selling products
        const topProducts = await OrderItem.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$product_variant_id',
                    product_name: { $first: '$product_name' },
                    total_sold: { $sum: '$quantity' },
                    total_revenue: { $sum: '$sub_total' }
                }
            },
            { $sort: { total_sold: -1 } },
            { $limit: 10 }
        ]);

        // Get monthly performance
        const monthlyPerformance = await OrderItem.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        year: { $year: '$date_added' },
                        month: { $month: '$date_added' }
                    },
                    total_sales: { $sum: '$sub_total' },
                    total_items: { $sum: '$quantity' },
                    total_orders: { $addToSet: '$order_id' }
                }
            },
            {
                $project: {
                    period: {
                        $concat: [
                            { $toString: '$_id.year' },
                            '-',
                            { $toString: { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] } }
                        ],
                    },
                    total_sales: 1,
                    total_items: 1,
                    total_orders: { $size: '$total_orders' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            message: 'Seller performance retrieved',
            data: {
                seller: {
                    id: seller._id,
                    username: seller.username,
                    shop_name: seller.shop_name || 'N/A'
                },
                performance: performance[0] || {
                    total_items_sold: 0,
                    total_revenue: 0,
                    total_commission: 0,
                    total_orders: 0,
                    avg_order_value: 0,
                    status_counts: {}
                },
                top_products: topProducts,
                monthly_performance: monthlyPerformance,
                summary: {
                    period: start_date && end_date ?
                        `${start_date} to ${end_date}` : 'All time'
                }
            }
        });

    } catch (error) {
        console.error('Error fetching seller performance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch seller performance'
        });
    }
};

//11. GET ALL THE ORDER OF THE USER
const getUserOrders = async (req, res) => {
    console.log("getUserOrders called");

    try {
        // Get user ID from authenticated user
        const user_id = req.user._id;
        console.log("User ID:", user_id);

        // Get query parameters
        const { page = 1, limit = 10, sort_by = 'createdAt', sort_order = 'desc' } = req.query;
        console.log("Query params:", req.query);

        // Build query
        const query = { user_id };
        // if (status) {
        //     // Validate status against enum values
        //     const validStatuses = ['received', 'processed', 'shipped', 'delivered', 'cancelled', 'returned'];
        //     if (validStatuses.includes(status)) {
        //         query.status = status;
        //     } else {
        //         return res.status(400).json({
        //             success: false,
        //             message: 'Invalid status value'
        //         });
        //     }
        // }
        console.log("Query:", JSON.stringify(query));

        // Validate user exists
        const userExists = await User.findById(user_id).select('_id');
        if (!userExists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Build sort object
        const sort = {};
        sort[sort_by] = sort_order === 'desc' ? -1 : 1;

        // Get orders with pagination
        const orders = await Order.find(query)
            .select('order_number status total final_total payment createdAt updatedAt')
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        console.log("Orders found:", orders.length);

        // If no orders found, return empty array
        if (orders.length === 0) {
            return res.json({
                success: true,
                message: 'No orders found for this user',
                data: [],
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    pages: 0,
                    limit: parseInt(limit)
                }
            });
        }

        // Get all order IDs for batch query
        const orderIds = orders.map(order => order._id);

        // Get all order items for these orders in a single query
        const orderItems = await OrderItem.find({ order_id: { $in: orderIds } })
            .populate('seller_id', 'shop_name username')
            .populate('product_id', 'name images')
            .populate('product_variant_id', 'variant_name price')
            .lean();

        console.log("Order items found:", orderItems.length);

        // Group order items by order_id
        const itemsByOrderId = orderItems.reduce((acc, item) => {
            const orderId = item.order_id.toString();
            if (!acc[orderId]) {
                acc[orderId] = [];
            }
            acc[orderId].push(item);
            return acc;
        }, {});

        // Attach items to their respective orders
        const ordersWithItems = orders.map(order => {
            const orderId = order._id.toString();
            return {
                ...order,
                items: itemsByOrderId[orderId] || []
            };
        });

        // Get total count for pagination
        const totalCount = await Order.countDocuments(query);

        console.log("Orders with items prepared:", ordersWithItems.length);

        // Calculate summary statistics
        const summary = {
            total_orders: totalCount,
            total_amount: orders.reduce((sum, order) => sum + (order.final_total || 0), 0),
            status_counts: orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {})
        };

        res.json({
            success: true,
            message: 'Orders retrieved successfully',
            data: ordersWithItems,
            summary: summary,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                pages: Math.ceil(totalCount / parseInt(limit)),
                limit: parseInt(limit),
                has_next: (parseInt(page) * parseInt(limit)) < totalCount,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error in getUserOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//12. update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status } = req.body;

        const order = await Order.findById(order_id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = status;
        await order.save(); // Pre-save hook will update timestamps
        await updateOrderStatusHelper(order_id)

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
}

async function updateOrderStatusHelper(orderId) {
    const items = await OrderItem.find({ order_id: orderId });

    const statuses = items.map(i => i.status);

    if (statuses.every(s => s === 'delivered')) {
        await Order.findByIdAndUpdate(orderId, { status: 'delivered' });
    }
    else if (statuses.some(s => s === 'shipped')) {
        await Order.findByIdAndUpdate(orderId, { status: 'shipped' });
    }
    else if (statuses.every(s => s === 'cancelled')) {
        await Order.findByIdAndUpdate(orderId, { status: 'cancelled' });
    }
}

//13. ASSIGN DELIVERY BOY
const assignDeliveryBoy = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { delivery_boy_id } = req.body;

        const time_slot = req.body.time_slot || new Date().toISOString().slice(11, 16);
        const date = req.body.date || new Date().toISOString().slice(0, 10);

        const order = await Order.findById(order_id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // ✅ Update only required fields
        order.delivery_info.boy_id = delivery_boy_id;
        order.delivery_info.assigned_at = new Date();
        order.delivery_info.time_slot = time_slot;
        order.delivery_info.date = new Date(date); // better to store as Date
        order.delivery_info.otp = Math.floor(1000 + Math.random() * 9000);

        order.status = OrderStatus.ASSIGNED;
      const orderItem = await OrderItem.findOne({ order_id: order_id });
         orderItem.status = ActiveStatus.ASSIGNED
         orderItem.status_history.push({
            status: ActiveStatus.ASSIGNED,
            timestamp: new Date()})

        await order.save();
        await orderItem.save();

        res.json({
            success: true,
            message: 'Delivery boy assigned successfully',
            data: {
                id: order._id,
                boy_id: order.delivery_info.boy_id,
                otp: order.delivery_info.otp
            }
        });

    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'Failed to assign delivery boy',
            error: error.message
        });
    }
};

//14. verify delivery otp
const verifyDeliveryOTP = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { otp } = req.body;
        const delivery_boy_id = req.user.id;

        const order = await Order.findOne({
            _id: order_id,
            'delivery_info.boy_id': delivery_boy_id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or unauthorized'
            });
        }

        if (order.delivery_info.otp !== parseInt(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        order.delivery_info.otp_verified = true;
        order.status = 'delivered';
        await order.save();

        // Update all items to delivered
        await OrderItem.updateMany(
            { order_id },
            {
                active_status: 'delivered',
                $push: {
                    status_history: {
                        status: 'delivered',
                        timestamp: new Date()
                    }
                }
            }
        );

        res.json({
            success: true,
            message: 'Order delivered successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
}

//15. cancel orders
const cancelOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { reason } = req.body;
        const user_id = req.user.id;

        const order = await Order.findOne({
            _id: order_id,
            user_id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (['shipped', 'delivered'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel order in current status'
            });
        }

        order.status = 'cancelled';
        order.cancellation = {
            reason,
            initiated_by: 'customer',
            user_id,
            refund_status: order.payment.status === 'paid' ? 'pending' : 'processed',
            refund_amount: order.payment.status === 'paid' ? order.final_total : 0
        };

        await order.save();

        // Update all items
        await OrderItem.updateMany(
            { order_id },
            {
                active_status: 'cancelled',
                $push: {
                    status_history: {
                        status: 'cancelled',
                        timestamp: new Date()
                    }
                }
            }
        );

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
}

//16. get seller orders
const getSellerOrders = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { page = 1, limit = 10, status } = req.query; // Added status filter

    const query = { seller_id: vendorId };
    
    // Optional status filter
    if (status) {
      query.status = status;
    }

    const items = await OrderItem.find(query)
      .populate('order_id')
      .populate('product_variant_id', 'images')
      .populate('user_id', 'username email mobile')
      .populate({
        path: 'order_id',
        populate: {
          path: 'delivery_info.boy_id',
          populate: {
            path: 'user_id',
            select: 'username email mobile'
          }
        }
      })
      .sort({ date_added: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await OrderItem.countDocuments(query);

    res.json({
      success: true,
      data: items,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller orders',
      error: error.message
    });
  }
};

//17. get delivery boy orders
// const getDeliveryBoyOrders = async (req, res) => {
//     try {
//         const delivery_boy_id = req.user.id;
//         console.log("Delivery Boy ID:", delivery_boy_id);
        
//         const { status } = req.query;

//         // ✅ Get orders from Order collection (where boy_id is in delivery_info)
//         const orderQuery = { 
//             'delivery_info.boy_id': delivery_boy_id 
//         };
        
//         if (status) {
//             orderQuery.status = status;
//         }

//         const orders = await Order.find(orderQuery)
//             .populate('user_id', 'username email mobile')
//             .populate('address_id')
//             .sort({ 'delivery_info.assigned_at': -1 });

//         // ✅ Get order items from OrderItem collection
//         const orderIds = orders.map(order => order._id);
        
//         const orderItemsQuery = { 
//             order_id: { $in: orderIds },
//             delivery_boy_id: delivery_boy_id
//         };
        
//         if (status) {
//             // Map order status to order item active_status if needed
//             // This depends on your business logic
//         }

//         const orderItems = await OrderItem.find(orderItemsQuery)
//             .populate({
//                 path: 'product_id',
//                 model: 'Product',
//                 select: 'name images'
//             })
//             .populate({
//                 path: 'product_variant_id',
//                 model: 'Product',
//                 select: 'variant_name variant_price variant_specialPrice variant_stockStatus variant_isActive '
//             })
//             .populate({
//                 path: 'seller_id',
//                 model: 'User',
//                 select: 'username email mobile '
//             });

//         // Group items by order_id
//         const itemsByOrder = {};
//         orderItems.forEach(item => {
//             const orderId = item.order_id.toString();
//             if (!itemsByOrder[orderId]) {
//                 itemsByOrder[orderId] = [];
//             }
//             itemsByOrder[orderId].push(item.toObject());
//         });

//         // Combine orders with their items
//         const ordersWithItems = orders.map(order => ({
//             ...order.toObject(),
//             items: itemsByOrder[order._id.toString()] || []
//         }));

//         res.json({
//             success: true,
//             count: ordersWithItems.length,
//             data: ordersWithItems
//         });

//     } catch (error) {
//         console.error('Error in getDeliveryBoyOrders:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch delivery orders',
//             error: error.message
//         });
//     }
// };

const getDeliveryBoyOrders = async (req, res) => {
    try {
        const delivery_boy_id = req.user._id;
        console.log("Delivery Boy ID:", delivery_boy_id);

        const findDeliveryBoy = await DeliveryBoy({user_id : delivery_boy_id})
        console.log("delivery boy", findDeliveryBoy)
        
        const { status } = req.query;

        // First, find all orders assigned to this delivery boy
        const orderQuery = { 
            'delivery_info.boy_id': findDeliveryBoy._id  // Look in the Order document
        };
        console.log("orderQuery",orderQuery)
        
        // If status filter is provided, add it to the order query
        if (status) {
            orderQuery.status = status; // Filter by order.status (e.g., 'assigned', 'delivered')
        }

        // Find orders first, then populate their order items
        const orders = await Order.find(orderQuery)
            .populate({
                path: 'user_id',
                model: 'User',
                select: 'username email mobile'
            })
            .populate({
                path: 'address_id',
                model: 'Address'
            })
            .sort({ 'delivery_info.assigned_at': -1 });

        // For each order, get its order items
        const formattedOrders = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();
            
            // Find all order items for this order
            const orderItems = await OrderItem.find({ order_id: order._id })
                .populate({
                    path: 'product_id',
                    model: 'Product',
                    select: 'name images description'
                })
                .populate({
                    path: 'product_variant_id',
                    model: 'Product',
                    select: 'variant_name variant_price variant_specialPrice variant_stockStatus variant_isActive'
                })
                .populate({
                    path: 'seller_id',
                    model: 'User',
                    select: 'username email vendor_details.store_name'
                });
                console.log("orderItems",orderItems )

            return {
                ...orderObj,
                delivery_status: orderObj.status,
                delivery_otp: orderObj.delivery_info?.otp,
                items: orderItems
            };
        }));

        res.json({
            success: true,
            count: formattedOrders.length,
            data: formattedOrders
        });

    } catch (error) {
        console.error('Error in getDeliveryBoyOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery orders',
            error: error.message
        });
    }
};

//18. process refund
const processRefund = async (req, res) => {
    try {
        const { order_id } = req.params;

        const order = await Order.findById(order_id);

        if (!order || !order.cancellation) {
            return res.status(404).json({
                success: false,
                message: 'Order or cancellation not found'
            });
        }

        // Process refund logic here (integrate with payment gateway)
        order.cancellation.refund_status = 'processed';
        order.payment.status = 'refunded';

        await order.save();

        res.json({
            success: true,
            message: 'Refund processed successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
}

const getOrderAnalytics = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const dateFilter = {};
        if (start_date && end_date) {
            dateFilter.createdAt = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }

        const analytics = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$final_total' }
                }
            }
        ]);

        const totalOrders = await Order.countDocuments(dateFilter);
        const totalRevenue = await Order.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$final_total' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                statusBreakdown: analytics
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
}

// Helper function to update parent order status based on order items
const updateParentOrderStatus = async (orderId, session) => {
    try {
        console.log(`Updating parent order status for order: ${orderId}`);

        // Get all order items for this order
        const orderItems = await OrderItem.find({ order_id: orderId }).session(session);

        if (!orderItems || orderItems.length === 0) {
            console.log('No order items found for this order');
            return;
        }

        // Get unique statuses of all order items
        const allStatuses = orderItems.map(item => item.active_status);
        const uniqueStatuses = [...new Set(allStatuses)];

        console.log(`Order items statuses: ${allStatuses.join(', ')}`);
        console.log(`Unique statuses: ${uniqueStatuses.join(', ')}`);

        // Determine parent order status based on all items
        let parentStatus;
        const itemsCount = orderItems.length;

        // Check for specific status scenarios based on your OrderStatus enum
        if (uniqueStatuses.includes('cancelled') && uniqueStatuses.length === 1) {
            // All items are cancelled
            parentStatus = 'cancelled';
        }
        else if (uniqueStatuses.includes('returned') && uniqueStatuses.length === 1) {
            // All items are returned
            parentStatus = 'returned';
        }
        else if (uniqueStatuses.includes('delivered') && uniqueStatuses.every(status =>
            status === 'delivered' || status === 'returned' || status === 'cancelled')) {
            // All items are either delivered, returned, or cancelled
            const deliveredCount = allStatuses.filter(status => status === 'delivered').length;
            const returnedCount = allStatuses.filter(status => status === 'returned').length;
            const cancelledCount = allStatuses.filter(status => status === 'cancelled').length;

            if (deliveredCount === itemsCount) {
                parentStatus = 'delivered';
            } else if (deliveredCount > 0) {
                parentStatus = 'shipped'; // Partially delivered = still shipped
            }
        }
        else if (uniqueStatuses.includes('shipped')) {
            // At least one item is shipped
            parentStatus = 'shipped';
        }
        else if (uniqueStatuses.includes('processed')) {
            // At least one item is processed
            parentStatus = 'processed';
        }
        else if (uniqueStatuses.includes('placed')) {
            // Items are received by sellers
            parentStatus = 'placed';
        }
        else if (uniqueStatuses.includes('awaiting')) {
            // Items are still awaiting processing
            parentStatus = 'placed'; // Default status for new orders
        }
        else {
            // Default to the most advanced status using your hierarchy
            parentStatus = determineMostAdvancedStatusForOrder(uniqueStatuses);
        }

        console.log(`Determined parent order status: ${parentStatus}`);

        // Update the parent order
        const order = await Order.findById(orderId).session(session);

        if (order) {
            const previousStatus = order.status;

            if (previousStatus !== parentStatus) {
                // Update status and timestamp
                order.status = parentStatus;

                // Update status timestamps if they exist
                if (order.status_timestamps) {
                    order.status_timestamps[parentStatus] = new Date();
                }

                // Auto-set delivered_at when status changes to delivered
                if (parentStatus === 'delivered') {
                    order.delivery_info.delivered_at = new Date();
                    order.payment.status = 'paid';
                }

                // Auto-set paid_at for delivered orders
                if (parentStatus === 'delivered' && !order.payment.paid_at) {
                    order.payment.paid_at = new Date();
                }

                await order.save({ session });

                console.log(`Parent order ${orderId} status updated from ${previousStatus} to ${parentStatus}`);

                // Send notification for order status change
                // await sendOrderStatusNotification(order.user_id, parentStatus, order);
            } else {
                console.log(`Parent order status unchanged: ${parentStatus}`);
            }
        } else {
            console.log(`Parent order not found: ${orderId}`);
        }

    } catch (error) {
        console.error('Error updating parent order status:', error);
        throw error; // Re-throw to be caught by parent transaction
    }
};

// Helper function to determine the most advanced status for ORDER (not item)
const determineMostAdvancedStatusForOrder = (statuses) => {
    // Your Order status hierarchy (from least to most advanced)
    const orderStatusHierarchy = [
        'cancelled',
        'returned',
        'placed',
        'processed',
        'shipped',
        'delivered'
    ];

    // Find the highest status in hierarchy
    let highestStatus = 'received'; // Default
    let highestIndex = -1;

    statuses.forEach(status => {
        // Map item status to order status if needed
        const mappedStatus = mapItemStatusToOrderStatus(status);
        const index = orderStatusHierarchy.indexOf(mappedStatus);
        if (index > highestIndex) {
            highestIndex = index;
            highestStatus = mappedStatus;
        }
    });

    return highestStatus;
};

// Helper to map OrderItem status to Order status
const mapItemStatusToOrderStatus = (itemStatus) => {
    const mapping = {
        'awaiting': 'received',
        'placed': 'placed',
        'processed': 'processed',
        'shipped': 'shipped',
        'delivered': 'delivered',
        'cancelled': 'cancelled',
        'returned': 'returned'
    };

    return mapping[itemStatus] || 'placed';
};

const getOrderItemsBySeller = async (req, res) => {
    try {
        const { seller_id } = req.params;
        const {
            active_status,
            start_date,
            end_date,
            page = 1,
            limit = 20
        } = req.query;

        // Validate seller ID
        if (!mongoose.Types.ObjectId.isValid(seller_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Seller ID format'
            });
        }

        // Build query
        const query = { seller_id };

        if (active_status) {
            query.active_status = active_status;
        }

        // Date range filter
        if (start_date || end_date) {
            query.date_added = {};
            if (start_date) {
                query.date_added.$gte = new Date(start_date);
            }
            if (end_date) {
                query.date_added.$lte = new Date(end_date);
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get order items with pagination
        const orderItems = await OrderItem.find(query)
            .populate('order_id', 'order_number status payment')
            .populate('user_id', 'username mobile email')
            .populate('product_variant_id', 'sku')
            .sort({ date_added: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count
        const totalItems = await OrderItem.countDocuments(query);

        // Calculate seller statistics
        const stats = {
            total_items: totalItems,
            total_revenue: orderItems.reduce((sum, item) => sum + item.sub_total, 0),
            total_commission: orderItems.reduce((sum, item) => sum + (item.seller_commission_amount || 0), 0),
            total_quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
            status_breakdown: orderItems.reduce((acc, item) => {
                acc[item.active_status] = (acc[item.active_status] || 0) + 1;
                return acc;
            }, {})
        };

        res.status(200).json({
            success: true,
            message: 'Order items retrieved successfully',
            data: {
                order_items: orderItems,
                statistics: stats,
                pagination: {
                    current_page: parseInt(page),
                    items_per_page: parseInt(limit),
                    total_pages: Math.ceil(totalItems / parseInt(limit)),
                    total_items: totalItems
                }
            }
        });

    } catch (error) {
        console.error('Error fetching seller order items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch seller order items'
        });
    }
};

// Modified version for your OrderStatus enum
// const isValidItemStatusTransition = (currentStatus, newStatus) => {
//     const validTransitions = {
//         'awaiting': ['received', 'cancelled'],
//         'received': ['processed', 'cancelled'],
//         'processed': ['shipped', 'cancelled'],
//         'shipped': ['delivered', 'cancelled'],
//         'delivered': ['returned'],
//         'cancelled': [], // Once cancelled, cannot change
//         'returned': []   // Once returned, cannot change
//     };

//     return validTransitions[currentStatus]?.includes(newStatus) || false;
// };

// Enhanced version with better status calculation logic
const updateParentOrderStatusEnhanced = async (orderId, session) => {
    try {
        const orderItems = await OrderItem.find({ order_id: orderId }).session(session);

        if (!orderItems.length) return;

        const order = await Order.findById(orderId).session(session);
        if (!order) return;

        const statusCounts = {};
        orderItems.forEach(item => {
            statusCounts[item.active_status] = (statusCounts[item.active_status] || 0) + 1;
        });

        const totalItems = orderItems.length;
        console.log('Status counts:', statusCounts, 'Total items:', totalItems);

        // Your business logic for order status
        let newOrderStatus = order.status; // Default to current

        // If all items are cancelled
        if (statusCounts['cancelled'] === totalItems) {
            newOrderStatus = 'cancelled';
        }
        // If all items are returned
        else if (statusCounts['returned'] === totalItems) {
            newOrderStatus = 'returned';
        }
        // If all items are delivered
        else if (statusCounts['delivered'] === totalItems) {
            newOrderStatus = 'delivered';

            // Auto-update payment status for delivered orders
            order.payment.status = 'paid';
            if (!order.payment.paid_at) {
                order.payment.paid_at = new Date();
            }
        }
        // If at least one item is delivered (but not all)
        else if (statusCounts['delivered'] > 0) {
            // If all remaining items are either cancelled or returned
            const remainingItems = totalItems - (statusCounts['delivered'] || 0);
            const cancelledReturnedCount = (statusCounts['cancelled'] || 0) + (statusCounts['returned'] || 0);

            if (remainingItems === cancelledReturnedCount) {
                newOrderStatus = 'delivered';
            } else {
                newOrderStatus = 'shipped';
            }
        }
        // If at least one item is shipped
        else if (statusCounts['shipped'] > 0) {
            newOrderStatus = 'shipped';
        }
        // If at least one item is processed
        else if (statusCounts['processed'] > 0) {
            newOrderStatus = 'processed';
        }
        // If at least one item is received
        else if (statusCounts['placed'] > 0) {
            newOrderStatus = 'placed';
        }
        // If all items are awaiting
        else if (statusCounts['awaiting'] === totalItems) {
            newOrderStatus = 'placed';
        }

        // Only update if status changed
        if (order.status !== newOrderStatus) {
            const previousStatus = order.status;
            order.status = newOrderStatus;

            // Update status timestamp
            if (order.status_timestamps && typeof order.status_timestamps === 'object') {
                order.status_timestamps[newOrderStatus] = new Date();
            }

            // Special handling for delivered status
            if (newOrderStatus === 'delivered') {
                order.delivery_info.delivered_at = new Date();
            }

            await order.save({ session });

            console.log(`Order ${order.order_number} status updated: ${previousStatus} → ${newOrderStatus}`);

            // Log status summary for debugging
            console.log('Order Status Summary:', {
                orderId: order._id,
                orderNumber: order.order_number,
                previousStatus,
                newStatus: newOrderStatus,
                itemStatusBreakdown: statusCounts,
                totalItems,
                timestamp: new Date()
            });

            // Send notification
            // await sendOrderStatusNotification(order.user_id, newOrderStatus, order);
        }

    } catch (error) {
        console.error('Error in enhanced parent order update:', error);
        throw error;
    }
};

// Helper function to check if order item can be cancelled
const canCancelOrderItem = (orderItem) => {
    const cancelableStatuses = ['awaiting', 'received'];
    return cancelableStatuses.includes(orderItem.active_status);
};

// Helper function to calculate refund amount
const calculateRefundAmount = (orderItem) => {
    // Calculate based on sub_total (price * quantity)
    let refundAmount = orderItem.sub_total;

    // If there were any discounts applied proportionally
    if (orderItem.discount > 0) {
        // Apply discount proportionally
        refundAmount = orderItem.sub_total - orderItem.discount;
    }

    // Deduct any commission that might have been charged
    if (orderItem.admin_commission_amount > 0) {
        refundAmount -= orderItem.admin_commission_amount;
    }

    // Ensure refund amount is not negative
    return Math.max(0, refundAmount);
};

const updateOrderTotals = async (orderId, session) => {
    try {
        console.log(`Updating totals for order: ${orderId}`);

        // Get all order items for this order
        const orderItems = await OrderItem.find({ order_id: orderId }).session(session);

        if (!orderItems || orderItems.length === 0) {
            console.log('No order items found for this order');
            return;
        }

        // Get the parent order
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            console.log('Order not found');
            return;
        }

        // Filter out cancelled items for total calculation
        const activeOrderItems = orderItems.filter(item =>
            item.active_status !== 'cancelled' && item.active_status !== 'returned'
        );

        // Calculate new totals
        let newTotal = 0;
        let newDiscount = 0;
        let newTaxAmount = 0;
        let newSubTotal = 0;

        activeOrderItems.forEach(item => {
            newSubTotal += item.sub_total || 0;
            newDiscount += item.discount || 0;
            newTaxAmount += item.tax_amount || 0;
        });

        newTotal = newSubTotal - newDiscount + newTaxAmount;

        // Add delivery charge if applicable
        let deliveryCharge = order.delivery_charge || 0;

        // If all items are cancelled, remove delivery charge
        if (activeOrderItems.length === 0) {
            deliveryCharge = 0;
        }

        // Calculate final total with delivery
        const newFinalTotal = newTotal + deliveryCharge;

        // Update order with new totals
        order.total = newTotal;
        order.discount = newDiscount;
        order.tax_amount = newTaxAmount;
        order.total_payable = newFinalTotal;
        order.final_total = newFinalTotal;
        order.delivery_charge = deliveryCharge;

        // Update the promo details if all items are cancelled
        if (activeOrderItems.length === 0 && order.promo_details && order.promo_details.code) {
            order.promo_details.code = null;
            order.promo_details.discount = 0;
        }

        // Log the changes for debugging
        console.log('Order totals updated:', {
            orderId: order._id,
            orderNumber: order.order_number,
            oldTotal: order.total,
            newTotal: newTotal,
            oldDiscount: order.discount,
            newDiscount: newDiscount,
            oldTax: order.tax_amount,
            newTax: newTaxAmount,
            oldFinalTotal: order.final_total,
            newFinalTotal: newFinalTotal,
            activeItems: activeOrderItems.length,
            totalItems: orderItems.length,
            deliveryCharge: deliveryCharge
        });

        await order.save({ session });

        console.log(`Order ${order.order_number} totals updated successfully`);

        // If order total becomes 0 after cancellation, update payment status
        if (newFinalTotal === 0 && order.payment.status !== 'refunded') {
            order.payment.status = 'refunded';
            await order.save({ session });
            console.log(`Payment status updated to refunded for order ${order.order_number}`);
        }

    } catch (error) {
        console.error('Error updating order totals:', error);
        throw error;
    }
};

// Process refund to user
// const processRefund = async (order, orderItem, refundAmount, refundToWallet, session) => {
//     try {
//         if (refundAmount <= 0) {
//             console.log('No refund amount specified');
//             return false;
//         }

//         // Check if order was paid
//         if (order.payment.status !== 'paid' && order.payment.status !== 'partially_refunded') {
//             console.log('Order not paid, no refund needed');
//             return true; // No actual refund needed
//         }

//         // Process refund based on payment method
//         if (refundToWallet) {
//             // Refund to user's wallet
//             await refundToUserWallet(order.user_id, refundAmount, order, orderItem, session);
//         } else {
//             // Refund to original payment method
//             await refundToOriginalPayment(order, refundAmount, orderItem, session);
//         }

//         // Update payment status
//         if (refundAmount >= order.total_payable) {
//             order.payment.status = 'refunded';
//         } else {
//             order.payment.status = 'partially_refunded';
//         }

//         // Add refund transaction record
//         await createRefundTransaction(order, orderItem, refundAmount, session);

//         console.log(`Refund processed: ${refundAmount} for order item ${orderItem._id}`);
//         return true;

//     } catch (error) {
//         console.error('Error processing refund:', error);

//         // Mark refund as failed
//         order.cancellation.refund_status = 'failed';
//         order.cancellation.refund_error = error.message;

//         return false;
//     }
// };

// Helper function to refund to user's wallet
const refundToUserWallet = async (userId, amount, order, orderItem, session) => {
    try {
        // Find user
        const user = await User.findById(userId).session(session);
        if (!user) {
            throw new Error('User not found');
        }

        // Create wallet transaction
        const walletTransaction = await WalletTransaction.create([{
            user_id: userId,
            order_id: order._id,
            order_item_id: orderItem._id,
            type: 'refund',
            amount: amount,
            balance_before: user.wallet_balance || 0,
            balance_after: (user.wallet_balance || 0) + amount,
            description: `Refund for cancelled order item: ${orderItem.product_name}`,
            status: 'completed'
        }], { session });

        // Update user's wallet balance
        user.wallet_balance = (user.wallet_balance || 0) + amount;
        await user.save({ session });

        console.log(`Refunded ${amount} to user ${userId}'s wallet`);
        return walletTransaction[0];

    } catch (error) {
        console.error('Error refunding to wallet:', error);
        throw error;
    }
};

// Helper function to refund to original payment method
const refundToOriginalPayment = async (order, amount, orderItem, session) => {
    try {
        // Implement based on your payment gateway
        switch (order.payment.method) {
            case 'Razorpay':
                // Implement Razorpay refund
                console.log(`Processing Razorpay refund for order ${order.order_number}`);
                // const razorpayResponse = await razorpay.payments.refund(
                //     order.payment.transaction_id,
                //     { amount: amount * 100 } // Convert to paise
                // );
                // return razorpayResponse;
                break;

            case 'Stripe':
                // Implement Stripe refund
                console.log(`Processing Stripe refund for order ${order.order_number}`);
                // const stripeResponse = await stripe.refunds.create({
                //     payment_intent: order.payment.transaction_id,
                //     amount: amount * 100 // Convert to cents
                // });
                // return stripeResponse;
                break;

            case 'PayPal':
                // Implement PayPal refund
                console.log(`Processing PayPal refund for order ${order.order_number}`);
                break;

            case 'COD':
                // For COD, typically refund to wallet or bank transfer
                console.log(`COD order - refunding to wallet`);
                await refundToUserWallet(order.user_id, amount, order, orderItem, session);
                break;

            default:
                console.log(`Unsupported payment method: ${order.payment.method}`);
                throw new Error(`Refund not supported for ${order.payment.method}`);
        }

        return { success: true };

    } catch (error) {
        console.error('Error refunding to original payment:', error);
        throw error;
    }
};

// Create refund transaction record
const createRefundTransaction = async (order, orderItem, amount, session) => {
    try {
        const refundTransaction = await RefundTransaction.create([{
            order_id: order._id,
            order_item_id: orderItem._id,
            user_id: order.user_id,
            amount: amount,
            payment_method: order.payment.method,
            status: 'completed',
            transaction_id: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            notes: `Refund for cancelled order item: ${orderItem.product_name}`,
            refunded_by: order.cancellation?.initiated_by || 'system'
        }], { session });

        return refundTransaction[0];

    } catch (error) {
        console.error('Error creating refund transaction:', error);
        throw error;
    }
};

// Send cancellation notification
const sendCancellationNotification = async (
    userId,
    sellerId,
    order,
    orderItem,
    reason,
    initiatedBy,
    refundAmount,
    refundProcessed
) => {
    try {
        // Send to customer
        await sendNotificationToUser(
            userId,
            'order_item_cancelled',
            {
                order_number: order.order_number,
                product_name: orderItem.product_name,
                reason: reason,
                refund_amount: refundAmount,
                refund_status: refundProcessed ? 'Processed' : 'Pending',
                initiated_by: initiatedBy
            }
        );

        // Send to seller
        await sendNotificationToUser(
            sellerId,
            'order_item_cancelled_seller',
            {
                order_number: order.order_number,
                product_name: orderItem.product_name,
                reason: reason,
                initiated_by: initiatedBy,
                item_value: orderItem.sub_total
            }
        );

        // Send to admin if needed
        if (initiatedBy !== 'admin') {
            await sendNotificationToAdmin(
                'order_item_cancelled_admin',
                {
                    order_number: order.order_number,
                    product_name: orderItem.product_name,
                    reason: reason,
                    initiated_by: initiatedBy,
                    customer_id: userId,
                    seller_id: sellerId,
                    refund_amount: refundAmount
                }
            );
        }

        console.log(`Cancellation notifications sent for order item ${orderItem._id}`);

    } catch (error) {
        console.error('Error sending cancellation notifications:', error);
        // Don't throw - notification failure shouldn't break the flow
    }
};

// Helper notification functions (placeholder implementations)
const sendNotificationToUser = async (userId, type, data) => {
    // Implement your notification logic (email, push, SMS)
    console.log(`Notification to user ${userId}: ${type}`, data);
};

const sendNotificationToAdmin = async (type, data) => {
    // Implement admin notification logic
    console.log(`Admin notification: ${type}`, data);
};



// ================= HELPER FUNCTIONS =================

// Check if item status transition is valid
function isValidItemStatusTransition(currentStatus, newStatus) {
    const transitions = {
        'awaiting': ['placed', 'cancelled'],
        'placed': ['processed', 'cancelled'],
        'processed': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': ['returned'],
        'cancelled': [],
        'returned': []
    };

    return transitions[currentStatus]
}

// Add a background email sending function
const sendOrderEmailInBackground = async (order, user, items) => {
    try {
        const emailResult = await emailService.sendOrderConfirmationEmail(
            order,
            user,
            items
        );

        console.log('Order email result:', emailResult);

        // if (emailResult.success) {
        //     // Update order with email sent status
        //     await Order.findByIdAndUpdate(order._id, {
        //         $set: {
        //             confirmation_email_sent: true,
        //             confirmation_email_sent_at: new Date()
        //         }
        //     });
        // }
    } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the order creation
    }

};




module.exports = {
    getSellerPerformance,
    cancelOrderItem,
    markCommissionAsCredited,
    updateOrderItem,
    updateOrderItemStatus,
    getOrderItemsByOrder,
    getOrderItemById,
    getAllOrderItems,
    bulkCreateOrderItems,
    createOrderItem,
    getUserOrders,
    getOrderAnalytics,
    processRefund,
    getDeliveryBoyOrders,
    getSellerOrders,
    cancelOrder,
    updateOrderStatus,
    assignDeliveryBoy,
    verifyDeliveryOTP
}