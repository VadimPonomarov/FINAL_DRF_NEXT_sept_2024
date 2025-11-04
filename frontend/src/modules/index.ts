/**
 * Main modules barrel (DRY)
 * Central export point for all modules
 */

// Shared module (common for all themes)
export * from './shared';

// Theme modules
export * as Main from './main';
export * as AutoRia from './autoria';
export * as ChatBot from './chatbot';
