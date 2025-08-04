const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function testPassword() {
  const password = "test123"; // 登録時に使用したパスワード
  const storedPassword = "45700bd1d07b9e84ac33082f173e7f3a:3d52c1bc03a487ce7a2e9e6be4fdb20d48e1b2c3e5c2eee7a82b2c8e9b7a8f7e44c3e22e50a7ba9c75b3ef37b9eef8d1";
  
  console.log("Testing password verification...");
  console.log("Password:", password);
  console.log("Stored:", storedPassword.substring(0, 50) + "...");
  
  const [salt, hashedPassword] = storedPassword.split(":");
  console.log("Salt:", salt);
  console.log("Hash:", hashedPassword.substring(0, 20) + "...");
  
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = await scrypt(password, salt, 64);
  
  console.log("Match:", hashedPasswordBuf.equals(suppliedPasswordBuf));
}

testPassword().catch(console.error);
