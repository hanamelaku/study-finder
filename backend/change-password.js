const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/db');
require('dotenv').config();

async function updateAdmin() {
  const NEW_USERNAME = 'hana'; // 👈 Put your new username here
  const NEW_PASSWORD = 'mariyam'; // 👈 Put your new password here

  // Encrypt the new password
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

  try {
    // Update the FIRST admin in the database (ID = 1)
    const [result] = await pool.execute(
      'UPDATE admins SET username = ?, password = ? WHERE id = 1',
      [NEW_USERNAME, hashedPassword]
    );

    if (result.affectedRows > 0) {
      console.log('✅ Admin username and password successfully updated!');
    } else {
      console.log('❌ No admin found to update.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0); // Stop the script
  }
}

updateAdmin();