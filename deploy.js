#!/usr/bin/env node
/**
 * ========================================================
 * 🚀 AutoRia Clone - Automated Deployment Script (Node.js)
 * ========================================================
 *
 * This script automates the complete deployment process:
 * - Checks system requirements
 * - Starts Docker containers
 * - Installs frontend dependencies
 * - Builds and starts the application
 * - Seeds test data via frontend
 *
 * Usage:
 *   node deploy.js                    # Full Docker deployment
 *   node deploy.js --local-frontend   # Docker backend + Local frontend
 *   node deploy.js --help             # Show help
 *
 * ========================================================
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

// Configuration
const config = {
    frontendDir: './frontend',
    backendDir: './backend',
    composeFile: 'docker-compose.yml',
    localFrontend: process.argv.includes('--local-frontend'),
};

// Helper functions
function printStep(step, message) {
    console.log(`${colors.blue}[STEP ${step}]${colors.reset} ${colors.bright}${message}${colors.reset}`);
}

function printSuccess(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printWarning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printError(message) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function checkCommand(command) {
    try {
        execSync(`${command} --version`, { stdio: 'ignore' });
        printSuccess(`${command} is installed`);
        return true;
    } catch (error) {
        printError(`${command} is not installed`);
        return false;
    }
}

function execCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, options.args || [], {
            cwd: options.cwd || process.cwd(),
            shell: true,
            stdio: options.silent ? 'ignore' : 'inherit',
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });

        child.on('error', reject);
    });
}

async function waitForService(url, maxWait = 120) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait * 1000) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return true;
            }
        } catch (error) {
            // Service not ready yet
        }
        
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return false;
}

async function main() {
    console.log('');
    console.log('==========================================');
    console.log('🚀 AutoRia Clone - Automated Deployment');
    console.log('==========================================');
    console.log('');

    // Show help
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('Usage: node deploy.js [OPTIONS]');
        console.log('');
        console.log('Options:');
        console.log('  --local-frontend    Run frontend locally (not in Docker)');
        console.log('  --help, -h          Show this help message');
        console.log('');
        process.exit(0);
    }

    try {
        // Step 1: Check system requirements
        printStep(1, 'Checking system requirements...');
        
        const dockerInstalled = checkCommand('docker');
        const dockerComposeInstalled = checkCommand('docker-compose') || checkCommand('docker');
        
        if (!dockerInstalled || !dockerComposeInstalled) {
            printError('Docker is required but not installed');
            process.exit(1);
        }
        
        if (config.localFrontend) {
            const nodeInstalled = checkCommand('node');
            const npmInstalled = checkCommand('npm');
            
            if (!nodeInstalled || !npmInstalled) {
                printError('Node.js and npm are required for local frontend');
                process.exit(1);
            }
        }
        
        console.log('');

        // Step 2: Cleanup conflicting containers and ports
        printStep(2, 'Cleaning up conflicting containers and ports...');
        
        const ports = [80, 3000, 5432, 5555, 5540, 6379, 8000, 8001, 15672];
        const optionalComposeServices = ['flower'];
        const standardNames = ['pg', 'redis', 'redis-insight', 'rabbitmq', 'celery-worker', 'celery-beat', 'mailing', 'nginx'];
        const containersToRemove = new Set();
        
        // Find containers using project ports
        for (const port of ports) {
            try {
                const output = execSync(`docker ps -a --filter "publish=${port}" --format "{{.Names}}"`, { encoding: 'utf8' });
                const containers = output.trim().split('\n').filter(name => name);
                containers.forEach(name => containersToRemove.add(name));
            } catch (error) {
                // Ignore errors
            }
        }
        
        // Check for standard container names
        for (const name of standardNames) {
            try {
                const output = execSync(`docker ps -a --filter "name=^${name}$" --format "{{.Names}}"`, { encoding: 'utf8' });
                if (output.trim() === name) {
                    containersToRemove.add(name);
                }
            } catch (error) {
                // Ignore errors
            }
        }
        
        // Remove conflicting containers
        const availableServicesOutput = execSync('docker-compose config --services', { encoding: 'utf8' });
        const availableServices = new Set(
            availableServicesOutput
                .split('\n')
                .map((service) => service.trim())
                .filter(Boolean)
        );

        if (containersToRemove.size > 0) {
            console.log(`   Found ${containersToRemove.size} containers to remove`);
            for (const container of containersToRemove) {
                try {
                    console.log(`   🗑️  Removing container: ${container}`);
                    execSync(`docker rm -f ${container}`, { stdio: 'ignore' });
                } catch (error) {
                    printWarning(`Failed to remove ${container}`);
                }
            }
            printSuccess('Removed conflicting containers');
            console.log('   ⏳ Waiting for ports to be released...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
            printSuccess('No conflicting containers found');
        }
        console.log('');

        // Step 3: Start Docker containers
        printStep(3, 'Starting Docker containers...');
        
        if (config.localFrontend) {
            printWarning('Starting backend services only (frontend will run locally)');
            const baseServices = ['pg', 'redis', 'rabbitmq', 'redis-insight', 'mailing', 'celery-worker', 'celery-beat', 'app'];
            const optionalServices = ['flower'];
            const servicesToStart = [
                ...baseServices,
                ...optionalServices.filter((service) => availableServices.has(service)),
            ];
            await execCommand('docker-compose', {
                args: ['up', '-d', ...servicesToStart],
            });
        } else {
            await execCommand('docker-compose', {
                args: ['up', '-d', '--build'],
            });
        }
        
        printSuccess('Docker containers started');
        console.log('');

        // Step 4: Wait for services to be healthy
        printStep(4, 'Waiting for services to be ready...');
        console.log('This may take 30-60 seconds...');
        
        // Django redirects /health → /health/, so call canonical URL to avoid timeout loops
        const backendReady = await waitForService('http://localhost:8000/health/');
        
        if (backendReady) {
            printSuccess('Backend is ready');
        } else {
            printWarning('Timeout waiting for backend, but continuing...');
        }
        console.log('');

        // Step 5: Frontend setup
        if (config.localFrontend) {
            printStep(5, 'Setting up frontend locally...');
            
            // Create .env.local with required variables
            console.log('Creating frontend/.env.local with required variables...');
            const envLocalPath = path.join(config.frontendDir, '.env.local');
            const envConfigPath = './env-config';
            
            // Read environment variables from env-config files
            const envVars = {};
            const envFiles = [
                path.join(envConfigPath, '.env.base'),
                path.join(envConfigPath, '.env.secrets'),
                path.join(envConfigPath, '.env.local')
            ];
            
            for (const envFile of envFiles) {
                if (fs.existsSync(envFile)) {
                    const content = fs.readFileSync(envFile, 'utf8');
                    content.split('\n').forEach(line => {
                        line = line.trim();
                        if (line && !line.startsWith('#') && line.includes('=')) {
                            const [key, ...valueParts] = line.split('=');
                            // Remove all newlines and extra whitespace
                            envVars[key.trim()] = valueParts.join('=').trim().replace(/[\r\n]/g, '');
                        }
                    });
                }
            }
            
            // Write critical variables to .env.local
            const criticalVars = [
                'NEXTAUTH_SECRET',
                'NEXTAUTH_URL',
                'NEXT_PUBLIC_BACKEND_URL',
                'BACKEND_URL',
                'NODE_ENV',
                'NEXT_PUBLIC_IS_DOCKER',
                'IS_DOCKER',
                'REDIS_HOST',
                'REDIS_URL',
                'GOOGLE_CLIENT_ID',
                'GOOGLE_CLIENT_SECRET',
                'NEXT_PUBLIC_GOOGLE_CLIENT_ID'
            ];
            
            let envContent = '# Auto-generated by deploy.js\n';
            envContent += '# DO NOT COMMIT THIS FILE\n\n';
            
            for (const varName of criticalVars) {
                if (envVars[varName]) {
                    envContent += `${varName}=${envVars[varName]}\n`;
                } else if (varName === 'NODE_ENV') {
                    envContent += `${varName}=production\n`;
                } else if (varName === 'NEXTAUTH_URL') {
                    envContent += `${varName}=http://localhost:3000\n`;
                } else if (varName === 'NEXT_PUBLIC_BACKEND_URL') {
                    envContent += `${varName}=http://localhost:8000\n`;
                } else if (varName === 'BACKEND_URL') {
                    envContent += `${varName}=http://localhost:8000\n`;
                } else if (varName === 'NEXT_PUBLIC_IS_DOCKER' || varName === 'IS_DOCKER') {
                    envContent += `${varName}=false\n`;
                }
            }
            
            fs.writeFileSync(envLocalPath, envContent);
            printSuccess(`Created ${envLocalPath}`);
            
            // Validate critical variables
            console.log('🔍 Validating critical variables...');
            if (!envVars['NEXTAUTH_SECRET'] || envVars['NEXTAUTH_SECRET'].trim() === '') {
                printError('❌ NEXTAUTH_SECRET not found or empty!');
                printError('   Check env-config/.env.secrets');
                process.exit(1);
            }
            printSuccess('✅ All critical variables present');
            
            // Clean .next and cache BEFORE npm install for guaranteed clean build
            console.log('🧹 Cleaning previous build artifacts...');
            const nextDir = path.join(config.frontendDir, '.next');
            const cacheDir = path.join(config.frontendDir, 'node_modules', '.cache');
            
            if (fs.existsSync(nextDir)) {
                console.log(`   Removing ${nextDir}`);
                fs.rmSync(nextDir, { recursive: true, force: true });
            }
            
            if (fs.existsSync(cacheDir)) {
                console.log(`   Removing ${cacheDir}`);
                fs.rmSync(cacheDir, { recursive: true, force: true });
            }
            
            printSuccess('✅ Artifacts cleaned');
            
            process.chdir(config.frontendDir);
            
            // Install dependencies
            console.log('Installing dependencies...');
            await execCommand('npm', { args: ['install'] });
            printSuccess('Dependencies installed');
            
            // Build frontend
            console.log('Building frontend...');
            await execCommand('npm', { args: ['run', 'build'] });
            printSuccess('Frontend built');
            
            // Print completion message
            console.log('');
            console.log('==========================================');
            console.log('🎉 Deployment Complete!');
            console.log('==========================================');
            console.log('');
            console.log('📍 Frontend: http://localhost:3000');
            console.log('📍 Backend API: http://localhost:8000');
            console.log('📍 API Docs: http://localhost:8000/api/docs/');
            console.log('📍 Admin: http://localhost:8000/admin/');
            console.log('');
            console.log('🔐 Default credentials:');
            console.log('   Email: admin@autoria.com');
            console.log('   Password: 12345678');
            console.log('');
            console.log('Starting frontend server (press Ctrl+C to stop)...');
            console.log('');
            
            // Start frontend (this will keep running)
            await execCommand('npm', { args: ['run', 'start'] });
            
        } else {
            printStep(5, 'Frontend running in Docker...');
            
            // Wait for frontend
            console.log('Waiting for frontend to be ready...');
            const frontendReady = await waitForService('http://localhost:3000', 60);
            
            if (frontendReady) {
                printSuccess('Frontend is ready');
            }
            console.log('');
            
            // Print completion message
            console.log('');
            console.log('==========================================');
            console.log('🎉 Deployment Complete!');
            console.log('==========================================');
            console.log('');
            console.log('📍 Frontend: http://localhost:3000');
            console.log('📍 Backend API: http://localhost:8000');
            console.log('📍 API Docs: http://localhost:8000/api/docs/');
            console.log('📍 Admin: http://localhost:8000/admin/');
            console.log('');
            console.log('🔐 Default credentials:');
            console.log('   Email: admin@autoria.com');
            console.log('   Password: 12345678');
            console.log('');
            console.log('📊 View logs:');
            console.log('   docker-compose logs -f');
            console.log('');
            console.log('🛑 Stop services:');
            console.log('   docker-compose down');
            console.log('');
        }

    } catch (error) {
        printError(`Deployment failed: ${error.message}`);
        process.exit(1);
    }
}

// Run main function
main().catch((error) => {
    printError(`Fatal error: ${error.message}`);
    process.exit(1);
});
