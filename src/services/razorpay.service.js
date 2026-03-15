const Razorpay = require('razorpay');
const dotenv = require('dotenv');
dotenv.config();

class RazorpayService {
    constructor() {
        const key_id = (process.env.RAZORPAY_KEY || '').trim();
        const key_secret = (process.env.RAZORPAY_SECRET || '').trim();

        this.razorpay = new Razorpay({
            key_id: key_id,
            key_secret: key_secret
        });
    }

    async createOrder(amount, currency = 'INR', receipt) {
        try {
            const finalAmount = Math.round(Number(amount) * 100);
            
            const options = {
                amount: finalAmount,
                currency,
                receipt: receipt || `receipt_${Date.now()}`,
                payment_capture: 1
            };

            const order = await this.razorpay.orders.create(options);
            return order;
        } catch (error) {
            console.error('Razorpay Service - Error creating order:', error);
            throw error;
        }
    }

    async verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
        try {
            const crypto = require('crypto');
            const key_secret = (process.env.RAZORPAY_SECRET || '').trim();
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', key_secret)
                .update(body.toString())
                .digest('hex');

            return expectedSignature === razorpay_signature;
        } catch (error) {
            console.error('Razorpay Service - Error verifying payment:', error);
            throw error;
        }
    }

    async fetchPaymentDetails(paymentId) {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return payment;
        } catch (error) {
            console.error('Razorpay Service - Error fetching payment details:', error);
            throw error;
        }
    }
}

module.exports = new RazorpayService();
