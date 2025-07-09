const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

function readData() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('[DB] Lỗi đọc file:', err);
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getCustomer(psid) {
  const data = readData();
  if (!data[psid]) {
    data[psid] = {
      psid,
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

function updateCustomer(psid, updates) {
  const data = readData();
  let customer = data[psid] || getCustomer(psid);
  customer = { ...customer, ...updates, updatedAt: new Date().toISOString() };
  data[psid] = customer;
  writeData(data);
  console.log(`[DB] ✅ Đã cập nhật ${psid}`);
  return customer;
}

function resetFollowUpState(psid) {
  const customer = getCustomer(psid);
  if (customer.status !== 'completed') {
    updateCustomer(psid, { status: 'pending_info' });
    console.log(`[DB] ✅ Reset follow-up ${psid}`);
  }
}

function getAllCustomers() {
  return readData();
}

module.exports = { getCustomer, updateCustomer, resetFollowUpState, getAllCustomers };
