// const nodemailer = require('nodemailer');
// const { GOOGLE_SMTP_HOST, GOOGLE_SMTP_PORT, GOOGLE_SMTP_USER, GOOGLE_SMTP_PASS, GOOGLE_FROM_NAME } = require('../env-variables');

// const generateOTP = () => {
//     return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
// }

// // const sendEmail = async (options) => {
// //     try{
// //     const transporter = nodemailer.createTransport({
// //         host: GOOGLE_SMTP_HOST,
// //         port: GOOGLE_SMTP_PORT,
// //         secure: GOOGLE_SMTP_PORT === 465,
// //         auth: {
// //             user: GOOGLE_SMTP_USER,
// //             pass: GOOGLE_SMTP_PASS,
// //         },
// //         tls: {
// //                 rejectUnauthorized: false
// //         }
// //     });

// //     const message = {
// //         from: `"${GOOGLE_FROM_NAME}" <${GOOGLE_SMTP_USER}>`,
// //         to: options.email,
// //         subject: options.subject,
// //         text: options.message,
// //         html: options.html || options.message, // Add HTML support
// //     };

// //     const info = await transporter.sendMail(message);
// //     console.log('Email sent: %s', info.messageId);
// //     return info
// // }catch(error){
// //      console.error('Email sending error:', error);
// //         throw error;
// // }
// // };

// class EmailService {
//     constructor() {
//         this.transporter = nodemailer.createTransport({
//             host: GOOGLE_SMTP_HOST,
//             port: GOOGLE_SMTP_PORT,
//             auth: {
//                 user: GOOGLE_SMTP_USER,
//                 pass: GOOGLE_SMTP_PASS,
//             },
//             tls: {
//                 rejectUnauthorized: false
//             }
//         });
//     }

//     async sendApprovalEmail(user) {
//         const mailOptions = {
//             from: `"${GOOGLE_FROM_NAME}" <${GOOGLE_SMTP_USER}>`,
//             to: user.email,
//             subject: 'Account Approved - SevFast',
//             html: this.getApprovalEmailTemplate(user)
//         };
//         try {
//             const info = await this.transporter.sendMail(mailOptions);
//             console.log(`Approval email sent: ${user.email}: ${info.messageId}`);
//             return { success: true, messageId: info.messageId };
//         } catch (error) {
//             console.error(`Failed to send approval email to ${user.email}:`, error);
//             return { success: false, error: error.message };
//         }

//     }

//     getApprovalEmailTemplate(user) {
//         return `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>Account Approved</title>
//         </head>
//         <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
//             <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
//                 <h1 style="margin: 0;">🎉 Account Approved!</h1>
//                 <p style="margin: 10px 0 0; font-size: 18px;">Welcome to SevaFast</p>
//             </div>
            
//             <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
//                 <h2>Hello ${user.name || user.username || 'User'},</h2>
                
//                 <p>Great news! Your account has been <strong>approved</strong> and is now active.</p>
                
//                 <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
//                     <p><strong>Next Steps:</strong></p>
//                     <ol>
//                         <li>Visit our website with the Go to Login button Below</li>
//                         <li>Login with your credentials</li>
//                         <li>Start using our services</li>
//                     </ol>
//                 </div>
                
//                 <div style="text-align: center; margin: 30px 0;">
//                     <a href="${process.env.APP_URL}/login" 
//                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
//                               color: white; 
//                               padding: 14px 35px; 
//                               text-decoration: none; 
//                               border-radius: 5px; 
//                               font-weight: bold; 
//                               display: inline-block;">
//                         Go to Login
//                     </a>
//                 </div>
                
//                 <p>If you have any questions, our support team is here to help.</p>
                
//                 <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
//                 <div style="text-align: center; color: #666; font-size: 14px;">
//                     <p>Best regards,<br>
//                     <strong>SevaFast Team</strong></p>
//                 </div>
//             </div>
//         </body>
//         </html>`;
//     }

//     async sendOrderEmail(user, orderData, items) {
//         const mailOptions = {
//             from: `"${GOOGLE_FROM_NAME}" <${GOOGLE_SMTP_USER}>`,
//             to: user.email,
//             subject: 'Order Confirmation - SevaFast',
//             html: this.getorderConfirmationTemplate(orderData, user, items)
//         };
//         try {
//             const info = await this.transporter.sendMail(mailOptions);
//             console.log(`Order confirmation email sent: ${user.email}: ${info.messageId}`);
//             return { success: true, messageId: info.messageId };
//         } catch (error) {
//             console.error(`Failed to send order confirmation email to ${user.email}:`, error);
//             return { success: false, error: error.message };
//         }

