### API code for https://api.produpedia.org

Build with [mongoDB](http://mongodb.com/) and [TypeORM](https://typeorm.io).

### How to run

Please set up a mongoDB instance first. After that, follow instructions in [.env.development](.env.development) and export the values from your `.env.development.local` yourself. After that, you can `yarn dev` or `yarn build`/`yarn start` or run one of the initializers (see [dbpedia-import](https://github.com/produpedia-org/dbpedia-import)) with e.g. `yarn ts-node -T initializers/dbpedia-attributes`.

Example on Linux: `set -a && . .env.development.local && set +a && yarn dev`

Tests are currently *not* implemented.
