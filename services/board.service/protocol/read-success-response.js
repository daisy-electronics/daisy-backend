const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  function readSetRelay(bit) {
    // we won't get any data so let's just throw away redundant bits
    data.i++;

    if (data.i === LENGTH.SUCCESS_RESPONSE.SET_RELAY.REDUNDANT) {
      events.emit('response', 'success');
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetRelay(bit) {
    // get ready to read data
    if (bit === null) {
      data.relayState = new Uint8Array(1);
      return;
    }

    if (data.i === 0) {
      data.relayState[data.i] = bit;
    }
    data.i++;

    if (data.i === 1 + LENGTH.SUCCESS_RESPONSE.GET_RELAY.REDUNDANT) {
      data.relayState = Bits.toNumber(data.relayState);
      events.emit('response', 'success', data.relayState);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readToggleRelay(bit) {
    // we won't get any data so let's just throw away redundant bits
    data.i++;

    if (data.i === LENGTH.SUCCESS_RESPONSE.TOGGLE_RELAY.REDUNDANT) {
      events.emit('response', 'success');
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetSoilMoisture(bit) {
    // get ready to read data
    if (bit === null) {
      data.moisture = new Uint8Array(LENGTH.COMMON.SOIL_MOISTURE.MOISTURE);
      return;
    }

    if (data.i < LENGTH.COMMON.SOIL_MOISTURE.MOISTURE) {
      data.moisture[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH.COMMON.SOIL_MOISTURE.MOISTURE
        + LENGTH.SUCCESS_RESPONSE.GET_SOIL_MOISTURE.REDUNDANT) {
      data.moisture = Bits.toNumber(data.moisture);
      events.emit('response', 'success', data.moisture);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDHT(bit) {
    // get ready to read data
    if (bit === null) {
      data.humidity = new Uint8Array(LENGTH.COMMON.DHT.HUMIDITY);
      data.temperature = new Uint8Array(LENGTH.COMMON.DHT.TEMPERATURE);
      return;
    }

    if (data.i < LENGTH.COMMON.DHT.HUMIDITY) {
      data.humidity[data.i] = bit;
    } else {
      data.temperature[data.i - LENGTH.COMMON.DHT.HUMIDITY] = bit;
    }
    data.i++;

    if (data.i === LENGTH.COMMON.DHT.HUMIDITY + LENGTH.COMMON.DHT.TEMPERATURE
        + LENGTH.SUCCESS_RESPONSE.GET_DHT.REDUNDANT) {
      data.humidity = Bits.toNumber(data.humidity);
      data.temperature = Bits.toNumber(data.temperature) / 2 - 40;
      events.emit('response', 'success', data.humidity, data.temperature);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDS18B20(bit) {
    // get ready to read data
    if (bit === null) {
      data.temperature = new Uint8Array(LENGTH.COMMON.DS18B20.TEMPERATURE);
      return;
    }

    if (data.i < LENGTH.COMMON.DS18B20.TEMPERATURE) {
      data.temperature[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH.COMMON.DS18B20.TEMPERATURE + LENGTH.SUCCESS_RESPONSE.GET_DS18B20.REDUNDANT) {
      data.temperature = Bits.toNumber(data.temperature) / 2 - 55;
      events.emit('response', 'success', data.temperature);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  return function readSuccessResponseData(bit) {
    if (data.pendingRequest === null) {
      throw new MoleculerServerError('Didn\'t expect response.', null, 'ERR_UNEXPECTED_RESPONSE');
    }

    if (data.pendingRequest === OUTBOUND_REQUEST.SET_RELAY) {
      readSetRelay(bit);
    } else if (data.pendingRequest === OUTBOUND_REQUEST.GET_RELAY) {
      readGetRelay(bit);
    } else if (data.pendingRequest === OUTBOUND_REQUEST.TOGGLE_RELAY) {
      readToggleRelay(bit);
    } else if (data.pendingRequest === OUTBOUND_REQUEST.GET_SOIL_MOISTURE) {
      readGetSoilMoisture(bit);
    } else if (data.pendingRequest === OUTBOUND_REQUEST.GET_DHT) {
      readGetDHT(bit);
    } else if (data.pendingRequest === OUTBOUND_REQUEST.GET_DS18B20) {
      readGetDS18B20(bit);
    }
  };
};
