const EventEmitter = require('events');
const { MoleculerError, MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

const mapEventSubjectToNumber = {
};

const mapRequestSubjectToNumber = {
  setRelay: OUTBOUND_REQUEST.SET_RELAY,
  getRelay: OUTBOUND_REQUEST.GET_RELAY,
  toggleRelay: OUTBOUND_REQUEST.TOGGLE_RELAY,
  getSoilMoisture: OUTBOUND_REQUEST.GET_SOIL_MOISTURE,
  getDHT: OUTBOUND_REQUEST.GET_DHT,
  getDS18B20: OUTBOUND_REQUEST.GET_DS18B20
};

const mapErrorNumberToString = {
  [OUTBOUND_REQUEST.SET_RELAY]: {
    [ERROR.SET_RELAY.INVALID_RELAY_ID]: 'Invalid relay ID.'
  },
  [OUTBOUND_REQUEST.GET_RELAY]: {
    [ERROR.GET_RELAY.INVALID_RELAY_ID]: 'Invalid relay ID.'
  },
  [OUTBOUND_REQUEST.TOGGLE_RELAY]: {
    [ERROR.TOGGLE_RELAY.INVALID_RELAY_ID]: 'Invalid relay ID.'
  },
  [OUTBOUND_REQUEST.GET_SOIL_MOISTURE]: {
    [ERROR.GET_SOIL_MOISTURE.INVALID_SENSOR_ID]: 'Invalid sensor ID.'
  },
  [OUTBOUND_REQUEST.GET_DHT]: {
    [ERROR.GET_DHT.INVALID_SENSOR_ID]: 'Invalid sensor ID.'
  },
  [OUTBOUND_REQUEST.GET_DS18B20]: {
    [ERROR.GET_DS18B20.INVALID_SENSOR_ID]: 'Invalid sensor ID.'
  }
};

const events = new EventEmitter;

const requestQueue = [];
let sendingRequest = false;

let data = {
  state: STATE.IDLE,
  pendingRequest: null
};

function _testSetPendingRequest(value) {
  data.pendingRequest = value;
}

function _testClear() {
  events.removeAllListeners();
  for (const member in data) {
    delete data[member];
  }
  data.state = STATE.IDLE;
  data.pendingRequest = null;
}

const readEventData = require('./read-event')(data, events);
const readRequestData = require('./read-request')(data, events);
const readSuccessResponseData = require('./read-success-response')(data, events);
const readFailureResponseData = require('./read-failure-response')(data, events);

const encodeRequest = require('./encode-request');

function put(buffer) {
  [...buffer].map(byte => Bits.fromNumber(byte))
    .forEach(byte => {
      if (data.state === STATE.REDUNDANT_BITS_SKIPPING) {
        // new byte started so there were no redundant bits
        data.state = STATE.IDLE;
      }

      for (const bit of byte) {
        switch (data.state) {
        case STATE.IDLE:
        case STATE.PACKET_TYPE_READING:
          readPacketType(bit);
          break;

        case STATE.SUBJECT_READING:
          readSubject(bit);
          break;

        case STATE.EVENT_DATA_READING:
          readEventData(bit);
          break;

        case STATE.SUCCESS_RESPONSE_DATA_READING:
          readSuccessResponseData(bit);
          break;

        case STATE.FAILURE_RESPONSE_DATA_READING:
          readFailureResponseData(bit);
          break;

        case STATE.REDUNDANT_BITS_SKIPPING:
          data.state = STATE.IDLE;
          return;
        }
      }
    });
}

function readPacketType(bit) {
  if (data.state === STATE.IDLE) {
    data.state = STATE.PACKET_TYPE_READING;
    data.packetType = new Uint8Array(LENGTH.PACKET_TYPE);
    data.packetType[0] = bit;
  } else {
    data.packetType[1] = bit;
    data.packetType = Bits.toNumber(data.packetType);
    data.i = 0;
    if (data.packetType === PACKET_TYPE.EVENT || data.packetType === PACKET_TYPE.REQUEST) {
      data.subject = new Uint8Array(LENGTH.SUBJECT);
      data.state = STATE.SUBJECT_READING;
    } else if (data.packetType === PACKET_TYPE.SUCCESS_RESPONSE) {
      data.state = STATE.SUCCESS_RESPONSE_DATA_READING;
      readSuccessResponseData(null); // null because we don't know if we'll get any data from this particular response
    } else if (data.packetType === PACKET_TYPE.FAILURE_RESPONSE) {
      data.state = STATE.FAILURE_RESPONSE_DATA_READING;
      readFailureResponseData(null); // null because we don't know if we'll get any data from this particular response
    } else {
      throw new MoleculerServerError('Invalid packet type.', null, 'ERR_INVALID_PACKET_TYPE', { packetType });
    }
  }
}

function readSubject(bit) {
  data.subject[data.i] = bit;
  data.i++;

  if (data.i === LENGTH.SUBJECT) {
    data.subject = Bits.toNumber(data.subject);
    data.i = 0;
    if (data.packetType === PACKET_TYPE.EVENT) {
      data.state = STATE.EVENT_DATA_READING;
      readEventData(null); // null because we don't know if we'll get any data from this particular event
    } else if (data.packetType === PACKET_TYPE.REQUEST) {
      data.state = STATE.REQUEST_DATA_READING;
      readRequestData(null); // null because we don't know if we'll get any data from this particular request
    }
  }
}

/**
 * @param {Number} subject
 * @param {Object} data
 */
function emitEvent(subject, data) {
  // none
}

/**
 * @param {WriteStream} port
 * @param {Number} subject
 * @param {Object} data
 * @return {Promise}
 */
function sendRequest(port, subjectName, data) {
  const subject = mapRequestSubjectToNumber[subjectName];
  if (typeof subject === 'undefined') {
    throw new MoleculerError('Invalid request subject.', null, 'ERR_INVALID_REQUEST_SUBJECT', { subjectName });
  }

  return new Promise((resolve, reject) => {
    const packet = encodeRequest(subject, data);
    requestQueue.push({ subject, packet, resolve, reject });
    emptyRequestQueue(port);
  });
}

function emptyRequestQueue(port) {
  if (sendingRequest || !requestQueue.length) { return; }
  sendingRequest = true;

  const { subject, packet, resolve, reject } = requestQueue.shift();
  data.pendingRequest = subject;

  events.once('response', (status, ...args) => {
    if (status === 'success') {
      if (args.length === 0) {
        resolve();
      } else if (args.length === 1) {
        resolve(args[0]);
      } else {
        resolve(args);
      }
    } else if (status === 'failure') {
      reject(new Error(mapErrorNumberToString[subject][args[0]]));
    }
    sendingRequest = false;
    setImmediate(() => emptyRequestQueue(port));
  });
  port.write(packet);
}

module.exports = {
  put, emitEvent, sendRequest,
  events,

  _testSetPendingRequest,
  _testClear
};
