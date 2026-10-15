const bcrypt = require('bcrypt');

/**
 * Generate bcrypt hash for admin passwords
 * Run this script to create secure password hashes for your admin accounts
 */

const generateHash = async () => {
  try {
    // Default passwords (CHANGE THESE IN PRODUCTION!)
    const passwords = {
      superadmin: 'SuperAdmin123!',
      store1admin: 'Store1Admin123!',
      store2admin: 'Store2Admin123!',
      enterpriseadmin: 'EnterpriseAdmin123!'
    };

    console.log('🔐 Generating secure password hashes...\n');

    const saltRounds = 12; // Higher security for production
    const hashes = {};

    for (const [role, password] of Object.entries(passwords)) {
      const hash = await bcrypt.hash(password, saltRounds);
      hashes[role] = hash;
      
      console.log(`${role.toUpperCase()}:`);
      console.log(`  Password: ${password}`);
      console.log(`  Hash: ${hash}\n`);
    }

    console.log('📝 SQL INSERT statements:\n');

    // Super Admin (can manage all merchants)
    console.log('-- Super Admin');
    console.log(`INSERT INTO admins (email, password_hash, role, first_name, last_name) VALUES`);
    console.log(`('superadmin@platform.com', '${hashes.superadmin}', 'super_admin', 'Super', 'Admin');\n`);

    // Merchant Admins
    console.log('-- Store 1 Admin');
    console.log(`INSERT INTO admins (email, password_hash, role, merchant_id, first_name, last_name) VALUES`);
    console.log(`('admin@store1.com', '${hashes.store1admin}', 'admin', 1, 'Store1', 'Admin');\n`);

    console.log('-- Store 2 Admin');
    console.log(`INSERT INTO admins (email, password_hash, role, merchant_id, first_name, last_name) VALUES`);
    console.log(`('admin@store2.com', '${hashes.store2admin}', 'admin', 2, 'Store2', 'Admin');\n`);

    console.log('-- Enterprise Admin');
    console.log(`INSERT INTO admins (email, password_hash, role, merchant_id, first_name, last_name) VALUES`);
    console.log(`('admin@enterprise.com', '${hashes.enterpriseadmin}', 'admin', 3, 'Enterprise', 'Admin');\n`);

    console.log('⚠️  SECURITY REMINDER:');
    console.log('   1. Change these default passwords in production!');
    console.log('   2. Use strong, unique passwords for each admin');
    console.log('   3. Enable 2FA where possible');
    console.log('   4. Regularly rotate admin passwords\n');

    console.log('🚀 Copy the SQL statements above and run them in your database!');

  } catch (error) {
    console.error('❌ Error generating hashes:', error);
  }
};

/**
 * Generate hash for a custom password
 */
const generateCustomHash = async (password) => {
  try {
    if (!password) {
      console.log('Usage: node generate-hash.js "your-password-here"');
      return;
    }

    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('🔐 Custom Password Hash Generated:');
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log(`\nSQL Example:`);
    console.log(`INSERT INTO admins (email, password_hash, role) VALUES ('your-email@example.com', '${hash}', 'admin');`);
    
  } catch (error) {
    console.error('❌ Error generating custom hash:', error);
  }
};

// Check if custom password provided as command line argument
const customPassword = process.argv[2];

if (customPassword) {
  generateCustomHash(customPassword);
} else {
  generateHash();
}

module.exports = { generateHash, generateCustomHash };