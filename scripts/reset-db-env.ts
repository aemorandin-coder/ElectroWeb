
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const dbPath = path.join(process.cwd(), 'dev.db');

try {
    // 1. Reset .env to relative path without quotes
    if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        const newLines = lines.map(line => {
            if (line.trim().startsWith('DATABASE_URL=')) {
                return 'DATABASE_URL=file:./dev.db';
            }
            return line;
        });
        fs.writeFileSync(envPath, newLines.join('\n'));
        console.log('✅ .env reset to file:./dev.db');
    }

    // 2. Create empty dev.db if not exists
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, '');
        console.log('✅ Created empty dev.db file');
    } else {
        console.log('ℹ️ dev.db already exists');
    }

} catch (error) {
    console.error('Error:', error);
}
