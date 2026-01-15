/**
 * JWT Secret Generator
 *
 * Generates a cryptographically secure 64-byte random hex string
 * and updates the locally configured .env file.
 *
 * Usage: npm run secrets:generate
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Configuration
const ENV_FILE = '.env';
const EXAMPLE_ENV_FILE = '.env.example';
const SECRET_LENGTH_BYTES = 64; // 64 bytes = 512 bits

/**
 * Main execution
 */
function main() {
  console.log('🔑  Generating secure JWT Secret...');

  // 1. Generate Entropy
  const secret = crypto.randomBytes(SECRET_LENGTH_BYTES).toString('hex');

  const envPath = path.join(process.cwd(), ENV_FILE);
  const exampleEnvPath = path.join(process.cwd(), EXAMPLE_ENV_FILE);

  let envContent = '';

  // 2. Resolve Environment File
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } else if (fs.existsSync(exampleEnvPath)) {
    console.log('⚠️   .env file not found, initializing from .env.example...');
    envContent = fs.readFileSync(exampleEnvPath, 'utf-8');
  } else {
    console.log('ℹ️   No .env source found. Creating new file.');
  }

  // 3. Update or Insert Secret
  if (envContent.includes('JWT_SECRET=')) {
    envContent = envContent.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${secret}"`);
  } else {
    envContent += `\nJWT_SECRET="${secret}"\n`;
  }

  // 4. Write Changes
  fs.writeFileSync(envPath, envContent, 'utf-8');

  console.log('✅  JWT_SECRET updated successfully.');
  console.log(
    `🔒  Secret Preview: ${secret.substring(0, 5)}...${secret.substring(secret.length - 5)}`
  );
}

main();
