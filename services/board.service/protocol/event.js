const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  function readSoilMoisture(bit) {
    // get ready for reading data
    if (bit === null) {
      data.sensorId = new Uint8Array(LENGTH.SOIL_MOISTURE.SENSOR_ID);
      data.moisture = new Uint8Array(LENGTH.SOIL_MOISTURE.MOISTURE);
      return;
    }

    if (data.i < LENGTH.SOIL_MOISTURE.SENSOR_ID) {
      data.sensorId[data.i] = bit;
    } else {
      data.moisture[data.i - LENGTH.SOIL_MOISTURE.SENSOR_ID] = bit;
    }
    data.i++;

    if (data.i === LENGTH.SOIL_MOISTURE.SENSOR_ID + LENGTH.SOIL_MOISTURE.MOISTURE) {
      data.sensorId = Bits.toNumber(data.sensorId);
      data.moisture = Bits.toNumber(data.moisture);
      events.emit(INBOUND_EVENT_NAME.SOIL_MOISTURE, data.sensorId, data.moisture);
      data.state = STATE.IDLE;
    }
  }

  function readDHT(bit) {
    // get ready for reading data
    if (bit === null) {
      data.sensorId = new Uint8Array(LENGTH.DHT.SENSOR_ID);
      data.humidity = new Uint8Array(LENGTH.DHT.HUMIDITY);
      data.temperature = new Uint8Array(LENGTH.DHT.TEMPERATURE);
      return;
    }

    if (data.i < LENGTH.DHT.SENSOR_ID) {
      data.sensorId[data.i] = bit;
    } else if (data.i < LENGTH.DHT.SENSOR_ID + LENGTH.DHT.HUMIDITY) {
      data.humidity[data.i - LENGTH.DHT.SENSOR_ID] = bit;
    } else {
      data.temperature[data.i - LENGTH.DHT.SENSOR_ID - LENGTH.DHT.HUMIDITY] = bit;
    }
    data.i++;

    if (data.i === LENGTH.DHT.SENSOR_ID + LENGTH.DHT.HUMIDITY + LENGTH.DHT.TEMPERATURE) {
      data.sensorId = Bits.toNumber(data.sensorId);
      data.humidity = Bits.toNumber(data.humidity);
      data.temperature = Bits.toNumber(data.temperature) / 2 - 40;
      events.emit(INBOUND_EVENT_NAME.DHT, data.sensorId, data.humidity, data.temperature);
      data.state = STATE.IDLE;
    }
  }

  function readDS18B20(bit) {
    // get ready for reading data
    if (bit === null) {
      data.sensorId = new Uint8Array(LENGTH.DS18B20.SENSOR_ID);
      data.temperature = new Uint8Array(LENGTH.DS18B20.TEMPERATURE);
      return;
    }

    if (data.i < LENGTH.DS18B20.SENSOR_ID) {
      data.sensorId[data.i] = bit;
    } else {
      data.temperature[data.i - LENGTH.DS18B20.SENSOR_ID] = bit;
    }
    data.i++;

    if (data.i === LENGTH.DS18B20.SENSOR_ID + LENGTH.DS18B20.TEMPERATURE) {
      data.sensorId = Bits.toNumber(data.sensorId);
      data.temperature = Bits.toNumber(data.temperature) / 2 - 55;
      events.emit(INBOUND_EVENT_NAME.DS18B20, data.sensorId, data.temperature);
      data.state = STATE.IDLE;
    }
  }

  return function (bit) {
    if (data.subject === INBOUND_EVENT.SOIL_MOISTURE) {
      readSoilMoisture(bit);
    } else if (data.subject === INBOUND_EVENT.DHT) {
      readDHT(bit);
    } else if (data.subject === INBOUND_EVENT.DS18B20) {
      readDS18B20(bit);
    } else {
      throw new MoleculerServerError('Invalid event subject', null, 'ERR_INVALID_EVENT_SUBJECT', { subject: data.subject });
    }
  };
};
