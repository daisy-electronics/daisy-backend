const Driver = require('../driver');

module.exports = class DHT11 extends Driver {
  constructor(options) {
    super({
      ...options,
      variables: {
        temperature: () => {
          return Promise.resolve(this._temperature);
        },
        humidity: () => {
          return Promise.resolve(this._humidity);
        }
      }
    });

    this._temperature = null;
    this._humidity = null;

    this._intervalId = setInterval(() =>{
      this._temperature = Math.floor(Math.random() * 30);
      this._humidity = Math.floor(Math.random() * 98);
      this.emit('temperature', this._temperature);
      this.emit('humidity', this._humidity);
    }, 2000);
  }

  dispose() {
    clearInterval(this._intervalId);
  }
};
