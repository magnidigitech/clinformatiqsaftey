require('dotenv').config();
const cluster = require('cluster');
const os = require('os');
const app = require('./app');

const PORT = process.env.PORT || 3001;
const numCPUs = os.cpus().length;

if (process.env.NODE_ENV === 'production' && (cluster.isPrimary || cluster.isMaster) && numCPUs > 1) {
  console.log(`Master process ${process.pid} is running. Forking ${numCPUs} worker processes...`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`Worker process ${worker.process.pid} exited. Forking replacement...`);
    cluster.fork();
  });
} else {
  app.listen(PORT, () => {
    console.log(`Server worker ${process.pid} running on port ${PORT}`);
  });
}
