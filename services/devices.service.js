'use strict';

const RService = require('@kothique/moleculer-rethinkdbdash');
const { MoleculerClientError } = require('moleculer').Errors;

module.exports = {
  name: 'devices',
  mixins: [RService],
  rOptions: {
    db: 'daisy'
  },
  rInitial: {
    daisy: {
      devices: {
        $default: true,
        $options: {
          primaryKey: 'deviceId'
        }
      }
    }
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
          subject: 'device-add',
          data: { device: change.new_val }
        });
        this.broker.emit('device.add', { device: change.new_val });
      } else if (change.type === 'remove') {
        await this.broker.call('gateway.app.broadcast', {
          subject: 'device-remove',
          data: { device: change.old_val }
        });
        this.broker.emit('device.remove', { device: change.old_val });
      }
    });
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

        const device = await this.rTable.get(deviceId);
        if (!device) {
          throw new MoleculerClientError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND', { deviceId });
        }

        return device;
      }
    },
    rename: {
      params: {
        deviceId: 'string',
        name: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { deviceId, name } = ctx.params;

        const { skipped } = await this.rTable.get(deviceId).update({ name });
        if (skipped !== 0) {
          throw new MoleculerClientError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND', { deviceId });
        }
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

        const device = await this.rTable.get(deviceId);
        if (!device) {
          throw new MoleculerClientError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND', { deviceId });
        }

        if (device.variables.findIndex(variable => variable.name === variableName) === -1) {
          throw new MoleculerClientError('Invalid variable.', null, 'ERR_INVALID_VARIABLE', { deviceId, variable: variableName });
        }

        throw new Error('Not implemented.')
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

        const device = await this.rTable.get(deviceId);
        if (!device) {
          throw new MoleculerClientError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND', { deviceId });
        }

        if (device.actions.findIndex(action => action.name === actionName) === -1) {
          throw new MoleculerClientError('Invalid action.', null, 'ERR_INVALID_ACTION', { deviceId, action: actionName });
        }

        throw new Error('Not implemented.')
      }
    }
  }
};
