const { MoleculerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

/**
 * @param {Object} data
 * @param {Number} data.relayId
 * @param {Boolean|Number} data.state
 */
function encodeSetRelay(data) {
  const LENGTH_RELAY_ID = LENGTH.OUTBOUND_REQUEST.SET_RELAY.RELAY_ID;

  const { relayId, state } = data;
  return [...Bits.fromNumber(relayId, LENGTH_RELAY_ID), state ? 1 : 0];
}

/**
 * @param {Object} data
 * @param {Boolean|Number} data.state
 */
function encodeGetRelay(data) {
  const LENGTH_RELAY_ID = LENGTH.OUTBOUND_REQUEST.GET_RELAY.RELAY_ID;

  const { relayId } = data;
  return Bits.fromNumber(relayId, LENGTH_RELAY_ID);
}

function encodeToggleRelay(data) {
  const LENGTH_RELAY_ID = LENGTH.OUTBOUND_REQUEST.TOGGLE_RELAY.RELAY_ID;

  const { relayId } = data;
  return Bits.fromNumber(relayId, LENGTH_RELAY_ID);
}

function encodeGetSoilMoisture(data) {
  const LENGTH_SENSOR_ID = LENGTH.OUTBOUND_REQUEST.GET_SOIL_MOISTURE.SENSOR_ID;

  const { sensorId } = data;
  return Bits.fromNumber(sensorId, LENGTH_SENSOR_ID);
}

function encodeGetDHT(data) {
  const LENGTH_SENSOR_ID = LENGTH.OUTBOUND_REQUEST.GET_DHT.SENSOR_ID;

  const { sensorId } = data;
  return Bits.fromNumber(sensorId, LENGTH_SENSOR_ID);
}

function encodeGetDS18B20(data) {
  const LENGTH_SENSOR_ID = LENGTH.OUTBOUND_REQUEST.GET_DS18B20.SENSOR_ID;

  const { sensorId } = data;
  return Bits.fromNumber(sensorId, LENGTH_SENSOR_ID);
}

module.exports = function encodeRequest(subject, data) {
  const result = [...Bits.fromNumber(PACKET_TYPE.REQUEST, 2),
                  ...Bits.fromNumber(subject, 4)];

  if (subject === OUTBOUND_REQUEST.SET_RELAY) {
    result.push(...encodeSetRelay(data));
  } else if (subject === OUTBOUND_REQUEST.GET_RELAY) {
    result.push(...encodeGetRelay(data));
  } else if (subject === OUTBOUND_REQUEST.TOGGLE_RELAY) {
    result.push(...encodeToggleRelay(data));
  } else if (subject === OUTBOUND_REQUEST.GET_SOIL_MOISTURE) {
    result.push(...encodeGetSoilMoisture(data));
  } else if (subject === OUTBOUND_REQUEST.GET_DHT) {
    result.push(...encodeGetDHT(data));
  } else if (subject === OUTBOUND_REQUEST.GET_DS18B20) {
    result.push(...encodeGetDS18B20(data));
  } else {
    throw new MoleculerError('Invalid request subject.', null, 'ERR_INVALID_REQUEST_SUBJECT', { subject });
  }

  return Bits.toBuffer(result);
};
