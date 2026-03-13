// webhook url :"https://upi.tezindia.in/api/create-order"

const Module = require("node:module");

// get request = "https://upi.tezindia.in/api/create-order?status=SUCCESS&utr=104097179160&order_id=ORDR977135546&amount=500.00&customer_mobile=9766128730&method=HDFC&merchentMobile=7083044400&remark1=test1&remark2=test2",

// post request = {
//   "status": "SUCCESS",
//   "utr": "104097179160",
//   "order_id": "ORDR977135546",
//   "amount": "500.00",
//   "customer_mobile": "9766128730",
//   "method": "HDFC",
//   "merchentMobile": "7083044400",
//   "remark1": "test1",
//   "remark2": "test2"
// }

// create order api :"https://upi.tezindia.in/api/create-order"
// req payload for create prder : {
//     {
//   "customer_mobile": "8145344963",
//   "user_token": "0a97326de8679a25f056f04500409d36",
//   "amount": "1.00",
//   "order_id": "8787772321800",
//   "redirect_url": "https://yourdomain.com/success",
//   "remark1": "Optional remark 1",
//   "remark2": "Optional remark 2"
// }
// }

// response example for succes :{
//     {
//   "status": true,
//   "message": "Order Created Successfully",
//   "result": {
//     "method": "Bharatpe",
//     "orderId": "123456789125994465655859",
//     "payment_url": "https://tezgateway.com/payment4/instant-pay/...",
//     "data": {
//       "bhim_link": "upi://pay?pa=...",
//       "phonepe_link": "phonepe://pay?pa=...",
//       "paytm_link": "paytmmp://pay?pa=...",
//       "gpay_link": "tez://upi/pay?pa=...",
//       "amazonpay_link": "amazonpay://upi/pay?pa=...",
//       "cred_link": "cred://upi/pay?pa=...",
//       "qr_image": "data:image/png;base64,..."
//     }
//   }
// }
// }

// response example for fail :{
//     {
//   "status": false,
//   "message": "Order_id Already Exist"
// }
// }

// check order status api :{
//     https://upi.tezindia.in/api/check-order-status
// }
// response success :{
//     {
//   "status": true,
//   "message": "Transaction Successfully",
//   "result": {
//     "txnStatus": "SUCCESS",
//     "orderId": "ORDR977132269",
//     "amount": 2000.00,
//     "date": "2025-01-10 18:49:33",
//     "utr": "975253134097",
//     "customer_mobile": "9325239266",
//     "remark1": "test1",
//     "remark2": "test2"
//   }
// }
// }

// response fail :{
//     {
//   "status": true,
//   "message": "Transaction FAILURE",
//   "result": {
//     "txnStatus": "FAILURE",
//     "orderId": "ORDR977132269",
//     "amount": 2000.00,
//     "date": "2025-01-10 18:49:33",
//     "utr": "NULL",
//     "customer_mobile": "9325239266",
//     "remark1": "test1",
//     "remark2": "test2"
//   }
// }
// }

// reponse error :{
//     {
//   "status": "ERROR",
//   "message": "Error Message"
// }
// }

const apiUrl = "https://upi.tezindia.in/api/create-order"

class TezGatewayCreateOrderAPI {
    constructor() {
        this.apiUrl = apiUrl;
        this.userToken = TEZ_USER_TOKEN || "e8d2a2f1ac98d41d3b7422fd11ab98fa";
        // this.merchantId = process.env.TEZ_MERCHANT_ID;
        // this.redirectUrl = process.env.TEZ_REDIRECT_URL || "https://yourdomain.com/api/payment/tez-callback";
    }

    // Validate mobile number format for Tez
    validateMobileNumber(mobile) {
        if (!mobile) return false;
        
        // Remove any non-digit characters
        const cleaned = mobile.toString().replace(/\D/g, '');
        
        // Indian mobile numbers should be 10 digits and start with 6-9
        const mobileRegex = /^[6-9]\d{9}$/;
        
        return mobileRegex.test(cleaned);
    }

    // Format mobile number for Tez
    formatMobileNumber(mobile) {
        if (!mobile) return '';
        
        // Remove any non-digit characters
        const cleaned = mobile.toString().replace(/\D/g, '');
        
        // Ensure it's 10 digits
        if (cleaned.length === 10) {
            return cleaned;
        }
        
        // If it's 12 digits with 91 prefix, remove it
        if (cleaned.length === 12 && cleaned.startsWith('91')) {
            return cleaned.substring(2);
        }
        
        // If it's 11 digits with 0 prefix, remove it
        if (cleaned.length === 11 && cleaned.startsWith('0')) {
            return cleaned.substring(1);
        }
        
        return cleaned;
    }


