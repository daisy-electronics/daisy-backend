'use strict';

module.exports = {
  id: 'garden',
  created() {
    this.state = this.state || {
      moisture0: 0,
      moisture1: 0,
      humidity0: 0,
      temperature0: 0,
      humidity1: 0,
      temperature1: 0,
      temperature2: 0
    };

    this.timeoutIds = [];

    const readMoisture = async () => {
      for (let sensorId = 0; sensorId < 2; sensorId++) {
        const moisture = await this.call('board.getSoilMoisture', { sensorId });
        this.state[`moisture${sensorId}`] = moisture;
        this.emit(`moisture${sensorId}`, moisture);
      }

      this.timeoutIds[0] = setTimeout(readMoisture, 1000);
    };
    readMoisture();

    //this.events.on('soil-moisture', ({ sensorId, moisture }) => {
    //  this.state[`moisture${sensorId}`] = moisture;
    //  this.emit(`moisture${sensorId}`, moisture);
    //});

    const readDHT = async () => {
      for (let sensorId = 0; sensorId < 2; sensorId++) {
        const { humidity, temperature } = await this.call('board.getDHT', { sensorId });
        this.state[`humidity${sensorId}`] = humidity;
        this.emit(`humidity${sensorId}`, humidity);

        this.state[`temperature${sensorId}`] = temperature;
        this.emit(`temperature${sensorId}`, temperature);
      }
      this.timeoutIds[0] = setTimeout(readDHT, 3000);
    };
    readDHT();

    //this.events.on('dht', ({ sensorId, humidity, temperature} ) => {
    //  this.state[`humidity${sensorId}`] = humidity;
    //  this.emit(`humidity${sensorId}`, humidity);

    //  this.state[`temperature${sensorId}`] = temperature;
    //  this.emit(`temperature${sensorId}`, temperature);
    //});

    const readDS18B20 = async () => {
      for (let sensorId = 0; sensorId < 1; sensorId++) {
        const temperature = await this.call('board.getDS18B20', { sensorId });

        this.state[`temperature${sensorId + 2}`] = temperature;
        this.emit(`temperature${sensorId + 2}`, temperature);
      }
      this.timeoutIds[0] = setTimeout(readDS18B20, 1000);
    };
    readDS18B20();

    //this.events.on('ds18b20', ({ sensorId, temperature }) => {
    //  this.state[`temperature${sensorId + 2}`] = temperature;
    //  this.emit(`temperature${sensorId + 2}`, temperature);
    //});
  },
  destroyed() {
    this.timeoutIds.forEach(clearInterval);
  },
  variables: {
    moisture0() {
      return this.state.moisture0;
    },
    moisture1() {
      return this.state.moisture1;
    },
    humidity0() {
      return this.state.humidity0;
    },
    temperature0() {
      return this.state.temperature0;
    },
    humidity1() {
      return this.state.humidity1;
    },
    temperature1() {
      return this.state.temperature1;
    },
    temperature2() {
      return this.state.temperature2;
    },
    lamp() {
      return this.getLamp();
    },
    ventilation() {
      return this.getVentilation();
    }
  },
  actions: {
    async toggleLamp() {
      await this.call('board.toggleRelay', { relayId: 7 });
      this.emit('lamp', await this.getLamp());
    },
    async toggleVentilation(state) {
      await this.call('board.toggleRelay', { relayId: 5 });
      await this.call('board.toggleRelay', { relayId: 6 });
      this.emit('ventilation', await this.getVentilation());
    }
  },
  methods: {
    getLamp() {
      return this.call('board.getRelay', { relayId: 7 });
    },
    getVentilation() {
      return this.call('board.getRelay', { relayId: 6 });
    }
  }
};
