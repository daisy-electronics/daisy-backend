const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  function readError(constants, bit) {
    const LENGTH_ERROR = constants.ERROR;
    const LENGTH_REDUNDANT = constants.REDUNDANT;

    // get ready to read data
    if (bit === null) {
      data.error = new Uint8Array(LENGTH_ERROR);
      return;
    }

    if (data.i < LENGTH_ERROR) {
      data.error[data.i] = bit;
    }
    data.i++;

    if (data.i === LENGTH_ERROR + LENGTH_REDUNDANT) {
      data.error = Bits.toNumber(data.error);
      return true;
    }
  }

  function readSetRelay(bit) {
    if (readError(LENGTH.FAILURE_RESPONSE.SET_RELAY, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetRelay(bit) {
    if (readError(LENGTH.FAILURE_RESPONSE.GET_RELAY, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readToggleRelay(bit) {
    if (readError(LENGTH.FAILURE_RESPONSE.TOGGLE_RELAY, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetSoilMoisture(bit) {
    if (readError(LENGTH.FAILURE_RESPONSE.GET_SOIL_MOISTURE, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDHT(bit) {
    if (readError(LENGTH.FAILURE_RESPONSE.GET_DHT, bit)) {
      events.emit('response', 'failure', data.error);
      data.pendingRequest = null;
      data.state = STATE.IDLE;
    }
  }

  function readGetDS18B20(bit) {
    if (readError(LENGTH.FAILURE_RESPONSE.GET_DS18B20, bit)) {
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
