const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  function readError(length, bit) {
    // get ready to read data
    if (bit === null) {
      data.error = new Uint8Array(length);
      return;
    }

    if (data.i < length) {
      data.error[data.i] = bit;
    }
    data.i++;

    if (data.i === length) {
      data.error = Bits.toNumber(data.error);
      return true;
    }
  }

  function readSetRelay(bit) {
    if (readError(LENGTH.SET_RELAY.ERROR, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetRelay(bit) {
    if (readError(LENGTH.GET_RELAY.ERROR, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readToggleRelay(bit) {
    if (readError(LENGTH.TOGGLE_RELAY.ERROR, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetSoilMoisture(bit) {
    if (readError(LENGTH.GET_SOIL_MOISTURE.ERROR, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDHT(bit) {
    if (readError(LENGTH.GET_DHT.ERROR, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDS18B20(bit) {
    if (readError(LENGTH.GET_DS18B20.ERROR, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  return function readFailureResponseData(bit) {
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