//     }

//     async sendOrderConfirmationEmail(orderData, user, items) {
//         const htmlTemplate = this.getorderConfirmationTemplate(orderData, user, items);
//         const textMessage = this.getOrderConfirmationText(orderData, user, items);

//         return await this.sendOrderEmail({
//             email: user.email,
//             subject: 'Order Confirmation - SevaFast',
//             message: textMessage,
//             html: htmlTemplate
//         })
//     }

//     getorderConfirmationTemplate(orderData, user, items) {
//         console.log(" Generating order confirmation template for order: ", orderData);
//         const appUrl = process.env.APP_URL || 'http://localhost:3000';
//         const userName = user.name || user.username || 'User';
//         const OrderDate = new Date(orderData.createdAt).toLocaleDateString('en-IN', {
//             weekday: 'long',
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit'
//         });
//         let itemsHtml = '';
//         items.forEach((item, index) => {
//             itemsHtml += `
//             <tr><tr style="border-bottom: 1px solid #eee;">
//             <td style="padding: 10px; text-align: center;">${index + 1}</td>
//             <td style="padding: 10px;">${item.product_name} ${item.variant_name ? `- ${item.variant_name}` : ''}</td>
//             <td style="padding: 10px; text-align: center;">${item.quantity}</td>
//             <td style="padding: 10px; text-align: right;">₹${item.price.toFixed(2)}</td>
//             <td style="padding: 10px; text-align: right;">₹${item.sub_total.toFixed(2)}</td>
//         </tr>`;
//         });

//         const subTotal = items.reduce((sum, item) => sum + item.sub_total, 0);
//         const deliveryCharge = orderData.delivery_charge || 0;
//         const discount = orderData.discount || 0;
//         const taxAmount = orderData.tax_amount || 0;
//         const totalPayable = orderData.total_payable || orderData.final_total || subTotal + deliveryCharge + taxAmount - discount;

//         return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Order Confirmation</title>
//         <style>
//             @media only screen and (max-width: 600px) {
//                 .container { width: 100% !important; }
//                 .table-container { overflow-x: auto; }
//                 table { width: 100%; }
//             }
//         </style>
//     </head>
//     <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
//         <div class="container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
//             <!-- Header -->
//             <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
//                 <h1 style="margin: 0; font-size: 28px;">📦 Order Confirmed!</h1>
//                 <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Thank you for your purchase</p>
//             </div>
            
//             <!-- Order Summary -->
//             <div style="padding: 30px;">
//                 <h2 style="color: #333; margin-top: 0;">Hello ${userName},</h2>
//                 <p style="font-size: 16px; margin-bottom: 20px;">
//                     Your order <strong>#${orderData.order_number}</strong> has been successfully placed on ${OrderDate}.
//                 </p>
                
//                 <!-- Order Details -->
//                 <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
//                     <h3 style="color: #667eea; margin-top: 0;">Order Details</h3>
//                     <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
//                         <div>
//                             <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderData.order_number}</p>
//                             <p style="margin: 5px 0;"><strong>Date:</strong> ${OrderDate}</p>
//                             <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${orderData.payment?.method || 'Cash on Delivery'}</p>
//                         </div>
//                         <div>
//                             <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: #28a745;">${orderData.payment?.status || 'Pending'}</span></p>
//                             <p style="margin: 5px 0;"><strong>Order Status:</strong> <span style="color: #ff9800;">${orderData.status || 'Received'}</span></p>
//                             <p style="margin: 5px 0;"><strong>Delivery Charge:</strong> ₹${deliveryCharge.toFixed(2)}</p>
//                         </div>
//                     </div>
//                 </div>
                
//                 <!-- Items Table -->
//                 <div style="margin-bottom: 30px;">
//                     <h3 style="color: #667eea; margin-bottom: 15px;">Items Ordered</h3>
//                     <div class="table-container">
//                         <table style="width: 100%; border-collapse: collapse;">
//                             <thead>
//                                 <tr style="background: #667eea; color: white;">
//                                     <th style="padding: 12px; text-align: center; width: 10%;">#</th>
//                                     <th style="padding: 12px; text-align: left; width: 40%;">Product</th>
//                                     <th style="padding: 12px; text-align: center; width: 15%;">Qty</th>
//                                     <th style="padding: 12px; text-align: right; width: 15%;">Price</th>
//                                     <th style="padding: 12px; text-align: right; width: 20%;">Total</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 ${itemsHtml}
//                             </tbody>
//                         </table>
//                     </div>
//                 </div>
                
