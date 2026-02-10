// services/shiprocket.service.js
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

console.log("shiprocket email:", process.env.SHIPROCKET_EMAIL);
console.log("shiprocket password:", process.env.SHIPROCKET_PASSWORD);

class ShipRocketService {
  constructor() {
    this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
    this.token = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    try {
      const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD
      });
      
      this.token = response.data.token;
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      return this.token;
    } catch (error) {
      console.error('ShipRocket authentication failed:', error);
      throw error;
    }
  }

  async getAuthToken() {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.token;
  }

  async createOrder(orderData) {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.post(`${this.baseURL}/orders/create/adhoc`, orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Create order failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateLabel(shipmentId) {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.get(`${this.baseURL}/courier/generate/label`, {
        params: { shipment_id: shipmentId },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Generate label failed:', error);
      throw error;
    }
  }

  async trackOrder(awbNumber) {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.get(`${this.baseURL}/courier/track/awb/${awbNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Track order failed:', error);
      throw error;
    }
  }

  async checkServiceability(pincode, weight, length, breadth, height) {
    try {
      const token = await this.getAuthToken();
      
      const response = await axios.get(`${this.baseURL}/courier/serviceability`, {
        params: {
          pickup_postcode: process.env.STORE_PINCODE,
          delivery_postcode: pincode,
          weight,
          length,
          breadth,
          height,
          cod: 0 // Set to 1 if COD is available
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Serviceability check failed:', error);
      throw error;
    }
  }
}

module.exports = new ShipRocketService();