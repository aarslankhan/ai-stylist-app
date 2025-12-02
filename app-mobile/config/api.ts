// app-mobile/app/config/api.ts
import { Platform } from "react-native";

// 🔧 EDIT THIS: put your laptop's LAN IP here (the one your phone can reach)
const LOCAL_IP = "192.168.0.113"; // ← change to your actual IP

const WEB_BASE_URL = "http://localhost:4000/api";
const NATIVE_BASE_URL = `http://${LOCAL_IP}:4000/api`;

export const API_BASE_URL =
  Platform.OS === "web" ? WEB_BASE_URL : NATIVE_BASE_URL;