//                 <!-- Price Summary -->
//                 <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
//                     <h3 style="color: #667eea; margin-top: 0;">Price Summary</h3>
//                     <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
//                         <div style="display: flex; justify-content: space-between;">
//                             <span>Sub Total:</span>
//                             <span>₹${subTotal.toFixed(2)}</span>
//                         </div>
//                         ${discount > 0 ? `
//                         <div style="display: flex; justify-content: space-between; color: #28a745;">
//                             <span>Discount:</span>
//                             <span>-₹${discount.toFixed(2)}</span>
//                         </div>` : ''}
//                         ${deliveryCharge > 0 ? `
//                         <div style="display: flex; justify-content: space-between;">
//                             <span>Delivery Charge:</span>
//                             <span>₹${deliveryCharge.toFixed(2)}</span>
//                         </div>` : ''}
//                         ${taxAmount > 0 ? `
//                         <div style="display: flex; justify-content: space-between;">
//                             <span>Tax:</span>
//                             <span>₹${taxAmount.toFixed(2)}</span>
//                         </div>` : ''}
//                         <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 2px solid #667eea; padding-top: 10px; margin-top: 10px;">
//                             <span>Total Payable:</span>
//                             <span style="color: #764ba2;">₹${totalPayable.toFixed(2)}</span>
//                         </div>
//                     </div>
//                 </div>
                
//                 <!-- CTA Button -->
//                 <div style="text-align: center; margin: 30px 0;">
//                     <a href="${appUrl}/orders/${orderData._id || orderData.order_number}" 
//                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
//                               color: white; 
//                               padding: 15px 40px; 
//                               text-decoration: none; 
//                               border-radius: 5px; 
//                               font-weight: bold; 
//                               display: inline-block;
//                               font-size: 16px;">
//                         👁️ View Order Details
//                     </a>
//                 </div>
                
//                 <!-- Delivery Info -->
//                 ${orderData.delivery_info ? `
//                 <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3;">
//                     <h3 style="color: #2196F3; margin-top: 0;">🚚 Delivery Information</h3>
//                     <p><strong>Estimated Delivery:</strong> ${orderData.delivery_info.estimated_date || '2-3 business days'}</p>
//                     <p><strong>Delivery Address:</strong> ${orderData.address || ''}</p>
//                     <p><strong>Contact:</strong> ${orderData.mobile || user.phone || ''}</p>
//                 </div>` : ''}
                
//                 <!-- Footer -->
//                 <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
//                     <p>Need help? <a href="${appUrl}/contact" style="color: #667eea;">Contact our support team</a></p>
//                     <p>Thank you for shopping with us!<br>
//                     <strong>SevFast Team</strong></p>
//                     <p style="margin-top: 20px;">${appUrl}</p>
//                 </div>
//             </div>
//         </div>
//     </body>
//     </html>`;
//     }

//     getOrderConfirmationText(orderData, user, items) {
//         const userName = user.name || user.username || 'User';
//         const orderDate = new Date(orderData.createdAt).toLocaleDateString('en-IN');

//         let itemsText = '';
//         items.forEach((item, index) => {
//             itemsText += `${index + 1}. ${item.product_name} ${item.variant_name ? `- ${item.variant_name}` : ''}
//    Quantity: ${item.quantity}
//    Price: ₹${item.price.toFixed(2)}
//    Total: ₹${item.sub_total.toFixed(2)}\n\n`;
//         });

//         const subTotal = items.reduce((sum, item) => sum + item.sub_total, 0);
//         const deliveryCharge = orderData.delivery_charge || 0;
//         const discount = orderData.discount || 0;
//         const taxAmount = orderData.tax_amount || 0;
//         const totalPayable = orderData.total_payable || orderData.final_total || subTotal + deliveryCharge + taxAmount - discount;

//         return `Dear ${userName},

//             Thank you for your order! We're excited to let you know that your order has been confirmed.

