'use strict';

const { MoleculerServerError } = require('moleculer').Errors;

const PACKET_MAX_LENGTH = 48 - 1; // this 1 is the terminating '\0' from C
const REQUEST_ID_MAX_LENGTH = 8;
const SUBJECT_MAX_LENGTH = 16;
const MESSAGE_MAX_LENGTH = PACKET_MAX_LENGTH - REQUEST_ID_MAX_LENGTH - SUBJECT_MAX_LENGTH - 1 - 1;

const EVENT = 0;
const REQUEST = 1;
const SUCCESS_RESPONSE = 2;
const FAILURE_RESPONSE = 3;
const INVALID = 9;

const EVENT_ERROR = '0';
const EVENT_WARNING = '1';
const EVENT_SOIL_MOISTURE = '2';
const EVENT_DHT = '3';
const EVENT_DS18B20 = '4';

const ERROR_MESSAGE_TOO_LONG = 0;
const ERROR_INVALID_RELAY_ID = 1;
const ERROR_INVALID_SOIL_MOISTURE_SENSOR_ID = 2;
const ERROR_INVALID_DHT_SENSOR_ID = 3;
const ERROR_READ_DHT_SENSOR = 4;
const ERROR_INVALID_DS18B20_SENSOR_ID = 5;

const REQUEST_SET_RELAY = '0';
const REQUEST_SOIL_MOISTURE = '1';
const REQUEST_GET_RELAY = '2';
const REQUEST_TOGGLE_RELAY = '3';
const REQUEST_READ_DHT = '4';
const REQUEST_READ_DS18B20 = '5';

function parsePacket(str) {
  if (str[0] === `${EVENT}`) {
    const res = str.match(
      new RegExp(`^${EVENT}(.+?)(\\|(.*))?$`)
    );
    if (!res) {
      return { type: INVALID, reason: 'invalid packet' };
    }
    const [, subject,, message] = res;

    return {
      type: EVENT,
      subject,
      message
    };
  } else if (str[0] === `${REQUEST}`) {
    const res = str.match(
      new RegExp(`^${REQUEST}(\\d+)\\|(.+?)(\\|(.*))?$`)
    );
    if (!res) {
      return { type: INVALID, reason: 'invalid packet' };
    }
    const [, requestId, subject,, message] = res;

    return {
      type: REQUEST,
      requestId: Number(requestId),
      subject,
      message
    };
  } else if (str[0] === `${SUCCESS_RESPONSE}`) {
    const res = str.match(
      new RegExp(`^${SUCCESS_RESPONSE}(\\d+)(\\|(.*))?$`)
    );
    if (!res) {
      return { type: INVALID, reason: 'invalid packet' };
    }
    const [, requestId,, message] = res;

    return {
      type: SUCCESS_RESPONSE,
      requestId: Number(requestId),
      message
    };
  } else if (str[0] === `${FAILURE_RESPONSE}`) {
    const res = str.match(
      new RegExp(`^${FAILURE_RESPONSE}(\\d+)(\\|(.*))?$`)
    );
    if (!res) {
      return { type: INVALID, reason: 'invalid packet' };
    }
    const [, requestId,, message] = res;

    return {
      type: FAILURE_RESPONSE,
      requestId: Number(requestId),
      message
    };
  } else {
    return { type: INVALID, reason: 'invalid type' };
  }
}

function createEvent(subject, message = undefined) {
  return `${EVENT}${subject}${message ? '|'+message : ''}`;
}

function createRequest(requestId, subject, message = undefined) {
  return `${REQUEST}${requestId}|${subject}${message ? '|'+message : ''}`;
}

function createSuccessResponse(requestId, message = undefined) {
  return `${SUCCESS_RESPONSE}${requestId}${message ? '|'+message : ''}`;
}

function createFailureResponse(requestId, message = undefined) {
  return `${FAILURE_RESPONSE}${requestId}${message ? '|'+message : ''}`;
}

module.exports = {
  parsePacket,
  createEvent,
  createRequest,
  createSuccessResponse,
  createFailureResponse,

  EVENT, REQUEST, SUCCESS_RESPONSE, FAILURE_RESPONSE, INVALID,
  PACKET_MAX_LENGTH, REQUEST_ID_MAX_LENGTH, SUBJECT_MAX_LENGTH, MESSAGE_MAX_LENGTH,
  EVENT_ERROR, EVENT_WARNING, EVENT_SOIL_MOISTURE, EVENT_DHT, EVENT_DS18B20,
  ERROR_MESSAGE_TOO_LONG, ERROR_INVALID_RELAY_ID, ERROR_INVALID_SOIL_MOISTURE_SENSOR_ID, ERROR_INVALID_DHT_SENSOR_ID, ERROR_READ_DHT_SENSOR, ERROR_INVALID_DS18B20_SENSOR_ID,
  REQUEST_SET_RELAY, REQUEST_SOIL_MOISTURE, REQUEST_GET_RELAY, REQUEST_TOGGLE_RELAY, REQUEST_READ_DHT, REQUEST_READ_DS18B20
};
