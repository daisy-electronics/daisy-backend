'use strict';

module.exports = {
  name: 'publisher',
  created() {
    this.subscribers = {};
  },
  events: {
    async 'device.state-change'({ deviceId, variable, value }) {
      await Promise.all(Object.keys(this.subscribers).map(async socketId => {
        const { socket, subscriptions } = this.subscribers[socketId];
        if (!socket.$meta.authenticated) {
          return;
        }

        if (`${deviceId}/${variable}` in subscriptions) {
          await this.broker.call('gateway.app.emit', {
            socketId,
            subject: 'device-state-change',
            data: { deviceId, variable, value }
          });
        }
      }));
    },
    'socket.app.connect'({ socket }) {
      this.subscribers[socket.id] = { socket, subscriptions: {} };
    },
    'socket.app.disconnect'({ socket }) {
      delete this.subscribers[socket.id];
    }
  },
  actions: {
    subscribe: {
      params: {
        paths: { type: 'array', items: 'string' }
      },
      visibility: 'published',
      handler(ctx) {
        const { paths } = ctx.params;

        const { socket, subscriptions } = this.getSubscriberInfo(ctx.meta.socket.id);
        paths.forEach(path => subscriptions[path] = true);
      }
    },
    unsubscribe: {
      params: {
        paths: { type: 'array', items: 'string' }
      },
      visibility: 'published',
      handler(ctx) {
        const { paths } = ctx.params;

        const { socket, subscriptions } = this.getSubscriberInfo(ctx.meta.socket.id);
        paths.forEach(path => { delete subscriptions[path]; });
      }
    }
  },
  methods: {
    getSubscriberInfo(socketId) {
      return this.subscribers[socketId] || (this.subscribers[socketId] = {});
    }
  }
};
