const STATE = {
  IDLE: 0,
  PACKET_TYPE_READING: 1,
  SUBJECT_READING: 2,
  EVENT_DATA_READING: 3,
  REQUEST_DATA_READING: 4,
  SUCCESS_RESPONSE_DATA_READING: 5,
  FAILURE_RESPONSE_DATA_READING: 6
};

const LENGTH = {
  PACKET_TYPE: 2,
  SUBJECT: 4,
  COMMON: {
    SOIL_MOISTURE: {
      MOISTURE: 7
    },
    DHT: {
      HUMIDITY: 7,
      TEMPERATURE: 8
    },
    DS18B20: {
      TEMPERATURE: 9
    }
  },
  INBOUND_EVENT: {
    SOIL_MOISTURE: {
      SENSOR_ID: 4,
      REDUNDANT: 'to be calculated'
    },
    DHT: {
      SENSOR_ID: 3,
      REDUNDANT: 'to be calculated'
    },
    DS18B20: {
      SENSOR_ID: 3,
      REDUNDANT: 'to be calculated'
    }
  },
  OUTBOUND_EVENT: {
  },
  OUTBOUND_REQUEST: {
    SET_RELAY: {
      RELAY_ID: 3
    },
    GET_RELAY: {
      RELAY_ID: 3
    },
    TOGGLE_RELAY: {
      RELAY_ID: 3
    },
    GET_SOIL_MOISTURE: {
      SENSOR_ID: 4
    },
    GET_DHT: {
      SENSOR_ID: 3
    },
    GET_DS18B20: {
      SENSOR_ID: 3
    }
  },
  SUCCESS_RESPONSE: {
    SET_RELAY: {
      REDUNDANT: 'to be calculated'
    },
    GET_RELAY: {
      REDUNDANT: 'to be calculated'
    },
    TOGGLE_RELAY: {
      REDUNDANT: 'to be calculated'
    },
    GET_SOIL_MOISTURE: {
      REDUNDANT: 'to be calculated'
    },
    GET_DHT: {
      REDUNDANT: 'to be calculated'
    },
    GET_DS18B20: {
      REDUNDANT: 'to be calculated'
    }
  },
  FAILURE_RESPONSE: {
    SET_RELAY: {
      ERROR: 1,
      REDUNDANT: 'to be calculated'
    },
    GET_RELAY: {
      ERROR: 1,
      REDUNDANT: 'to be calculated'
    },
    TOGGLE_RELAY: {
      ERROR: 1,
      REDUNDANT: 'to be calculated'
    },
    GET_SOIL_MOISTURE: {
      ERROR: 1,
      REDUNDANT: 'to be calculated'
    },
    GET_DHT: {
      ERROR: 1,
      REDUNDANT: 'to be calculated'
    },
    GET_DS18B20: {
      ERROR: 1,
      REDUNDANT: 'to be calculated'
    }
  }
};

//
// CALCULATING REDUNDANT BITS
//

LENGTH.INBOUND_EVENT.SOIL_MOISTURE.REDUNDANT = (LENGTH.PACKET_TYPE + LENGTH.SUBJECT
  + LENGTH.INBOUND_EVENT.SOIL_MOISTURE.SENSOR_ID + LENGTH.COMMON.SOIL_MOISTURE.MOISTURE) % 8;

LENGTH.INBOUND_EVENT.DHT.REDUNDANT = (LENGTH.PACKET_TYPE + LENGTH.SUBJECT
  + LENGTH.INBOUND_EVENT.DHT.SENSOR_ID + LENGTH.COMMON.DHT.HUMIDITY + LENGTH.COMMON.DHT.TEMPERATURE) % 8;

LENGTH.INBOUND_EVENT.DS18B20.REDUNDANT = (LENGTH.PACKET_TYPE + LENGTH.SUBJECT
  + LENGTH.INBOUND_EVENT.DS18B20.SENSOR_ID + LENGTH.COMMON.DS18B20.TEMPERATURE) % 8;

LENGTH.SUCCESS_RESPONSE.SET_RELAY.REDUNDANT = (LENGTH.PACKET_TYPE) % 8;

