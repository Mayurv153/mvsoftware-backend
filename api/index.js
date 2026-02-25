const app = require('../src/app');
const { connectMongoDB } = require('../src/config/mongodb');

let initialized = false;

module.exports = async (req, res) => {
    if (!initialized) {
        initialized = true;
        connectMongoDB().catch(() => {});
    }

    return app(req, res);
};
