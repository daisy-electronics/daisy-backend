const Bits = require('../services/board.service/protocol/bits');

function toBuffer(str) {
  const bits = str.split(/ |/).map(Number);
  const bytes = [];
  
  for (let i = 0, j = 0; i < bits.length / 8; i++, j += 8) {
    bytes[i] = bits.slice(j, j + 8);
  }

  if (bytes.length > 0) {
    const last = bytes[bytes.length - 1];
    if (last.length < 8) {
      for (let i = last.length; i < 8; i++) {
        last[i] = 0;
      }
    }
  }

  return Buffer.from(bytes.map(Bits.toNumber));
}

module.exports = {
  toBuffer
};