LENGTH.SUCCESS_RESPONSE.GET_RELAY.REDUNDANT = (LENGTH.PACKET_TYPE) % 8;

LENGTH.SUCCESS_RESPONSE.TOGGLE_RELAY.REDUNDANT = (LENGTH.PACKET_TYPE) % 8;

LENGTH.SUCCESS_RESPONSE.GET_SOIL_MOISTURE.REDUNDANT = (LENGTH.PACKET_TYPE
  + LENGTH.COMMON.SOIL_MOISTURE.MOISTURE) % 8;

LENGTH.SUCCESS_RESPONSE.GET_DHT.REDUNDANT = (LENGTH.PACKET_TYPE
  + LENGTH.COMMON.DHT.HUMIDITY + LENGTH.COMMON.DHT.TEMPERATURE) % 8;

LENGTH.SUCCESS_RESPONSE.GET_DS18B20.REDUNDANT = (LENGTH.PACKET_TYPE) % 8;

LENGTH.FAILURE_RESPONSE.SET_RELAY.REDUNDANT = (LENGTH.PACKET_TYPE
  + LENGTH.FAILURE_RESPONSE.SET_RELAY.ERROR) % 8;

LENGTH.FAILURE_RESPONSE.GET_RELAY.REDUNDANT = (LENGTH.PACKET_TYPE
 + LENGTH.FAILURE_RESPONSE.GET_RELAY.ERROR) % 8;

LENGTH.FAILURE_RESPONSE.TOGGLE_RELAY.REDUNDANT = (LENGTH.PACKET_TYPE
  + LENGTH.FAILURE_RESPONSE.TOGGLE_RELAY.ERROR) % 8;

LENGTH.FAILURE_RESPONSE.GET_SOIL_MOISTURE.REDUNDANT = (LENGTH.PACKET_TYPE
  + LENGTH.FAILURE_RESPONSE.GET_SOIL_MOISTURE.ERROR ) % 8;

LENGTH.FAILURE_RESPONSE.GET_DHT.REDUNDANT = (LENGTH.PACKET_TYPE
  + LENGTH.FAILURE_RESPONSE.GET_DHT.ERROR) % 8;

LENGTH.FAILURE_RESPONSE.GET_DS18B20.REDUNDANT = (LENGTH.PACKET_TYPE
  + LENGTH.FAILURE_RESPONSE.GET_DS18B20.ERROR) % 8;

//
// END OF CALCULATING REDUNDANT BITS
//

const ERROR = {
  SET_RELAY: {
    INVALID_RELAY_ID: 0
  },
  GET_RELAY: {
    INVALID_RELAY_ID: 0
  },
  TOGGLE_RELAY: {
    INVALID_RELAY_ID: 0
  },
  GET_SOIL_MOISTURE: {
    INVALID_SENSOR_ID: 0
  },
  GET_DHT: {
    INVALID_SENSOR_ID: 0
  },
  GET_DS18B20: {
    INVALID_SENSOR_ID: 0
  }
};

const PACKET_TYPE = {
  EVENT: 0b00,
  REQUEST: 0b01,
  SUCCESS_RESPONSE: 0b10,
  FAILURE_RESPONSE: 0b11
};

const INBOUND_EVENT = {
  SOIL_MOISTURE: 0b0000,
  DHT: 0b0001,
  DS18B20: 0b0010
};

const INBOUND_EVENT_NAME = {
  SOIL_MOISTURE: 'soil-moisture',
  DHT: 'dht',
  DS18B20: 'ds18b20'
};

const OUTBOUND_EVENT = {
};

const OUTBOUND_REQUEST = {
  SET_RELAY: 0b0000,
  GET_RELAY: 0b0001,
  TOGGLE_RELAY: 0b0010,
  GET_SOIL_MOISTURE: 0b0011,
  GET_DHT: 0b0100,
  GET_DS18B20: 0b0101
};

module.exports = {
  STATE,
  LENGTH,
  ERROR,
  PACKET_TYPE,
  INBOUND_EVENT,
  INBOUND_EVENT_NAME,
  OUTBOUND_EVENT,
  OUTBOUND_REQUEST
};
