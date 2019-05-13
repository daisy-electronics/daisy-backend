'use strict';

const Datastore = require('nedb-promises');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { MoleculerClientError, MoleculerServerError } = require('moleculer').Errors;

const View = require('./view');

module.exports = {
  name: 'views',
  rOptions: {
    db: 'daisy'
  },
  rInitial: {
    daisy: {
      views: {
        $default: true
      }
    }
  },
  events: {
    '**'(data, sender, event) {
      Object.values(this.views).forEach(view =>
        view.events.emit(event.substr('board.'.length), data));
    }
  },
  async created() {
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data');
    }
    this.store = Datastore.create('./data/views.nedb');

    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', error => {
      this.logger.error(`There's been an error somewhere!`, { error });
    });

    this.views = {};

    const viewModules = fs.readdirSync(path.resolve(__dirname, './views'));
    await Promise.all(viewModules.map(async moduleName => {
      if (!moduleName.startsWith('.') && moduleName.endsWith('.js')) {
        const scheme = require(path.resolve(__dirname, 'views', moduleName));

        const viewInfo = await this.store.findOne({ _id: scheme.id });
        if (!viewInfo) {
          await this.store.insert({ _id: scheme.id });
        }

        const state = viewInfo ? viewInfo.state : undefined;
        const view = this.views[scheme.id] = new View(scheme, state, {
          logger: this.logger,
          call: (...args) => this.broker.call(...args)
        });

        this.logger.info('View instance created.', { viewId: scheme.id });

        view.variables.forEach(variable => view.on(variable, async value => {
          await this.store.update({ _id: scheme.id }, {
            $set: { [`state.${variable}`]: value }
          });
          this.broker.emit('view.state-change', { viewId: scheme.id, variable, value });
        }));
      }
    }));
  },
  async stopped() {
    await Promise.all(Object.entries(this.views).map(async ([id, view]) => {
      await this.store.update({ _id: id }, { $set: { state: view.state } });
      view.dispose();
      this.logger.info('View instance disposed of.', { viewId: id, state: view.state })
    }));
  },
  actions: {
    list: {
      visibility: 'published',
      async handler(ctx) {
        const views = await this.store.find();
        return views;
      }
    },
    get: {
      params: {
        viewId: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { viewId } = ctx.params;

        const view = await this.getViewInfo(viewId);
        return view;
      }
    },
    getVariable: {
      params: {
        viewId: 'string',
        variable: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { viewId, variable: variableName } = ctx.params;

        const view = this.views[viewId];
        if (!view) {
          throw new MoleculerClientError('View not found.', 404, 'ERR_VIEW_NOT_FOUND', { viewId });
        }

        if (view.variables.indexOf(variableName) === -1) {
          throw new MoleculerClientError('Invalid variable.', null, 'ERR_INVALID_VARIABLE', { viewId, variable: variableName });
        }

        return view.get(variableName);
      }
    },
    dispatchAction: {
      params: {
        viewId: 'string',
        action: 'string',
        data: { type: 'any', optional: true }
      },
      visibility: 'published',
      async handler(ctx) {
        const { viewId, action: actionName, data } = ctx.params;

        const view = await this.views[viewId];
        if (!view) {
          throw new MoleculerClientError('View not found.', 404, 'ERR_VIEW_NOT_FOUND', { viewId });
        }

        if (view.actions.indexOf(actionName) === -1) {
          throw new MoleculerClientError('Invalid action.', null, 'ERR_INVALID_ACTION', { viewId, action: actionName });
        }

        return view.dispatch(actionName, data);
      }
    }
  },
  methods: {
    async getViewInfo(viewId) {
      const view = await this.store.findOne({ _id: viewId });
      if (!view) {
        throw new MoleculerClientError('View not found.', 404, 'ERR_VIEW_NOT_FOUND', { viewId });
      }

      return view;
    }
  }
};
