'user strict';

const SerialPort = require('serialport');
const { MoleculerServerError, MoleculerClientError } = require('moleculer').Errors;
const EventEmitter = require('events');

const Protocol = require('./protocol');

module.exports = {
  name: 'board',
  settings: {
    serialPort: process.env.SERIAL_PORT || '/dev/ttyUSB0',
    baudRate: process.env.SERIAL_PORT_BAUD_RATE || 9600
  },
  created() {
    this.port = null;
    this.events = new EventEmitter;

    this.open = false;
    this.reconnecting = false;

    Protocol.events.on('soil-moisture', (sensorId, moisture) => {
      this.logger.debug('soil-moisture', { sensorId, moisture });
      this.broker.emit('board.soil-moisture', { sensorId, moisture });
    });

    Protocol.events.on('dht', (sensorId, humidity, temperature) => {
      this.logger.debug('dht', { sensorId, humidity, temperature });
      this.broker.emit('board.dht', { sensorId, humidity, temperature });
    });

    Protocol.events.on('ds18b20', (sensorId, temperature) => {
      this.logger.debug('ds18b20', { sensorId, temperature });
      this.broker.emit('board.ds18b20', { sensorId, temperature });
    });
  },
  started() {
    this.connect();
  },
  stopped() {
    if (this.port) {
      this.port.end();
    }
  },
  methods: {
    connect() {
      this.port = new SerialPort(this.settings.serialPort, {
        baudRate: this.settings.baudRate
      });
      this.reconnecting = false;

      this.port.on('open', () => {
        this.open = true;
        this.events.emit('port-open');
        this.logger.info(`Serial port ${this.settings.serialPort} is open.`);
      });

      this.port.on('data', data => {
        Protocol.put(data);
      });

      this.port.on('error', error => {
        if (!this.reconnecting) {
          this.reconnecting = true;
          this.open = false;
          this.port.end();
          this.port = null;
          this.logger.warn(`Serial port ${this.settings.serialPort} error. Reconnecting...`, { error });
          setTimeout(() => this.connect(), 2000);
        }
      });

      this.port.on('close', () => {
        if (!this.reconnecting) {
          this.reconnecting = true;
          this.open = false;
          this.port.end();
          this.port = null;
          this.logger.warn(`Serial port connection ${this.settings.serialPort} is closed. Reconnecting...`);
          setTimeout(() => this.connect(), 2000);
        }
      });
    },
    sendRequest(subject, data) {
      if (this.open) {
        return Protocol.sendRequest(this.port, subject, data);
      } else {
        return new Promise((resolve, reject) =>
          this.events.once('port-open', () =>
            Protcol.sendRequest(this.port, data).then(resolve, reject))
        );
      }
    }
  },
  actions: {
    setRelay: {
      params: {
        relayId: 'number',
        state: 'boolean'
      },
      visibility: 'public',
      handler(ctx) {
        const { relayId, state } = ctx.params;
        return this.sendRequest('setRelay', {
          relayId,
          state: state ? 1 : 0
        });
      }
    },
    getRelay: {
      params: {
        relayId: 'number'
      },
      visibility: 'public',
      handler(ctx) {
        const { relayId } = ctx.params;
        return this.sendRequest('getRelay', { relayId });
      }
    },
    toggleRelay: {
      params: {
        relayId: 'number'
      },
      visibility: 'public',
      handler(ctx) {
        const { relayId } = ctx.params;
        return this.sendRequest('toggleRelay', { relayId });
      }
    },
    getSoilMoisture: {
      params: {
        sensorId: 'number'
      },
      visibility: 'public',
      handler(ctx) {
        const { sensorId } = ctx.params;
        return this.sendRequest('getSoilMoisture', { sensorId });
      }
    },
    getDHT: {
      params: {
        sensorId: 'number'
      },
      visibility: 'public',
      async handler(ctx) {
        const { sensorId } = ctx.params;

        const [humidity, temperature] = await this.sendRequest('getDHT', { sensorId });
        return { humidity, temperature };
      }
    },
    getDS18B20: {
      params: {
        sensorId: 'number'
      },
      visibility: 'public',
      handler(ctx) {
        const { sensorId } = ctx.params;
        return this.sendRequest('getDS18B20', { sensorId });
      }
    }
  }
};
