// db.js

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

function readData() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[DB] ❌ Lỗi đọc file DB:', error);
    return {};
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[DB] ❌ Lỗi ghi file DB:', error);
  }
}

// Lấy thông tin khách hàng, nếu chưa có thì tạo mới
function getCustomer(psid) {
  const data = readData();
  if (!data[psid]) {
    data[psid] = {
      psid: psid,
      phone: null,
      diachi: null,
      status: 'pending_info',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeData(data);
  }
  return data[psid];
}

// Cập nhật thông tin khách hàng
function updateCustomer(psid, updates) {
  const data = readData();
  let customer = data[psid] || getCustomer(psid);

  customer = {
    ...customer,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  data[psid] = customer;
  writeData(data);
  console.log(`[DB] ✅ Đã cập nhật khách hàng ${psid}`);
  return customer;
}

// Reset trạng thái follow-up khi khách nhắn tin
function resetFollowUpState(psid) {
  const customer = getCustomer(psid);
  if (customer.status !== 'completed') {
    updateCustomer(psid, { status: 'pending_info' });
    console.log(`[DB] 🔁 Đã reset trạng thái follow-up cho ${psid}`);
  }
}

// Trả toàn bộ danh sách khách hàng cho cron quét
function getAllCustomers() {
  return readData();
}

module.exports = {
  getCustomer,
  updateCustomer,
  resetFollowUpState,
  getAllCustomers
};
