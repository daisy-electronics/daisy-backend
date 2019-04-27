const EventEmitter = require('events');
const { MoleculerClientError, MoleculerServerError } = require('moleculer').Errors;

const { EMPTY_FUNCTION } = require('../../common/util');

module.exports = class View extends EventEmitter {
  /**
   * @param {object}    scheme
   * @param {string}    scheme.id
   * @param {?function} scheme.created
   * @param {?function} scheme.destroyed
   * @param {?object}   scheme.variables
   * @param {?object}   scheme.actions
   * @param {object}    state
   */
  constructor(scheme, state) {
    super();

    this.id = scheme.id;
    this._created = scheme.created || EMPTY_FUNCTION;
    this._destroyed = scheme.destroyed || EMPTY_FUNCTION;

    this.state = state;

    this.variables = [];
    this._getters = {};
    Object.entries(scheme.variables || {}).forEach(([name, getter]) => {
      this.variables.push(name);
      this._getters[name] = getter;
    });

    this.actions = [];
    this._dispatchers = {};
    Object.entries(scheme.actions || {}).forEach(([name, dispatcher]) => {
      this.actions.push(name);
      this._dispatchers[name] = dispatcher;
    });

    this._created.call(this);
  }

  async dispose() {
    this.removeAllListeners();
    await this._destroyed.call(this);
  }

  /** @throws {MoleculerClientError} */
  async get(variable) {
    if (!this._getters[variable]) {
      throw new MoleculerClientError('Variable not found.', 404, 'ERR_VARIABLE_NOT_FOUND', { viewId: this.id, variable });
    }

    return this._getters[variable].call(this);
  }

  /** @throws {MoleculerClientError} */
  dispatch(action, data = undefined) {
    if (!this._dispatchers[action]) {
      throw new MoleculerClientError('Action not found.', 404, 'ERR_ACTION_NOT_FOUND', { viewId: this.id, action });
    }

    return this._dispatchers[action].call(this, data);
  }
};
