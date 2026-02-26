// ─── MongoDB Connection (Agent Logs) ────────────────────────────

const mongoose = require('mongoose');
const logger = require('../utils/logger');

function normalizeEnv(value) {
    return String(value || '')
        .replace(/\r|\n/g, '')
        .trim()
        .replace(/^['"]+|['"]+$/g, '');
}

let isConnected = false;

async function connectMongoDB() {
    if (isConnected) return;

    const uri = normalizeEnv(process.env.MONGODB_URI);
    if (!uri) {
        logger.warn('[MongoDB] MONGODB_URI not set — agent logs will be skipped');
        return;
    }

    try {
        await mongoose.connect(uri, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        logger.info('[MongoDB] Connected to Atlas successfully');

        mongoose.connection.on('error', (err) => {
            logger.error('[MongoDB] Connection error:', err.message);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('[MongoDB] Disconnected — will retry on next operation');
            isConnected = false;
        });
    } catch (err) {
        logger.error('[MongoDB] Initial connection failed:', err.message);
        // Don't crash the server — MongoDB is optional
    }
}

function getConnectionStatus() {
    return { isConnected, readyState: mongoose.connection.readyState };
}

module.exports = { connectMongoDB, getConnectionStatus };
