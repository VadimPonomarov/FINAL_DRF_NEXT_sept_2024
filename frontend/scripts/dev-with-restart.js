#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

class DevServerManager {
  constructor() {
    this.process = null;
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.stuckTimeout = 120000; // 2 minutes
    this.stuckTimer = null;
    this.lastOutput = Date.now();
    this.isRestarting = false;
    this.progressStuck = false;
    this.lastProgress = '';
    this.progressCount = 0;
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  killPort3000() {
    return new Promise((resolve) => {
      exec('npx kill-port 3000', (error) => {
        if (error) {
          this.log(`⚠️ Kill port warning: ${error.message}`);
        } else {
          this.log('✅ Port 3000 cleared');
        }
        resolve();
      });
    });
  }

  async cleanBuild() {
    return new Promise((resolve) => {
      this.log('🗑️ Cleaning .next directory...');
      exec('rm -rf .next', (error) => {
        if (error) {
          this.log(`⚠️ Clean warning: ${error.message}`);
        } else {
          this.log('✅ Build directory cleaned');
        }
        resolve();
      });
    });
  }

  checkProgress(output) {
    // Look for progress indicators
    const progressMatch = output.match(/(\d+)%/);
    if (progressMatch) {
      const currentProgress = progressMatch[1];
      if (currentProgress === this.lastProgress) {
        this.progressCount++;
        if (this.progressCount > 10) { // Same progress for too long
          this.log(`🐌 Progress stuck at ${currentProgress}%, considering restart...`);
          this.progressStuck = true;
        }
      } else {
        this.lastProgress = currentProgress;
        this.progressCount = 0;
        this.progressStuck = false;
      }
    }

    // Check for specific stuck patterns
    if (output.includes('Створення статичних файлів') ||
        output.includes('Creating static files') ||
        output.includes('Generating static pages')) {
      if (!this.lastProgress || this.progressStuck) {
        this.log('⚠️ Static file generation may be stuck');
      }
    }
  }

  resetStuckTimer() {
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
    }

    this.stuckTimer = setTimeout(() => {
      if (!this.isRestarting) {
        const reason = this.progressStuck ? 'progress stuck' : 'no output';
        this.log(`🚨 Build appears stuck (${reason}), restarting...`);
        this.restart();
      }
    }, this.stuckTimeout);
  }

  async start() {
    if (this.restartCount >= this.maxRestarts) {
      this.log(`❌ Max restarts (${this.maxRestarts}) reached. Exiting.`);
      process.exit(1);
    }

    this.isRestarting = true;
    this.log(`🚀 Starting dev server (attempt ${this.restartCount + 1}/${this.maxRestarts})`);

    // Kill existing processes and clean
    await this.killPort3000();
    if (this.restartCount > 0) {
      await this.cleanBuild();
    }

    // Start the dev server
    this.process = spawn('npm', ['run', 'dev'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    this.process.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);

      this.lastOutput = Date.now();
      this.resetStuckTimer();

      // Monitor progress indicators
      this.checkProgress(output);

      // Check for successful start
      if (output.includes('Ready in') || output.includes('✓ Ready')) {
        this.log('✅ Dev server ready!');
        this.isRestarting = false;
        this.progressStuck = false;
        if (this.stuckTimer) {
          clearTimeout(this.stuckTimer);
          this.stuckTimer = null;
        }
      }

      // Check for compilation errors that might require restart
      if (output.includes('Failed to compile') ||
          output.includes('Module parse failed') ||
          output.includes('webpack errors')) {
        this.log('⚠️ Compilation error detected');
      }
    });

    this.process.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
      
      this.lastOutput = Date.now();
      
      // Check for critical errors
      if (output.includes('EADDRINUSE') || 
          output.includes('port already in use') ||
          output.includes('Cannot find module')) {
        this.log('🚨 Critical error detected, restarting...');
        setTimeout(() => this.restart(), 2000);
      }
    });

    this.process.on('close', (code) => {
      this.log(`📊 Process exited with code ${code}`);
      if (code !== 0 && !this.isRestarting) {
        this.log('🔄 Unexpected exit, restarting...');
        setTimeout(() => this.restart(), 3000);
      }
    });

    this.process.on('error', (error) => {
      this.log(`❌ Process error: ${error.message}`);
      setTimeout(() => this.restart(), 3000);
    });

    // Start the stuck timer
    this.resetStuckTimer();
    this.restartCount++;
  }

  async restart() {
    if (this.isRestarting) {
      return;
    }

    this.isRestarting = true;
    this.log('🔄 Restarting dev server...');

    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }

    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.log('💀 Force killing process...');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }

    // Wait a bit before restarting
    setTimeout(() => {
      this.start();
    }, 3000);
  }

  handleExit() {
    this.log('👋 Shutting down...');
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
    }
    if (this.process) {
      this.process.kill('SIGTERM');
    }
    process.exit(0);
  }
}

// Create and start the manager
const manager = new DevServerManager();

// Handle graceful shutdown
process.on('SIGINT', () => manager.handleExit());
process.on('SIGTERM', () => manager.handleExit());

// Start the server
manager.start().catch((error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});
