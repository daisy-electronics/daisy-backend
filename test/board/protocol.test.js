const Protocol = require('../../services/board.service/protocol');
const Bits = require('../../services/board.service/protocol/bits');
const encodeRequest = require('../../services/board.service/protocol/encode-request');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_REQUEST } = require('../../services/board.service/protocol/constants');
const { toBuffer } = require('../util');

beforeEach(() => {
  Protocol._testClear();
});

describe('receiving events', () => {
  test('soil-moisture event', done => {
    Protocol.events.once('soil-moisture', (sensorId, moisture) => {
      expect(sensorId).toEqual(0b0010);
      expect(moisture).toEqual(0b1000000);
      done();
    });
    Protocol.put(toBuffer('00 0000 0010 1000000'));
  });

  test('dht event', done => {
    Protocol.events.once('dht', (sensorId, humidity, temperature) => {
      expect(sensorId).toEqual(0b0101);
      expect(humidity).toEqual(0b1001000);
      expect(temperature).toEqual(-40);
      done();
    });
    Protocol.put(toBuffer('00 0001 101 1001000 00000000'));
  });

  test('ds18b20 event', done => {
    Protocol.events.once('ds18b20', (sensorId, temperature) => {
      expect(sensorId).toEqual(0b0101);
      expect(temperature).toEqual(-54.5);
      done();
    });
    Protocol.put(toBuffer('00 0010 101 000000001'));
  });
});

describe('receiving success response', () => {
  test('setRelay success response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.SET_RELAY);
    Protocol.events.once('response', status => {
      expect(status).toEqual('success');
      done();
    });
    Protocol.put(toBuffer('10'));
  });

  test('getRelay success response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_RELAY);
    Protocol.events.once('response', (status, state) => {
      expect(status).toEqual('success');
      expect(state).toEqual(0);
      done();
    });
    Protocol.put(toBuffer('10 0'));
  });

  test('toggleRelay success response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.TOGGLE_RELAY);
    Protocol.events.once('response', status => {
      expect(status).toEqual('success');
      done();
    });
    Protocol.put(toBuffer('10'));
  });

  test('getSoilMoisture success response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_SOIL_MOISTURE);
    Protocol.events.once('response', (status, moisture) => {
      expect(status).toEqual('success');
      expect(moisture).toEqual(0b0101010);
      done();
    });
    Protocol.put(toBuffer('10 0101010'));
  });

  test('getDHT success response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_DHT);
    Protocol.events.once('response', (status, humidity, temperature) => {
      expect(status).toEqual('success');
      expect(humidity).toEqual(0b0101010);
      expect(temperature).toEqual(45);
      done();
    });
    Protocol.put(toBuffer('10 0101010 10101010'));
  });

  test('getDS18B20 success response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_DS18B20);
    Protocol.events.once('response', (status, temperature) => {
      expect(status).toEqual('success');
      expect(temperature).toEqual(115.5);
      done();
    });
    Protocol.put(toBuffer('10 101010101'));
  });
});

