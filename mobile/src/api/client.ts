import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auto-detected machine IP: 192.168.1.44
// Backend is running on port 8006 (latest with all modules)
// For Android Emulator: http://10.0.2.2:8006/api/v1
// For iOS Simulator: http://localhost:8006/api/v1
// For physical device: use your computer's WiFi IP
const BASE_URL = 'http://192.168.1.44:8006/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
