'use strict';

module.exports = {
  name: 'admin',
  actions: {
    shutdown: {
      visibility: 'published',
      handler(ctx) {
        ctx.broker._closeFn();
      }
    },
    shutdownAPIGateway: {
      visibility: 'published',
      async handler(ctx) {
        const gateway = await ctx.broker.getLocalService('gateway');
        if (gateway) {
          await ctx.broker.destroyService(gateway);
        }
      }
    }
  }
};
