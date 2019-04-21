'use strict';

const Datastore = require('nedb-promises');
const fs = require('fs');
const { MoleculerClientError, MoleculerServerError } = require('moleculer').Errors;

const config = require('../../common/config');

const TYPES = require('./types');

module.exports = {
  name: 'devices',
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
  async created() {
    this.drivers = {};
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data');
    }
    this.store = Datastore.create('./data/devices.nedb');

    await Promise.all((await this.store.find()).map(async device => {
      if (!config.devices[device._id]) {
        await this.store.remove({ _id: device._id });
        this.logger.warn(`Device removed: ${device._id}`, device);

        await this.broker.call('gateway.app.broadcast', {
          subject: 'device.remove',
          data: { device }
        });
        this.broker.emit('device.remove', { device });
      }
    }));

    await Promise.all(Object.entries(config.devices).map(async ([id, deviceInfo]) => {
      const device = await this.store.findOne({ _id: id });
      deviceInfo = { ...deviceInfo };
      delete deviceInfo.state;
      if (device) {
        await this.store.update({ _id: id }, { $set: deviceInfo });
        this.logger.debug(`Device updated: ${id}.`, deviceInfo);
      } else {
        const doc = await this.store.insert({
          _id: id,
          state: {},
          ...deviceInfo
        });
        this.logger.info(`New device created: ${id}`, deviceInfo);

        await this.broker.call('gateway.app.broadcast', {
          subject: 'device.add',
          data: { device: doc }
        });
        this.broker.emit('device.add', { device: doc });
      }
    }));

    (await this.store.find()).forEach(device => this.createDriver(device));
  },
  async stopped() {
    await Promise.all(Object.entries(this.drivers).map(async ([id, driver]) => {
      await this.store.update({ _id: id }, { $set: { state: driver.state } });
      driver.dispose();
      this.logger.info('Driver disposed of.', { deviceId: id, state: driver.state })
    }));
  },
  actions: {
    list: {
      visibility: 'published',
      async handler(ctx) {
        const devices = await this.store.find();
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

        const driver = this.drivers[deviceId];
        return driver.get(variableName);
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

        const driver = this.drivers[deviceId];
        return driver.dispatch(actionName, data);
      }
    }
  },
  methods: {
    async getDevice(deviceId) {
      const device = await this.store.findOne({ _id: deviceId });
      if (!device) {
        throw new MoleculerClientError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND', { deviceId });
      }

      return device;
    },
    getDeviceType(device) {
      const type = TYPES[device.type];
      if (!type) {
        throw new MoleculerServerError('Invalid device type.', 500, 'ERR_INVALID_DEVICE_TYPE', { deviceId: device._id, type });
      }

      return type;
    },
    createDriver(device) {
      const { _id, data, state } = device;

      const type = this.getDeviceType(device);
      const driver = new type.class({
        id: _id,
        state,
        getDevice: async deviceId => {
          const device = await this.store.findOne({ _id: deviceId });
          if (!device) {
            throw new MoleculerServerError('Device not found.', 500, 'ERR_DEVICE_NOT_FOUND', { deviceId });
          }

          return device;
        },
      }, data);
      this.logger.info('Driver instantiated.', { deviceId: _id, type: device.type });

      driver.variables.forEach(variable => driver.on(variable, async value => {
        await this.store.update({ _id }, {
          $set: { [`state.${variable}`]: value }
        });
        this.broker.emit('device.state-change', { deviceId: _id, variable, value });
      }));

      this.drivers[_id] = driver;
    }
  }
};
