module.exports = {
    entry: "./flatFile.js",
    output: {
        path: __dirname,
        filename: "bundle.js",
        libraryTarget: 'var',
        library: 'FlatFileApi'
    }
};
