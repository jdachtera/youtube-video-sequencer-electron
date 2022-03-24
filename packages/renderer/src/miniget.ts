const Miniget = (url: string) => {
  return {
    text: async () => {
      const response = await fetch(url);

      return await response.text();
    },
    json: async () => {
      const response = await fetch(url);

      return await response.json();
    },
  };
};

Miniget.MinigetError = class MinigetError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
};

Miniget.defaultOptions = {
  maxRedirects: 10,
  maxRetries: 2,
  maxReconnects: 0,
  backoff: { inc: 100, max: 10000 },
};

module.exports = Miniget;
