module.exports = {
  id: 'garden',
  created() {
    this.state = this.state || { moisture0: 0, moisture1: 0 };
    this.timeoutId = null;
    setTimeout(() => this.update(), 1000);
  },
  destroyed() {
    clearTimeout(this.timeoutId);
  },
  variables: {
    moisture0() {
      return this.state.moisture0;
    },
    moisture1() {
      return this.state.moisture1;
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
    },
    async update() {
      this.state.moisture0 = await this.call('board.getSoilMoisture', { sensorId: '0' });
      this.state.moisture1 = await this.call('board.getSoilMoisture', { sensorId: '1' });
      this.emit('moisture0', this.state.moisture0);
      this.emit('moisture1', this.state.moisture1);

      this.timeoutId = setTimeout(() => this.update(), 1000);
    }
  }
};
