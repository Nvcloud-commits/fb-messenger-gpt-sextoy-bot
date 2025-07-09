// db.js

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');

function readData() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Lỗi đọc file DB:", error);
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Lấy thông tin khách hàng, nếu chưa có thì tạo mới
export function getCustomer(psid) {
  const data = readData();
  if (!data[psid]) {
    data[psid] = {
      psid: psid,
      phone: null,
      diachi: null,
      status: 'pending_info', // Trạng thái ban đầu
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeData(data);
  }
  return data[psid];
}

// Cập nhật thông tin khách hàng
export function updateCustomer(psid, updates) {
  const data = readData();
  let customer = data[psid] || getCustomer(psid); // Lấy hoặc tạo mới

  // Cập nhật các trường được cung cấp
  customer = { ...customer, ...updates, updatedAt: new Date().toISOString() };
  data[psid] = customer;

  writeData(data);
  console.log(`[DB] Đã cập nhật khách hàng ${psid}`);
  return customer;
}

// Reset trạng thái follow-up khi người dùng nhắn tin
export function resetFollowUpState(psid) {
    const customer = getCustomer(psid);
    // Chỉ reset nếu họ không phải ở trạng thái đã hoàn thành
    if (customer.status !== 'completed') {
        updateCustomer(psid, { status: 'pending_info' });
        console.log(`[DB] Đã reset trạng thái follow-up cho ${psid}`);
    }
}

// Lấy tất cả khách hàng để cron job quét
export function getAllCustomers() {
    return readData();
}
