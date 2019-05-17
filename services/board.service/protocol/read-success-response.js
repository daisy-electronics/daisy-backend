const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  function readSetRelay(bit) {
    const LENGTH_REDUNDANT = LENGTH.SUCCESS_RESPONSE.SET_RELAY.REDUNDANT;

    // we won't get any data so let's just throw away redundant bits
    data.i++;

    if (data.i === LENGTH_REDUNDANT) {
      events.emit('response', 'success');
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetRelay(bit) {
    const LENGTH_STATE = 1;
    const LENGTH_REDUNDANT = LENGTH.SUCCESS_RESPONSE.GET_RELAY.REDUNDANT;

    // get ready to read data
    if (bit === null) {
      data.relayState = new Uint8Array(1);
      return;
    }

    if (data.i < LENGTH_STATE) {
      data.relayState[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH_STATE + LENGTH_REDUNDANT) {
      data.relayState = Bits.toNumber(data.relayState);
      events.emit('response', 'success', data.relayState);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readToggleRelay(bit) {
    const LENGTH_REDUNDANT = LENGTH.SUCCESS_RESPONSE.TOGGLE_RELAY.REDUNDANT;

    // we won't get any data so let's just throw away redundant bits
    data.i++;

    if (data.i === LENGTH_REDUNDANT) {
      events.emit('response', 'success');
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetSoilMoisture(bit) {
    const LENGTH_MOISTURE = LENGTH.COMMON.SOIL_MOISTURE.MOISTURE;
    const LENGTH_REDUNDANT = LENGTH.SUCCESS_RESPONSE.GET_SOIL_MOISTURE.REDUNDANT;

    // get ready to read data
    if (bit === null) {
      data.moisture = new Uint8Array(LENGTH_MOISTURE);
      return;
    }

    if (data.i < LENGTH_MOISTURE) {
      data.moisture[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH_MOISTURE + LENGTH_REDUNDANT) {
      data.moisture = Bits.toNumber(data.moisture);
      events.emit('response', 'success', data.moisture);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDHT(bit) {
    const LENGTH_HUMIDITY = LENGTH.COMMON.DHT.HUMIDITY;
    const LENGTH_TEMPERATURE = LENGTH.COMMON.DHT.TEMPERATURE;
    const LENGTH_REDUNDANT = LENGTH.SUCCESS_RESPONSE.GET_DHT.REDUNDANT;

    // get ready to read data
    if (bit === null) {
      data.humidity = new Uint8Array(LENGTH_HUMIDITY);
      data.temperature = new Uint8Array(LENGTH_TEMPERATURE);
      return;
    }

    if (data.i < LENGTH_HUMIDITY) {
      data.humidity[data.i] = bit;
    } else {
      data.temperature[data.i - LENGTH_HUMIDITY] = bit;
    }
    data.i++;

    if (data.i === LENGTH_HUMIDITY + LENGTH_TEMPERATURE + LENGTH_REDUNDANT) {
      data.humidity = Bits.toNumber(data.humidity);
      data.temperature = Bits.toNumber(data.temperature) / 2 - 40;
      events.emit('response', 'success', data.humidity, data.temperature);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDS18B20(bit) {
    const LENGTH_TEMPERATURE = LENGTH.COMMON.DS18B20.TEMPERATURE;
    const LENGTH_REDUNDANT = LENGTH.SUCCESS_RESPONSE.GET_DS18B20.REDUNDANT;

    // get ready to read data
    if (bit === null) {
      data.temperature = new Uint8Array(LENGTH_TEMPERATURE);
      return;
    }

    if (data.i < LENGTH_TEMPERATURE) {
      data.temperature[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH_TEMPERATURE + LENGTH_REDUNDANT) {
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