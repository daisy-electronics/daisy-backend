'use strict';

const ApiGateway = require('moleculer-web');
const SocketIOService = require('moleculer-io');
const { MoleculerError } = require('moleculer').Errors;
const asyncBusboy = require('async-busboy');
const { Range, ContentRange } = require('http-range');
const { MoleculerClientError } = require('moleculer').Errors;

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

		cors: {
			origin: "*",
			methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
			allowedHeaders: "*",
			//exposedHeaders: "*",
			credentials: true,
			maxAge: null
		},

		path: '/api',

		routes: [
			{
				path: '/user/',
				mappingPolicy: 'restrict',
				authorization: true,
				whitelist: [/.*/],
				aliases: {
					'GET :username/new-access-token': 'auth.newAccessToken'
				},
				bodyParsers: {
					json: true
				},
				onBeforeCall(ctx, route, req, res) {
					return this.onBeforeCall(ctx, route, req, res);
				},
				onAfterCall(ctx, route, req, res, data) {
					return this.onAfterCall(ctx, route, req, res, data);
				}
			},
			{
				path: '/device/',
				mappingPolicy: 'restrict',
				authorization: true,
				whitelist: [/.*/],
				aliases: {
					'GET :deviceId': 'devices.get',
					'GET :deviceId/:variable': 'devices.getVariable',
					'POST :deviceId/:action': 'devices.dispatchAction'
				},
				bodyParsers: {
					json: true
				},
				onBeforeCall(ctx, route, req, res) {
					return this.onBeforeCall(ctx, route, req, res);
				},
				onAfterCall(ctx, route, req, res, data) {
					return this.onAfterCall(ctx, route, req, res, data);
				}
			},
			{
				path: '',
				mappingPolicy: 'restrict',
				authorization: false,
				whitelist: [/.*/],
				aliases: {
					'POST login': 'auth.login',
					'GET devices': 'devices.list',
					'POST shutdown': 'admin.shutdown',
					'POST api-gateway/shutdown': 'admin.shutdownAPIGateway'
				},
				bodyParsers: {
					json: true
				},
				onBeforeCall(ctx, route, req, res) {
					return this.onBeforeCall(ctx, route, req, res);
				},
				onAfterCall(ctx, route, req, res, data) {
					return this.onAfterCall(ctx, route, req, res, data);
				}
			},
		],

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
	methods: {
		async authorize(ctx, route, req) {
			const authorization = req.headers['x-authorization'];
			if (!authorization) {
				throw new MoleculerClientError(`No 'X-Authorization' header.`, 401, 'ERR_NO_AUTHORIZATION_HEADER');
			}

			const bearer = req.headers['x-bearer'];
			if (!bearer) {
				throw new MoleculerClientError(`No 'X-Bearer' header.`, 401, 'ERR_NO_X_BEARER_HEADER');
			}

			await ctx.call('auth.authorize', { username: bearer, accessToken: authorization });
		},
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

			return data;
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
