'use strict';

const uuidv4 = require('uuid/v4');
const bcrypt = require('bcrypt');
const RService = require('@kothique/moleculer-rethinkdbdash');
const { MoleculerClientError, MoleculerServerError } = require('moleculer').Errors;

module.exports = {
  name: 'auth',
  mixins: [RService],
  settings: {
    saltRounds: 12,
    tokenLifetime: 1000 * 60 * 60 * 24 // 24 hours
  },
  rOptions: {
    db: 'daisy'
  },
  rInitial: {
    daisy: {
      users: {
        $default: true,
        $options: { primaryKey: 'username' }
      }
    }
  },
  rOnReady() {
    setInterval(() => this.rTable.update({
      accessTokens: this.r.row('accessTokens').filter(token => token('expiresAt').ge(new Date))
    }).run(), 1000 * 60 * 60); // 1 hour
  },
  actions: {
    login: {
      params: {
        username: 'string',
        password: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { username, password } = ctx.params;

        const user = await this.rTable.get(username);
        if (!user) {
          throw new MoleculerClientError('Wrong login or password.', 401, 'ERR_AUTHENTICATION', { username });
        }

        if (await bcrypt.compare(password, user.passwordHash)) {
          const tokenInfo = await this.createAccessToken(username);
          return tokenInfo;
        } else {
          throw new MoleculerClientError('Wrong login or password.', 401, 'ERR_AUTHENTICATION', { username });
        }
      }
    },
    newAccessToken: {
      params: {
        username: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { username } = ctx.params;

        if (!(await this.rTable.get(username))) {
          throw new MoleculerClientError('User not found.', 404, 'ERR_USER_NOT_FOUND', { username });
        }

        const tokenInfo = await this.createAccessToken(username);
        return tokenInfo;
      }
    },
    register: {
      params: {
        username: 'string',
        password: 'string'
      },
      visibility: 'public',
      async handler(ctx) {
        const { username, password } = ctx.params;

        const user = await this.rTable.get(username);
        if (user) {
          throw new MoleculerClientError('Username already in use.', 400, 'ERR_USERNAME_ALREADY_IN_USER', { username });
        }

        await this.rTable.insert({
          username,
          passwordHash: await bcrypt.hash(password, this.settings.saltRounds),
          accessTokens: []
        });
      }
    },
    authorize: {
      params: {
        username: 'string',
        accessToken: 'string'
      },
      visibility: 'public',
      async handler(ctx) {
        const { username, accessToken } = ctx.params;

        if (!(await this.rTable.get(username))) {
          throw new MoleculerClientError('User not found.', 404, 'ERR_USER_NOT_FOUND', { username });
        }

        const tokenInfo = await this.rTable.get(username)('accessTokens')
          .filter({ value: accessToken }).nth(0).default(null);
        if (!tokenInfo) {
          throw new MoleculerClientError('Invalid or expired access token.', 401, 'ERR_UNAUTHORIZED', { accessToken });
        } else if (tokenInfo.expiresAt < new Date) {
          throw new MoleculerClientError('Expired access token.', 401, 'ERR_UNAUTHORIZED', { accessToken });
        }

        return tokenInfo;
      }
    },
    ioAuthenticate: {
      params: {
        username: 'string',
        accessToken: 'string'
      },
      visibility: 'published',
      async handler(ctx) {
        const { username, accessToken } = ctx.params;

        const tokenInfo = await ctx.call('auth.authorize', { username, accessToken });
        ctx.meta.socket.$meta.authenticated = true;
        ctx.meta.socket.$meta.username = username;
        return tokenInfo;
      }
    },
    ioDeauthenticate: {
      visibility: 'published',
      async handler(ctx) {
        ctx.meta.socket.$meta.authenticated = false;
        ctx.meta.socket.$meta.username = null;
      }
    }
  },
  methods: {
    async createAccessToken(username) {
      const accessToken = uuidv4();
      const now = new Date;

      const tokenInfo = {
        value: accessToken,
        expiresAt: new Date(now.valueOf() + this.settings.tokenLifetime)
      };

      await this.rTable.get(username).update({
        accessTokens: this.r.row('accessTokens').append(tokenInfo)
      });

      return tokenInfo;
    }
  }
};