//             📦 ORDER CONFIRMATION
//             Order Number: #${orderData.order_number}
//             Order Date: ${orderDate}
//             Payment Method: ${orderData.payment?.method || 'Cash on Delivery'}
//             Payment Status: ${orderData.payment?.status || 'Pending'}

//             ITEMS ORDERED:
//             ${itemsText}

//             PRICE SUMMARY:
//             SubTotal: ₹${subTotal.toFixed(2)}
//             ${discount > 0 ? `Discount: -₹${discount.toFixed(2)}\n` : ''}${deliveryCharge > 0 ? `Delivery Charge: ₹${deliveryCharge.toFixed(2)}\n` : ''}${taxAmount > 0 ? `Tax: ₹${taxAmount.toFixed(2)}\n` : ''}
//             TOTAL PAYABLE: ₹${totalPayable.toFixed(2)}

//             ${orderData.delivery_info ? `
//             DELIVERY INFORMATION:
//             Estimated Delivery: ${orderData.delivery_info.estimated_date || '2-3 business days'}
//             Delivery Address: ${orderData.address || ''}
//             Contact: ${orderData.mobile || user.phone || ''}
//             ` : ''}

//             You can track your order here: ${process.env.APP_URL || 'https://sevfast.in'}/orders/${orderData._id || orderData.order_number}

//             If you have any questions, please contact our support team.

//             Best regards,
//             SevFast Team
// ${process.env.APP_URL || 'https://sevfast.in'}`;
//     }
// }

// const emailServiceInstance = new EmailService();

// module.exports = {
//     EmailService: emailServiceInstance,
//     generateOTP
// };


