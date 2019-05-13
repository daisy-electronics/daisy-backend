'user strict';

const SerialPort = require('serialport');
const ReadLine = require('@serialport/parser-readline');
const { MoleculerServerError, MoleculerClientError } = require('moleculer').Errors;

const Protocol = require('./protocol');

module.exports = {
  name: 'board',
  settings: {
    serialPort: process.env.SERIAL_PORT || '/dev/ttyUSB0',
    baudRate: process.env.SERIAL_PORT_BAUD_RATE || 9600
  },
  created() {
    this.port = null;
    this.parser = null;

    this.pendingRequests = {};
    this.nextRequestId = 0;

    this.open = false;
    this.reconnecting = false;
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
      this.parser = this.port.pipe(new ReadLine({ delimiter: '\r\n' }));
      this.reconnecting = false;

      this.port.on('open', () => {
        this.open = true;
        this.logger.info(`Serial port ${this.settings.serialPort} is open.`);
      });

      this.port.on('error', error => {
        if (!this.reconnecting) {
          this.reconnecting = true;
          this.open = false;
          this.port.end();
          this.parser.end();
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
          this.parser.end();
          this.port = null;
          this.logger.warn(`Serial port connection ${this.settings.serialPort} is closed. Reconnecting...`);
          setTimeout(() => this.connect(), 2000);
        }
      });

      this.parser.on('data', packetString => {
        const packet = Protocol.parsePacket(packetString);
        if (packet.type === Protocol.INVALID) {
          this.logger.warn(`Failed to parse a packet: ${packet.reason}.`, { packet: packetString });
          return;
        }
        this.logger.debug(`Received packet.`, { packet });

        this.handlePacket(packet);
      });
    },
    sendRequest(subject, message = undefined) {
      const requestId = this.nextRequestId++;
      const promise = new Promise((resolve, reject) =>
        this.pendingRequests[requestId] = { resolve, reject });

      this.sendPacket(Protocol.createRequest(requestId, subject, message));

      // to be safe and not exceed int16_t
      if (this.nextRequestId >= 32000) {
        this.nextRequestId = 0;
      }

      return promise;
    },

    sendPacket(packetString) {
      if (packetString.length > Protocol.PACKET_MAX_LENGTH) {
        throw new MoleculerServerError(`Invalid packet: too long.`, null, 'ERR_PACKET_TOO_LONG', { packet: packetString });
      }

      return new Promise((resolve, reject) => {
        if (!this.port) {
          return reject(new MoleculerServerError('Failed to send a packet: port is closed.', null, 'ERR_PORT_CLOSED', { packet: packetString }));
        }

        this.port.write(`${packetString}\n`, err => {
          if (err) {
            return reject(new MoleculerServerError('Failed to send a packet.', null, 'ERR_SEND_PACKET', { packet: packetString }));
          }

          this.logger.debug(`Packet sent.`, { packetString });
          resolve();
        });
      });
    },

    handlePacket(packet) {
      if (packet.type === Protocol.EVENT) {
        if (packet.subject === Protocol.EVENT_ERROR) {
          this.logger.error(`From Board.`, { message: packet.message });
        } else if (packet.subject === Protocol.EVENT_WARNING) {
          this.logger.warn(`From Board.`, { message: packet.message });
        } else if (packet.subject === Protocol.EVENT_SOIL_MOISTURE) {
          const [sensorId, moisture] = packet.message.split('|').map(Number);
          this.broker.emit('board.soil-moisture', { sensorId, moisture });
        } else if (packet.subject === Protocol.EVENT_DHT) {
          const [sensorId, humidity, temperature] = packet.message.split('|').map(Number);
          this.broker.emit('board.dht', { sensorId, humidity, temperature });
        }
      } else if (packet.type === Protocol.REQUEST) {
        // nothing to do, because Board cannot send a request (yet?)
      } else if (packet.type === Protocol.SUCCESS_RESPONSE) {
        if (this.pendingRequests[packet.requestId]) {
          this.pendingRequests[packet.requestId].resolve(packet.message);
          delete this.pendingRequests[packet.requestId];
        }
      } else if (packet.type === Protocol.FAILURE_RESPONSE) {
        if (this.pendingRequests[packet.requestId]) {
          this.pendingRequests[packet.requestId].reject(packet.message);
          delete this.pendingRequests[packet.requestId];
        }
      }
    }
  },
  actions: {
    setRelay: {
      params: {
        relayId: 'string',
        state: 'boolean'
      },
      visibility: 'public',
      handler(ctx) {
        const { relayId, state } = ctx.params;
        return this.sendRequest(Protocol.REQUEST_SET_RELAY, `${relayId}${state ? '1' : '0'}`);
      }
    },
    getRelay: {
      params: {
        relayId: 'string'
      },
      visibility: 'public',
      handler(ctx) {
        const { relayId } = ctx.params;
        return this.sendRequest(Protocol.REQUEST_GET_RELAY, relayId);
      }
    },
    toggleRelay: {
      params: {
        relayId: 'string'
      },
      visibility: 'public',
      handler(ctx) {
        const { relayId } = ctx.params;
        return this.sendRequest(Protocol.REQUEST_TOGGLE_RELAY, relayId);
      }
    },
    getSoilMoisture: {
      params: {
        sensorId: 'string'
      },
      visibility: 'public',
      handler(ctx) {
        const { sensorId } = ctx.params;
        return this.sendRequest(Protocol.REQUEST_SOIL_MOISTURE, sensorId);
      }
    },
    readDHT: {
      params: {
        sensorId: 'string'
      },
      visibility: 'public',
      async handler(ctx) {
        const { sensorId } = ctx.params;
        const result = await this.sendRequest(Protocol.REQUEST_READ_DHT, sensorId);
        const [humidity, temperature] = result.split('|');

        return { humidity: Number(humidity), temperature: Number(temperature) };
      }
    }
  }
};
