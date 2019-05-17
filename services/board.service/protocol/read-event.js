const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  function readSoilMoisture(bit) {
    const LENGTH_SENSOR_ID = LENGTH.EVENT.SOIL_MOISTURE.SENSOR_ID;
    const LENGTH_MOISTURE = LENGTH.COMMON.SOIL_MOISTURE.MOISTURE;
    const LENGTH_REDUNDANT = LENGTH.EVENT.SOIL_MOISTURE.REDUNDANT;

    // get ready for reading data
    if (bit === null) {
      data.sensorId = new Uint8Array(LENGTH_SENSOR_ID);
      data.moisture = new Uint8Array(LENGTH_MOISTURE);
      return;
    }

    if (data.i < LENGTH_SENSOR_ID) {
      data.sensorId[data.i] = bit;
    } else if (data.i < LENGTH_SENSOR_ID + LENGTH_MOISTURE) {
      data.moisture[data.i - LENGTH_SENSOR_ID] = bit;
    }
    data.i++;

    if (data.i === LENGTH_SENSOR_ID + LENGTH_MOISTURE + LENGTH_REDUNDANT) {
      data.sensorId = Bits.toNumber(data.sensorId);
      data.moisture = Bits.toNumber(data.moisture);
      events.emit(INBOUND_EVENT_NAME.SOIL_MOISTURE, data.sensorId, data.moisture);
      data.state = STATE.IDLE;
    }
  }

  function readDHT(bit) {
    const LENGTH_SENSOR_ID = LENGTH.EVENT.DHT.SENSOR_ID;
    const LENGTH_HUMIDITY = LENGTH.COMMON.DHT.HUMIDITY;
    const LENGTH_TEMPERATURE = LENGTH.COMMON.DHT.TEMPERATURE;
    const LENGTH_REDUNDANT = LENGTH.EVENT.DHT.REDUNDANT;

    // get ready for reading data
    if (bit === null) {
      data.sensorId = new Uint8Array(LENGTH_SENSOR_ID);
      data.humidity = new Uint8Array(LENGTH_HUMIDITY);
      data.temperature = new Uint8Array(LENGTH_TEMPERATURE);
      return;
    }

    if (data.i < LENGTH_SENSOR_ID) {
      data.sensorId[data.i] = bit;
    } else if (data.i < LENGTH_SENSOR_ID + LENGTH_HUMIDITY) {
      data.humidity[data.i - LENGTH_SENSOR_ID] = bit;
    } else if (data.i < LENGTH_SENSOR_ID + LENGTH_HUMIDITY + LENGTH_TEMPERATURE) {
      data.temperature[data.i - LENGTH_SENSOR_ID - LENGTH_HUMIDITY] = bit;
    }
    data.i++;

    if (data.i === LENGTH_SENSOR_ID + LENGTH_HUMIDITY + LENGTH_TEMPERATURE + LENGTH_REDUNDANT) {
      data.sensorId = Bits.toNumber(data.sensorId);
      data.humidity = Bits.toNumber(data.humidity);
      data.temperature = Bits.toNumber(data.temperature) / 2 - 40;
      events.emit(INBOUND_EVENT_NAME.DHT, data.sensorId, data.humidity, data.temperature);
      data.state = STATE.IDLE;
    }
  }

  function readDS18B20(bit) {
    const LENGTH_SENSOR_ID = LENGTH.EVENT.DS18B20.SENSOR_ID;
    const LENGTH_TEMPERATURE = LENGTH.COMMON.DS18B20.TEMPERATURE;
    const LENGTH_REDUNDANT = LENGTH.EVENT.DS18B20.REDUNDANT;

    // get ready for reading data
    if (bit === null) {
      data.sensorId = new Uint8Array(LENGTH_SENSOR_ID);
      data.temperature = new Uint8Array(LENGTH_TEMPERATURE);
      return;
    }

    if (data.i < LENGTH_SENSOR_ID) {
      data.sensorId[data.i] = bit;
    } else if (data.i < LENGTH_SENSOR_ID + LENGTH_TEMPERATURE) {
      data.temperature[data.i - LENGTH_SENSOR_ID] = bit;
    }
    data.i++;

    if (data.i === LENGTH_SENSOR_ID + LENGTH_TEMPERATURE + LENGTH_REDUNDANT) {
      data.sensorId = Bits.toNumber(data.sensorId);
      data.temperature = Bits.toNumber(data.temperature) / 2 - 55;
      events.emit(INBOUND_EVENT_NAME.DS18B20, data.sensorId, data.temperature);
      data.state = STATE.IDLE;
    }
  }

  return function readEventData(bit) {
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
