module.exports = {
  id: 'test',
  created() {
    this.state = this.state || { temperature: 0 };
    this.intervalId = setInterval(() => {
      this.state.temperature = Math.floor(Math.random() * 30);
      this.emit('temperature', this.state.temperature);
    }, 1000);
  },
  destroyed() {
    console.log('well well');
    clearInterval(this.intervalId);
  },
  variables: {
    temperature() {
      return this.getTemp();
    }
  },
  methods: {
    getTemp() {
      this.logger.info('BOOM!')
      return this.state.temperature;
    }
  }
};
