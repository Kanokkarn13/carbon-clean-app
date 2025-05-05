import axios from 'axios';

const BASE_URL = 'http://192.168.0.102:3000/api';  // change when use other device this is for android emulator


const request = async (endpoint: string, data: any) => {
  const url = `${BASE_URL}${endpoint}`;
  console.log('🌐 [REQUEST]', {
    endpoint,
    url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log('📥 [RESPONSE STATUS]', response.status);

    const contentType = response.headers.get('Content-Type');
    console.log('📥 [RESPONSE HEADERS]', contentType);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SERVER ERROR RESPONSE TEXT]', errorText);
      throw new Error(`❌ Server responded with ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    console.log('✅ [PARSED JSON]', json);
    return json;

  } catch (err) {
    console.error('❌ [CATCH ERROR]', {
      message: err.message,
      error: err,
    });
    throw err;
  }
};

export const updateUser = async (userData: any) => {
  const API_URL = 'http://192.168.0.102:3000/api/update-user'; // change when use other device this is for android emulator only naka

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // ✅ ต้องตั้ง header
      },
      body: JSON.stringify(userData), // ✅ ต้อง stringify ทั้ง object
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update user: ${errorText}`);
    }

    return await response.json();
  } catch (err) {
    console.error('❌ Failed to update user:', err);
    throw err;
  }
};




// 🔐 Login API
export const login = (email: string, password: string) =>
  request('/check-user', { email, password });

// 📝 Register API
export const register = (name: string, lname: string, email: string, password: string, phone: string) =>
  request('/register', { name, lname, email, password, phone });