const nodemailer = require('nodemailer');
const { GOOGLE_SMTP_HOST, GOOGLE_SMTP_PORT, GOOGLE_SMTP_USER, GOOGLE_SMTP_PASS, GOOGLE_FROM_NAME } = require('../env-variables');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: GOOGLE_SMTP_HOST,
            port: GOOGLE_SMTP_PORT,
            auth: {
                user: GOOGLE_SMTP_USER,
                pass: GOOGLE_SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    // ✅ REUSABLE EMAIL SENDING METHOD
    async sendEmail(to, subject, htmlContent, textContent = null) {
        try {
            const mailOptions = {
                from: `"${GOOGLE_FROM_NAME}" <${GOOGLE_SMTP_USER}>`,
                to: to,
                subject: subject,
                html: htmlContent,
                text: textContent || this.stripHtml(htmlContent) // Fallback text version
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${to}: ${info.messageId}`);
            return { 
                success: true, 
                messageId: info.messageId,
                to: to,
                subject: subject
            };
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error);
            return { 
                success: false, 
                error: error.message,
                to: to,
                subject: subject
            };
        }
    }

    // ✅ REUSABLE TEMPLATE METHOD FOR APPROVAL EMAILS
    async sendApprovalEmail(user) {
        const subject = '🎉 Account Approved - Welcome to SevaFast!';
        const htmlTemplate = this.getApprovalEmailTemplate(user);
        const textMessage = this.getApprovalEmailText(user);
        
        return await this.sendEmail(
            user.email,
            subject,
            htmlTemplate,
            textMessage
        );
    }

    // ✅ REUSABLE TEMPLATE METHOD FOR ORDER CONFIRMATION
    async sendOrderConfirmationEmail(orderData, user, items) {
        const subject = `📦 Order Confirmed - #${orderData.order_number}`;
        const htmlTemplate = this.getOrderConfirmationTemplate(orderData, user, items);
        const textMessage = this.getOrderConfirmationText(orderData, user, items);
        
        return await this.sendEmail(
            user.email,
            subject,
            htmlTemplate,
            textMessage
        );
    }

    // ✅ Helper method to strip HTML tags for text version
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // ✅ Approval Email Template
    getApprovalEmailTemplate(user) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const userName = user.name || user.username || user.email;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0;">🎉 Account Approved!</h1>
                <p style="margin: 10px 0 0; font-size: 18px;">Welcome to SevaFast</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2>Hello ${userName},</h2>
                
                <p>Great news! Your account has been <strong>approved</strong> and is now active.</p>
                
                <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Visit our website with the Go to Login button Below</li>
                        <li>Login with your credentials</li>
                        <li>Start using our services</li>
                    </ol>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${appUrl}/login" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              padding: 14px 35px; 
                              text-decoration: none; 
                              border-radius: 5px; 
                              font-weight: bold; 
                              display: inline-block;">
                        Go to Login
                    </a>
                </div>
                
                <p>If you have any questions, our support team is here to help.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <div style="text-align: center; color: #666; font-size: 14px;">
                    <p>Best regards,<br>
                    <strong>SevaFast Team</strong></p>
                    <p>${appUrl}</p>
                </div>
            </div>
        </body>
        </html>`;
    }

    // ✅ Approval Email Text Version
    getApprovalEmailText(user) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const userName = user.name || user.username || user.email;
        
        return `Hello ${userName},

🎉 Your account has been approved and is now active!

Great news! Your account has been approved and is now active.

Next Steps:
1. Visit our website: ${appUrl}/login
2. Login with your credentials
3. Start using our services

If you have any questions, our support team is here to help.

Best regards,
SevaFast Team
${appUrl}`;
    }

    // ✅ Order Confirmation Email Template
    getOrderConfirmationTemplate(orderData, user, items) {
        console.log("📧 Generating order confirmation template for order:", orderData.order_number);
        
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const userName = user.name || user.username || user.email;
        const orderDate = new Date(orderData.createdAt || new Date()).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Generate items HTML
        let itemsHtml = '';
        items.forEach((item, index) => {
            itemsHtml += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; text-align: center;">${index + 1}</td>
                <td style="padding: 10px;">${item.product_name} ${item.variant_name ? `- ${item.variant_name}` : ''}</td>
                <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right;">₹${item.price ? item.price.toFixed(2) : '0.00'}</td>
                <td style="padding: 10px; text-align: right;">₹${item.sub_total ? item.sub_total.toFixed(2) : '0.00'}</td>
            </tr>`;
        });

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.sub_total || 0), 0);
        const deliveryCharge = orderData.delivery_charge || 0;
        const discount = orderData.discount || 0;
        const taxAmount = orderData.tax_amount || 0;
        const totalPayable = orderData.total_payable || orderData.final_total || (subtotal + deliveryCharge + taxAmount - discount);

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation - #${orderData.order_number}</title>
            <style>
                @media only screen and (max-width: 600px) {
                    .container { width: 100% !important; }
                    .table-container { overflow-x: auto; }
                    table { width: 100%; font-size: 12px; }
                }
            </style>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div class="container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px;">📦 Order Confirmed!</h1>
                    <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Thank you for your purchase</p>
                </div>
                
                <!-- Order Summary -->
                <div style="padding: 30px;">
                    <h2 style="color: #333; margin-top: 0;">Hello ${userName},</h2>
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Your order <strong>#${orderData.order_number}</strong> has been successfully placed on ${orderDate}.
                    </p>
                    
                    <!-- Order Details -->
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="color: #667eea; margin-top: 0;">Order Details</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            <div>
                                <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderData.order_number}</p>
                                <p style="margin: 5px 0;"><strong>Date:</strong> ${orderDate}</p>
                                <p style="margin: 5px 0;"><strong>Payment:</strong> ${orderData.payment?.method || 'Cash on Delivery'}</p>
                            </div>
                            <div>
                                <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: #28a745;">${orderData.payment?.status || 'Pending'}</span></p>
                                <p style="margin: 5px 0;"><strong>Order Status:</strong> <span style="color: #ff9800;">${orderData.status || 'Received'}</span></p>
                                <p style="margin: 5px 0;"><strong>Delivery:</strong> ₹${deliveryCharge.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Items Table -->
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #667eea; margin-bottom: 15px;">Items Ordered</h3>
                        <div class="table-container">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #667eea; color: white;">
                                        <th style="padding: 12px; text-align: center; width: 10%;">#</th>
                                        <th style="padding: 12px; text-align: left; width: 40%;">Product</th>
                                        <th style="padding: 12px; text-align: center; width: 15%;">Qty</th>
                                        <th style="padding: 12px; text-align: right; width: 15%;">Price</th>
                                        <th style="padding: 12px; text-align: right; width: 20%;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Price Summary -->
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="color: #667eea; margin-top: 0;">Price Summary</h3>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Subtotal:</span>
                                <span>₹${subtotal.toFixed(2)}</span>
                            </div>
                            ${discount > 0 ? `
                            <div style="display: flex; justify-content: space-between; color: #28a745;">
                                <span>Discount:</span>
                                <span>-₹${discount.toFixed(2)}</span>
                            </div>` : ''}
                            ${deliveryCharge > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Delivery Charge:</span>
                                <span>₹${deliveryCharge.toFixed(2)}</span>
                            </div>` : ''}
                            ${taxAmount > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Tax:</span>
                                <span>₹${taxAmount.toFixed(2)}</span>
                            </div>` : ''}
                            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 2px solid #667eea; padding-top: 10px; margin-top: 10px;">
                                <span>Total Payable:</span>
                                <span style="color: #764ba2;">₹${totalPayable.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CTA Button -->
                    // <div style="text-align: center; margin: 30px 0;">
                    //     <a href="${appUrl}/orders/${orderData._id || orderData.order_number}" 
                    //        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    //               color: white; 
                    //               padding: 15px 40px; 
                    //               text-decoration: none; 
                    //               border-radius: 5px; 
                    //               font-weight: bold; 
                    //               display: inline-block;
                    //               font-size: 16px;">
                    //         👁️ View Order Details
                    //     </a>
                    // </div>
                    
                    <!-- Delivery Info -->
                    ${orderData.delivery_info ? `
                    <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3;">
                        <h3 style="color: #2196F3; margin-top: 0;">🚚 Delivery Information</h3>
                        <p><strong>Estimated Delivery:</strong> ${orderData.delivery_info.estimated_date || '2-3 business days'}</p>
                        <p><strong>Delivery Address:</strong> ${orderData.address || ''}</p>
                        <p><strong>Contact:</strong> ${orderData.mobile || user.phone || ''}</p>
                    </div>` : ''}
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
                        <p>Need help? <a href="${appUrl}/contact" style="color: #667eea;">Contact our support team</a></p>
                        <p>Thank you for shopping with us!<br>
                        <strong>SevaFast Team</strong></p>
                        <p style="margin-top: 20px;">${appUrl}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>`;
    }

    // ✅ Order Confirmation Text Version
    getOrderConfirmationText(orderData, user, items) {
        const userName = user.name || user.username || user.email;
        const orderDate = new Date(orderData.createdAt || new Date()).toLocaleDateString('en-IN');
        
        let itemsText = '';
        items.forEach((item, index) => {
            itemsText += `${index + 1}. ${item.product_name} ${item.variant_name ? `- ${item.variant_name}` : ''}
   Quantity: ${item.quantity}
   Price: ₹${item.price ? item.price.toFixed(2) : '0.00'}
   Total: ₹${item.sub_total ? item.sub_total.toFixed(2) : '0.00'}\n\n`;
        });

        const subtotal = items.reduce((sum, item) => sum + (item.sub_total || 0), 0);
        const deliveryCharge = orderData.delivery_charge || 0;
        const discount = orderData.discount || 0;
        const taxAmount = orderData.tax_amount || 0;
        const totalPayable = orderData.total_payable || orderData.final_total || (subtotal + deliveryCharge + taxAmount - discount);
        
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        return `Dear ${userName},

Thank you for your order! We're excited to let you know that your order has been confirmed.

📦 ORDER CONFIRMATION
Order Number: #${orderData.order_number}
Order Date: ${orderDate}
Payment Method: ${orderData.payment?.method || 'Cash on Delivery'}
Payment Status: ${orderData.payment?.status || 'Pending'}

ITEMS ORDERED:
${itemsText}

PRICE SUMMARY:
Subtotal: ₹${subtotal.toFixed(2)}
${discount > 0 ? `Discount: -₹${discount.toFixed(2)}\n` : ''}
${deliveryCharge > 0 ? `Delivery Charge: ₹${deliveryCharge.toFixed(2)}\n` : ''}
${taxAmount > 0 ? `Tax: ₹${taxAmount.toFixed(2)}\n` : ''}
TOTAL PAYABLE: ₹${totalPayable.toFixed(2)}

${orderData.delivery_info ? `
DELIVERY INFORMATION:
Estimated Delivery: ${orderData.delivery_info.estimated_date || '2-3 business days'}
Delivery Address: ${orderData.address || ''}
Contact: ${orderData.mobile || user.phone || ''}
` : ''}

You can track your order here: ${appUrl}/orders/${orderData._id || orderData.order_number}

If you have any questions, please contact our support team.

Best regards,
SevaFast Team
${appUrl}`;
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = {
    emailService,
    generateOTP,
    EmailService // Optional: export class itself for testing
};