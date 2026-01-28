const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n===========================================');
  console.log('🔑 HASH GERADO PARA: Admin@123');
  console.log('===========================================');
  console.log(hash);
  console.log('===========================================\n');
  console.log('📋 COPIE O HASH ACIMA E EXECUTE NO SUPABASE:');
  console.log('\nUPDATE users SET password = \'', hash, '\' WHERE email = \'admin@teste.com\';');
  console.log('\n');
}

generateHash();
