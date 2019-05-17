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
 * @param {Uint8Array} bits
 * @return {Buffer}
 */
function toBuffer(bits) {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0, j = 0; j < Math.floor(bits.length / 8); i += 8, j++) {
    bytes[j] = bits[i] * 128 + bits[i + 1] * 64 + bits[i + 2] * 32 + bits[i + 3] * 16
      + bits[i + 4] * 8 + bits[i + 5] * 4 + bits[i + 6] * 2 + bits[i + 7];
  }

  if (bits.length % 8 !== 0) {
    let byte = 0;
    for (let i = bits.length - bits.length % 8, k = 128; i < bits.length; i++, k /= 2) {
      byte += bits[i] * k;
    }
    bytes[bytes.length - 1] = byte;
  }

  return Buffer.from(bytes);
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
  toBuffer,
  fromNumber,
  toNumber
};
