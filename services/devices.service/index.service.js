'use strict';

const RService = require('@kothique/moleculer-rethinkdbdash');
const { MoleculerClientError, MoleculerServerError } = require('moleculer').Errors;

const TYPES = require('./types');

module.exports = {
  name: 'devices',
  mixins: [RService],
  rOptions: {
    db: 'daisy'
  },
  rInitial: {
    daisy: {
      devices: {
        $default: true
      }
    }
  },
  created() {
    this.drivers = {};
  },
  async stopped() {
    await Promise.all(Object.entries(this.devices).map(async ([id, driver]) => {
      await this.rTable.get(id).update({ state: driver.state });
      driver.dispose();
      this.logger.info('Driver disposed of.', { deviceId: id, state: driver.state })
    }));
  },
  async rOnReady() {
    const cursor = await this.rTable.changes({ includeTypes: true });
    cursor.each(async (error, change) => {
      if (error) {
        this.logger.warn(`Error while listening to changes in the 'devices' table.`, { error });
        return;
      }

      if (change.type === 'add') {
        await this.broker.call('gateway.app.broadcast', {
          subject: 'device.add',
          data: { device: change.new_val }
        });
        this.broker.emit('device.add', { device: change.new_val });
      } else if (change.type === 'remove') {
        await this.broker.call('gateway.app.broadcast', {
          subject: 'device.remove',
          data: { device: change.old_val }
        });
        this.broker.emit('device.remove', { device: change.old_val });
      }
    });

    const devices = await this.rTable;
    devices.forEach(device => this.createDriver(device));
  },
  actions: {
    list: {
      visibility: 'published',
      async handler(ctx) {
        const devices = await this.rTable;
        return devices;
      }
    },
    get: {
      params: {
        deviceId: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { deviceId } = ctx.params;

        const device = await this.getDevice(deviceId);
        return device;
      }
    },
    getVariable: {
      params: {
        deviceId: 'string',
        variable: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { deviceId, variable: variableName } = ctx.params;

        const device = await this.getDevice(deviceId);
        const type = this.getDeviceType(device);

        if (type.variables.findIndex(variable => variable.name === variableName) === -1) {
          throw new MoleculerClientError('Invalid variable.', null, 'ERR_INVALID_VARIABLE', { deviceId, variable: variableName });
        }

        throw new Error('Not implemented.');
      }
    },
    dispatchAction: {
      params: {
        deviceId: 'string',
        action: 'string',
        data: { type: 'any', optional: true }
      },
      visibility: 'published',
      async handler(ctx) {
        const { deviceId, action: actionName, data } = ctx.params;

        const device = await this.getDevice(deviceId);
        const type = this.getDeviceType(device);

        if (type.actions.findIndex(action => action.name === actionName) === -1) {
          throw new MoleculerClientError('Invalid action.', null, 'ERR_INVALID_ACTION', { deviceId, action: actionName });
        }

        throw new Error('Not implemented.');
      }
    }
  },
  methods: {
    async getDevice(deviceId) {
      const device = await this.rTable.get(deviceId);
      if (!device) {
        throw new MoleculerClientError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND', { deviceId });
      }

      return device;
    },
    getDeviceType(device) {
      const type = TYPES[device.type];
      if (!type) {
        throw new MoleculerServerError('Invalid device type.', 500, 'ERR_INVALID_DEVICE_TYPE', { deviceId: device.id, type });
      }

      return type;
    },
    createDriver(device) {
      const { id, data, state } = device;

      const type = this.getDeviceType(device);
      const driver = new type.class({
        id,
        state,
        getDevice: async deviceId => {
          const device = await this.rTable.get(deviceId);
          if (!device) {
            throw new MoleculerServerError('Device not found.', 500, 'ERR_DEVICE_NOT_FOUND', { deviceId });
          }

          return device;
        },
      }, data);
      this.logger.info('Driver created.', { deviceId: id, type: device.type });

      driver.variables.forEach(variable => driver.on(variable, async value => {
        await this.rTable.get(id).update({
          state: this.r.row('state').merge({ [variable]: value })
        });
        this.broker.emit('device.state-change', { deviceId: id, variable, value });
      }));

      this.drivers[id] = driver;
    }
  }
};
