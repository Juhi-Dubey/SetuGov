const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message, ...args) => {
    if (typeof message === 'object' && message !== null) {
      console.log(`[${getTimestamp()}] [INFO]`, message, ...args);
    } else {
      console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    if (typeof message === 'object' && message !== null) {
      console.warn(`[${getTimestamp()}] [WARN]`, message, ...args);
    } else {
      console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
    }
  },
  error: (message, ...args) => {
    if (typeof message === 'object' && message !== null) {
      console.error(`[${getTimestamp()}] [ERROR]`, message, ...args);
    } else {
      console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args);
    }
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      if (typeof message === 'object' && message !== null) {
        console.debug(`[${getTimestamp()}] [DEBUG]`, message, ...args);
      } else {
        console.debug(`[${getTimestamp()}] [DEBUG] ${message}`, ...args);
      }
    }
  },
  http: (method, path, status, durationMs) => {
    console.log(`[${getTimestamp()}] [HTTP] ${method} ${path} -> ${status} (${durationMs}ms)`);
  }
};

export default logger;
