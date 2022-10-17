const path = require('path')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env) => {
    const isProduction = env.production

    return {
        mode: isProduction ? 'production' : 'development',
        watch: !isProduction,
        entry: isProduction ? './src/index.js' : './demo.js',
        target: 'web',
        output: {
            //publicPath: '',
            filename: 'vide.js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
            library: {
                name: 'Vide',
                type: 'umd'
            },
        },
        module: {
            rules: [
                {
                    test: /\.(js)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader'
                    },
                    resolve: {
                        fullySpecified: false,
                    }
                },
                {
                    test: /\.css$/i,
                    //include: path.resolve(__dirname, 'src'),
                    use: [
                        'style-loader',
                        'css-loader',
                        //'postcss-loader'
                    ],
                },
                {
                    test: /\.(png|jpe?g|gif|svg|vtt)$/i,
                    use: [
                        'file-loader'
                    ]
                },
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        // Creates `style` nodes from JS strings
                        // fallback to style-loader in development
                        !isProduction
                            ? 'style-loader'
                            : MiniCssExtractPlugin.loader,
                        // Translates CSS into CommonJS
                        'css-loader',
                        // Compiles Sass to CSS
                        'sass-loader',
                        //'postcss-loader'
                    ],
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css',
            }),
        ],
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
        }
    }
}
