const EventEmitter = require('events');
const { MoleculerClientError, MoleculerServerError } = require('moleculer').Errors;

module.exports = class Driver extends EventEmitter {
  /**
   * @param {object}    options
   * @param {string}    options.id
   * @param {function}  options.getDriver
   * @param {?object}   options.variables
   * @param {?function} options.variables[variableName]
   * @param {?object}   options.actions
   * @param {?function} options.actions[actionName]
   */
  constructor(options) {
    super();
    this.state = {};

    const { id, getDriver, variables = {}, actions = {} } = options;

    this.id = id;
    this.getDriver = getDriver;

    this.variables = [];
    this._getters = {};
    Object.entries(variables).forEach(([name, getter]) => {
      this.variables.push(name);
      this._getters[name] = getter;
    });

    this.actions = [];
    this._dispatchers = {};
    Object.entries(actions).forEach(([name, dispatcher]) => {
      this.actions.push(name);
      this._dispatchers[name] = dispatcher;
    });
  }

  dispose() {
    this.removeAllListeners();
  }

  /** @throws {MoleculerServerError} */
  ensureInterface({ variables = [], actions = [] }) {
    variables.forEach(variable => {
      if (!this._getters[variable]) {
        throw new MoleculerServerError('Variable not found.', 500, 'ERR_VARIABLE_NOT_FOUND', { deviceId: this.id, variable });
      }
    });

    actions.forEach(action => {
      if (!this._dispatchers[action]) {
        throw new MoleculerServerError('Action not found.', 500, 'ERR_ACTION_NOT_FOUND', { deviceId: this.id, action });
      }
    });
  }

  /** @throws {MoleculerClientError} */
  async get(variable) {
    if (!this._getters[variable]) {
      throw new MoleculerClientError('Variable not found.', 404, 'ERR_VARIABLE_NOT_FOUND', { deviceId: this.id, variable });
    }

    return this._getters[variable]();
  }

  /** @throws {MoleculerClientError} */
  dispatch(action, data = undefined) {
    if (!this._dispatchers[action]) {
      throw new MoleculerClientError('Action not found.', 404, 'ERR_ACTION_NOT_FOUND', { deviceId: this.id, action });
    }

    return this._dispatchers[action](data);
  }
};
