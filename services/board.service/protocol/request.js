const { MoleculerServerError } = require('moleculer').Errors;
const Bits = require('./bits');
const { STATE, LENGTH, ERROR, PACKET_TYPE, INBOUND_EVENT, INBOUND_EVENT_NAME,
  OUTBOUND_EVENT, OUTBOUND_REQUEST } = require('./constants');

module.exports = function (data, events) {
  return function (bit) {
    throw new MoleculerServerError('Requests from the board are not supported.', null,
      'ERR_REQUEST_FROM_BOARD_NOT_SUPPORTED');
  };
};
