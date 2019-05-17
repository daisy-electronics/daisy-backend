const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  function readSetRelay(bit) {
    // we won't get any data so let's just move on
    events.emit('response', 'success');
    data.pendingRequest = null;
    data.state = STATE.IDLE;
  }

  function readGetRelay(bit) {
    // get ready to read data
    if (bit === null) {
      data.relayState = new Uint8Array(1);
      return;
    }

    data.relayState[data.i] = bit;
    data.relayState = Bits.toNumber(data.relayState);
    events.emit('response', 'success', data.relayState);
    data.pendingRequest = null;
    data.state = STATE.IDLE;
  }

  function readToggleRelay(bit) {
    // we won't get any data so let's just move on
    events.emit('response', 'success');
    data.pendingRequest = null;
    data.state = STATE.IDLE;
  }

  function readGetSoilMoisture(bit) {
    // get ready to read data
    if (bit === null) {
      data.moisture = new Uint8Array(LENGTH.SOIL_MOISTURE.MOISTURE);
      return;
    }

    if (data.i < LENGTH.SOIL_MOISTURE.MOISTURE) {
      data.moisture[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH.SOIL_MOISTURE.MOISTURE) {
      data.moisture = Bits.toNumber(data.moisture);
      events.emit('response', 'success', data.moisture);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDHT(bit) {
    // get ready to read data
    if (bit === null) {
      data.humidity = new Uint8Array(LENGTH.DHT.HUMIDITY);
      data.temperature = new Uint8Array(LENGTH.DHT.TEMPERATURE);
      return;
    }

    if (data.i < LENGTH.DHT.HUMIDITY) {
      data.humidity[data.i] = bit;
    } else {
      data.temperature[data.i - LENGTH.DHT.HUMIDITY] = bit;
    }
    data.i++;

    if (data.i === LENGTH.DHT.HUMIDITY + LENGTH.DHT.TEMPERATURE) {
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
      data.temperature = new Uint8Array(LENGTH.DS18B20.TEMPERATURE);
      return;
    }

    if (data.i < LENGTH.DS18B20.TEMPERATURE) {
      data.temperature[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH.DS18B20.TEMPERATURE) {
      data.temperature = Bits.toNumber(data.temperature) / 2 - 55;
      events.emit('response', 'success', data.temperature);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  return function (bit) {
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