describe('receiving failing response', () => {
  test('setRelay failing response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.SET_RELAY);
    Protocol.events.once('response', (status, errorNumber) => {
      expect(status).toEqual('failure');
      expect(errorNumber).toEqual(ERROR.SET_RELAY.INVALID_RELAY_ID);
      done();
    });
    Protocol.put(toBuffer('11 0'));
  });

  test('getRelay failing response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_RELAY);
    Protocol.events.once('response', (status, errorNumber) => {
      expect(status).toEqual('failure');
      expect(errorNumber).toEqual(ERROR.GET_RELAY.INVALID_RELAY_ID);
      done();
    });
    Protocol.put(toBuffer('11 0'));
  });

  test('toggleRelay failing response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.TOGGLE_RELAY);
    Protocol.events.once('response', (status, errorNumber) => {
      expect(status).toEqual('failure');
      expect(errorNumber).toEqual(ERROR.TOGGLE_RELAY.INVALID_RELAY_ID);
      done();
    });
    Protocol.put(toBuffer('11 0'));
  });

  test('getSoilMoisture failing response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_SOIL_MOISTURE);
    Protocol.events.once('response', (status, errorNumber) => {
      expect(status).toEqual('failure');
      expect(errorNumber).toEqual(ERROR.GET_SOIL_MOISTURE.INVALID_SENSOR_ID);
      done();
    });
    Protocol.put(toBuffer('11 0'));
  });

  test('getDHT failing response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_DHT);
    Protocol.events.once('response', (status, errorNumber) => {
      expect(status).toEqual('failure');
      expect(errorNumber).toEqual(ERROR.GET_DHT.INVALID_SENSOR_ID);
      done();
    });
    Protocol.put(toBuffer('11 0'));
  });

  test('getDS18B20 failing response', done => {
    Protocol._testSetPendingRequest(OUTBOUND_REQUEST.GET_DS18B20);
    Protocol.events.once('response', (status, errorNumber) => {
      expect(status).toEqual('failure');
      expect(errorNumber).toEqual(ERROR.GET_DS18B20.INVALID_SENSOR_ID);
      done();
    });
    Protocol.put(toBuffer('11 0'));
  });
});

describe('sending request', () => {
  let packet = null;
  const fakePort = {
    write: bits => packet = bits
  };

  beforeEach(() => {
    packet = null;
  });

  test('setRelay', done => {
    Protocol.sendRequest(fakePort, 'setRelay', { relayId: 3, state: 1 })
    .then(
      () => {
        expect(packet.compare(Buffer.from([0b01000001, 0b11000000]))).toEqual(0);
        done();
      },
      error => {
        done(`Should have succeeded: ${error}`);
      }
    );
    Protocol.put(toBuffer('10'));
  });

  test('getRelay', done => {
    Protocol.sendRequest(fakePort, 'getRelay', { relayId: 5 })
    .then(
      state => {
        expect(packet.compare(Buffer.from([0b01000110, 0b10000000]))).toEqual(0);
        expect(state).toEqual(1);
        done();
      },
      error => {
        done(`Should have succeeded: ${error}`);
      }
    );
    Protocol.put(toBuffer('10 1'));
  });

  test('toggleRelay', done => {
    Protocol.sendRequest(fakePort, 'toggleRelay', { relayId: 3 })
    .then(
      () => {
        done(`Should have failed.`);
      },
      error => {
        expect(packet.compare(Buffer.from([0b01001001, 0b10000000]))).toEqual(0);
        expect(error.message).toEqual('Invalid relay ID.');
        done();
      }
    );
    Protocol.put(toBuffer('11 0'));
  });

  test('getSoilMoisture', done => {
    Protocol.sendRequest(fakePort, 'getSoilMoisture', { sensorId: 13 })
    .then(
      moisture => {
        expect(packet.compare(Buffer.from([0b01001111, 0b01000000]))).toEqual(0);
        expect(moisture).toBe(81);
        done();
      },
      error => {
        done(`Should have succeeded: ${error}`);
      }
    );
    Protocol.put(toBuffer('10 1010001'));
  });

  test('getDHT', done => {
    Protocol.sendRequest(fakePort, 'getDHT', { sensorId: 1 })
    .then(
      ([humidity, temperature]) => {
        expect(packet.compare(Buffer.from([0b01010000, 0b10000000]))).toEqual(0);
        expect(humidity).toBe(0b0010111);
        expect(temperature).toBe(0.5);
        done();
      },
      error => {
        done(`Should have succeeded: ${error}`);
      }
    );
    Protocol.put(toBuffer('10 0010111 01010001'));
  });

  test('getDS18B20', done => {
    Protocol.sendRequest(fakePort, 'getDS18B20', { sensorId: 6 })
    .then(
      temperature => {
        expect(packet.compare(Buffer.from([0b01010111, 0b00000000]))).toEqual(0);
        expect(temperature).toBe(10.5);
        done();
      },
      error => {
        done(`Should have succeeded: ${error}`);
      }
    );
    Protocol.put(toBuffer('10 010000011'));
  });
});