    // async createOrder(customerMobile, userToken, amount, orderId, redirectUrl, remark1, remark2) {
    //     const payload = new URLSearchParams();
    //     payload.append('customer_mobile', customerMobile);
    //     payload.append('user_token', userToken);
    //     payload.append('amount', amount);
    //     payload.append('order_id', orderId);
    //     payload.append('redirect_url', redirectUrl);
    //     payload.append('remark1', remark1);
    //     payload.append('remark2', remark2);

    //     try {
    //         const response = await fetch(this.apiUrl, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/x-www-form-urlencoded'
    //             },
    //             body: payload
    //         });

    //         const data = await response.json();

    //         if (response.ok && data.status === true) {
    //             return data;
    //         } else {
    //             throw new Error(data.message || 'Unknown error');
    //         }
    //     } catch (error) {
    //         console.error('Error creating order:', error);
    //         throw error;
    //     }
    // }

    async CreatePaymentOrder(orderData){
        const {customerMobile, userToken, amount, orderId, redirectUrl, remark1, remark2} = orderData;
        if(!customerMobile || !amount || !orderId){
             throw new Error('Missing required payment parameters');
        }
          // Format and validate mobile number
            const formattedMobile = this.formatMobileNumber(customerMobile);
            
            if (!this.validateMobileNumber(formattedMobile)) {
                throw new Error(`Invalid mobile number format: ${customerMobile}. Must be a valid 10-digit Indian mobile number`);
            }

            // Format amount - ensure it's in correct format
            const formattedAmount = parseFloat(amount).toFixed(2);

            const payload = new URLSearchParams();
            payload.append('customer_mobile', formattedMobile);
            payload.append('user_token', this.userToken);
            payload.append('amount', formattedAmount);
            payload.append('order_id', orderId.toString());
            payload.append('redirect_url', this.redirectUrl);
            payload.append('remark1', remark1.substring(0, 50)); // Limit length
            payload.append('remark2', remark2.substring(0, 50)); // Limit length

              console.log('Tez Payment Request:', {
                apiUrl: this.apiUrl,
                orderId,
                amount: formattedAmount,
                customerMobile: formattedMobile,
                userToken: this.userToken ? '***' + this.userToken.slice(-4) : 'not-set'
            });

             const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: payload
            });
            // Handle non-JSON responses
            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', responseText);
                throw new Error(`Invalid response from payment gateway: ${responseText.substring(0, 100)}`);
            }

            console.log('Tez Payment Response:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });

            if (response.ok && data.status === true) {
                return {
                    success: true,
                    paymentData: data,
                    paymentUrl: data.payment_url || data.url || data.redirect_url,
                    transactionId: data.transaction_id || data.txn_id,
                    orderId: data.order_id,
                    message: data.message || 'Payment initiated successfully'
                };
            } else {
                const errorMessage = data.message || data.error || data.error_message || 'Payment gateway error';
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Tez payment error:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }


// checkOrderStatusSDK.js

function checkOrderStatus(userToken, orderId, callback) {
    const apiUrl = 'https://upi.tezindia.in/api/api/check-order-status';

    const formData = new FormData();
    formData.append('user_token', userToken);
    formData.append('order_id', orderId);

    fetch(apiUrl, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'COMPLETED') {
            callback(null, data.result);
        } else {
            callback(data.message, null);
        }
    })
    .catch(error => {
        callback(error.message, null);
    });
}

// Usage example:
// checkOrderStatus('2048f66bef68633fa3262d7a398ab577', '8052313697', (error, result) => {
//     if (error) {
//         console.error('Error:', error);
//     } else {
//         console.log('Result:', result);
//     }
// });

// Export the function for use in other scripts if needed
Module.exports = { checkOrderStatus };

// Usage
// const api = new TezGatewayCreateOrderAPI('https://upi.tezindia.in/api/create-order');
// api.CreatePaymentOrder('8145344963', 'e8d2a2f1ac98d41d3b7422fd11ab98fa', '1', '8787772321800', 'https://khilaadixpro.shop', 'testremark', 'testremark2')
//     .then(order => console.log('Order created:', order))
//     .catch(error => console.error('Order creation failed:', error));



  