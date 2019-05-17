/**
 * @param {Buffer} buffer
 * @return {Uint8Array}
 */
function fromBuffer(buffer) {
  const result = new Uint8Array(buffer.byteLength * 8);
  const byteArray = new Uint8Array(buffer);

  for (let i = 0; i < byteArray.length; i++) {
    const byte = byteArray[i];

    for (let j = 0, mask = 0b10000000; j < 8; j++, mask /= 2) {
      result[8 * i + j] = byte & mask ? 1 : 0;
    }
  }
  
  return result;
}

/**
 * @param {Number} num
 * @param {?Number} size
 * @return {Uint8Array}
 */
function fromNumber(num, size = 8) {
  const result = new Uint8Array(size);

  for (let i = 0, mask = 0b1; i < size; i++, mask *= 2) {
    result[size - i - 1] = num & mask ? 1 : 0;
  }

  return result;
}

/**
 * @param {Uint8Array} bits
 * @return {Number}
 */
function toNumber(bits) {
  let result = 0;
  for (let i = bits.length - 1, k = 1; i >= 0; i--, k *= 2) {
    result += bits[i] * k;
  }
  
  return result;
}

module.exports = {
  fromBuffer,
  fromNumber,
  toNumber
};