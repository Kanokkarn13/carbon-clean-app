const bcrypt = require('bcrypt');

(async () => {
  const password = 'admin123'; // รหัส admin ที่ต้องการ
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
})();
