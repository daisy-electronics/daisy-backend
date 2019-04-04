const DHT11 = require('./drivers/dht11');

module.exports = {
  dht11: {
    class: DHT11,
    description: 'Temperature and humidity sensor. Data is updated once every 2 seconds.',
    variables: [
      { name: 'temperature', description: 'Current temperature in Celsius degrees.' },
      { name: 'humidity', description: 'Current relative humidity: [0-98].' }
    ],
    actions: []
  }
};
