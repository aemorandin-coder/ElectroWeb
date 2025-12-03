
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');

try {
    if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');

        // Check if DATABASE_URL exists
        if (content.includes('DATABASE_URL=')) {
            // Replace invalid URL if found (e.g., DATABASE_URL=./dev.db -> DATABASE_URL="file:./dev.db")
            // We look for lines that have DATABASE_URL but NOT file:
            const lines = content.split('\n');
            const newLines = lines.map(line => {
                if (line.trim().startsWith('DATABASE_URL=')) {
                    if (!line.includes('file:') && !line.includes('postgres://') && !line.includes('mysql://')) {
                        console.log('Found malformed DATABASE_URL. Fixing...');
                        // Extract value
                        const parts = line.split('=');
                        const key = parts[0];
                        let value = parts.slice(1).join('=');

                        // Remove quotes if present
                        value = value.replace(/^["']|["']$/g, '');

                        // Use absolute path to avoid relative path issues
                        const dbPath = path.join(process.cwd(), 'dev.db').replace(/\\/g, '/');
                        return `${key}=file:${dbPath}`;
                    }
                }
                return line;
            });

            content = newLines.join('\n');
            fs.writeFileSync(envPath, content);
            console.log('✅ .env file fixed successfully.');
        } else {
            console.log('⚠️ DATABASE_URL not found in .env');
        }
    } else {
        console.log('❌ .env file not found');
        // Create default .env
        const defaultEnv = `DATABASE_URL="file:./dev.db"\nNEXTAUTH_SECRET="secret"\nNEXTAUTH_URL="http://localhost:3000"`;
        fs.writeFileSync(envPath, defaultEnv);
        console.log('✅ Created new .env file with defaults.');
    }
} catch (error) {
    console.error('Error fixing .env:', error);
}
