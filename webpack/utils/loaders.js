const path = require('path');
const { ROOT_PATH } = require('.');

module.exports.base = [
  {
    test: /\.(t|j)s(x)?$/,
    exclude: /node_modules/,
    use: [
      {
        loader: 'thread-loader',
      },
      {
        loader: 'babel-loader',
        options: {
          presets: [
            [
              '@babel/preset-env',
              {
                useBuiltIns: 'usage',
                debug: false,
                corejs: {
                  version: 3,
                  proposals: true,
                },
              },
            ],
            [
              '@babel/preset-react',
              {
                runtime: 'automatic',
              },
            ],
            ['@babel/preset-typescript', { allowDeclareFields: true }],
          ],
          plugins: [
            '@babel/plugin-proposal-object-rest-spread',
            '@babel/plugin-proposal-optional-chaining',
            '@babel/plugin-proposal-nullish-coalescing-operator',
            [
              '@babel/plugin-proposal-decorators',
              {
                legacy: true,
              },
            ],
            [
              '@babel/plugin-proposal-class-properties',
              {
                loose: true,
              },
            ],
          ],
        },
      },
    ],
  },
  {
    test: /\.svga$/,
    use: { loader: 'url-loader' },
  },
];

module.exports.dev = [
  {
    test: /\.css$/i,
    use: [
      {
        loader: 'style-loader',
      },
      {
        loader: 'css-loader',
      },
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            ident: 'postcss',
            config: path.resolve(ROOT_PATH, 'postcss.config.js'),
          },
        },
      },
    ],
  },
];

module.exports.pack = [
  {
    test: /\.css$/i,
    use: [
      {
        loader: 'style-loader',
      },
      {
        loader: 'css-loader',
      },
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            ident: 'postcss',
            config: path.resolve(ROOT_PATH, './postcss.config.js'),
          },
        },
      },
    ],
  },
  {
    test: /\.(png|jpe?g|gif|svg|mp4|webm|ogg|mp3|wav|flac|aac|woff|woff2|eot|ttf)$/,
    type: 'asset/inline',
  },
];
