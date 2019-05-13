module.exports = {
  id: 'garden',
  created() {
    this.state = this.state || {
      moisture0: 0,
      moisture1: 0,
      humidity0: 0,
      temperature0: 0,
      humidity1: 0,
      temperature1: 0
    };

    this.events.on('soil-moisture', ({ sensorId, moisture }) => {
      this.state[`moisture${sensorId}`] = moisture;
      this.emit(`moisture${sensorId}`, moisture);
    });

    this.events.on('dht', ({ sensorId, humidity, temperature }) => {
      this.state[`humidity${sensorId}`] = humidity;
      this.emit(`humidity${sensorId}`, humidity);

      this.state[`temperature${sensorId}`] = temperature;
      this.emit(`temperature${sensorId}`, temperature);
    });
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
    lamp() {
      return this.getLamp();
    },
    ventilation() {
      return this.getVentilation();
    }
  },
  actions: {
    async toggleLamp() {
      await this.call('board.toggleRelay', { relayId: '7' });
      this.emit('lamp', await this.getLamp());
    },
    async toggleVentilation(state) {
      await this.call('board.toggleRelay', { relayId: '5' });
      await this.call('board.toggleRelay', { relayId: '6' });
      this.emit('ventilation', await this.getVentilation());
    }
  },
  methods: {
    getLamp() {
      return this.call('board.getRelay', { relayId: '7' });
    },
    getVentilation() {
      return this.call('board.getRelay', { relayId: '6' });
    }
  }
};
