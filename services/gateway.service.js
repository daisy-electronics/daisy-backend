'use strict';

const ApiGateway = require('moleculer-web');
const SocketIOService = require('moleculer-io');
const { MoleculerError } = require('moleculer').Errors;
const asyncBusboy = require('async-busboy');
const { Range, ContentRange } = require('http-range');

module.exports = {
	name: 'gateway',
	mixins: [ApiGateway, SocketIOService],
	settings: {
		port: process.env.PORT || 3000,

		use: [
			async (req, res, next) => {
				try {
					const { files, fields } = await asyncBusboy(req);
					Object.assign(req.body, fields);
					files.forEach(file => req.body[file.fieldname] = file);
				} catch (error) {
					// ignore
				} finally {
					next();
				}
			}
		],

		routes: [{
			path: '/api',
			mappingPolicy: 'restrict',
			aliases: {
			},
			whitelist: [/.*/],
			onBeforeCall(ctx, route, req, res) {
				if (req.headers.range) {
					const range = Range.prototype.parse(req.headers.range);
					if (range.unit !== 'bytes') {
						throw new MoleculerClientError('Unit for \'range\' header must be \'bytes\'.');
					}

					ctx.meta.range = {
						start: range.ranges[0].low,
						end: range.ranges[0].high
					};
				}
			},
			onAfterCall(ctx, route, req, res, data) {
				if (ctx.meta.range) {
					res.status = 206;
					res.setHeader('Accept-Ranges', 'bytes');
					if (ctx.meta.contentLength) {
						res.setHeader('Content-Length', ctx.meta.contentLength);
					}

					const range = !ctx.meta.range.start && !ctx.meta.range.end
						? '*'
						: `${ctx.meta.range.start || ''}-${ctx.meta.range.end || ''}`;
					res.setHeader('Content-Range', `bytes ${range}/${ctx.meta.contentLength || '*'}`);
				}

				if (ctx.meta.contentType) {
					res.setHeader('Content-Type', ctx.meta.contentType);
				}

				if (Buffer.isBuffer(data)) {
					res.end(data);
				} else {
					res.end(JSON.stringify(data));
				}
			}
		}],

		io: {
			namespaces: {
				'/app': {
					events: {
						'event': {
							mappingPolicy: 'restrict',
							aliases: {
							},
							onBeforeCall: function (ctx, socket, action, params, callOptions) {
								ctx.meta.socket = socket;
							}
						},
						'request': {
							mappingPolicy: 'restrict',
							aliases: {
							},
							onBeforeCall: function (ctx, socket, action, params, callOptions) {
								ctx.meta.socket = socket;
							}
						}
					}
				}
			}
		}
	},
	actions: {
		'app.broadcast': {
			params: {
				subject: 'string',
				data: 'any'
			},
			visibility: 'public',
			handler(ctx) {
				const { subject, data } = ctx.params;
				this.io.of('app').emit('event', subject, data);
			}
		},
		'app.emit': {
			params: {
				socketId: 'string',
				subject: 'string',
				data: 'any'
			},
			visibility: 'public',
			handler(ctx) {
				const { socketId, subject, data } = ctx.params;

				const socket = this.app.clients[socketId];
				if (!socketId) {
					throw new MoleculerError('Socket not found', 404, 'ERR_SOCKET_NOT_FOUND', { socketId });
				}

				socket.emit('event', subject, data);
			}
		}
	},
	created() {
		this.app = {
			clients: {},
			connectionListener: null
		};
	},
	async started() {
		this.io.of('app').on('connect', this.app.connectionListener = socket => {
			this.app.clients[socket.id] = socket;

			this.broker.emit(`socket.app.connect`, { socket });

			socket.on('disconnect', () => {
				this.broker.emit(`socket.app.disconnect`, { socket });
				delete this.app.clients[socket.id];
			});
		});
	},
	async stopped() {
		this.io.of('app').off('connection', this.app.connectionListener);
	}
};
