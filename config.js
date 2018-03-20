/**
 * Created by hxn 20171209
 */
'use strict';

const configure = function () {

    const path = require('path'),
        _ = require('lodash');

    let config = {
        system: {
            port: 3000,
            PROJECT_NAME: 'vaper-server-backend'
        },
        neo4j: {
            uri: 'bolt://127.0.0.1',
            user: 'neo4j',
            password: '123456'
        }
        // path: {
        //     log_path: path.resolve(process.cwd(), 'logs'),
        //     upload: path.resolve(process.cwd(), 'upload'),
        // }
    };

    //目录不存在，则创建
    // let keys = Object.keys(config.path);
    // keys.forEach(key => {
    //     fs.ensureDirSync(config.path[key])
    // });

    //合并临时环境变量
    // const envJsonPath = process.cwd() + '/.env/' + (process.env.NODE_ENV||'dev') + '.json';
    // fs.ensureFileSync(envJsonPath);
    // let envConfig = fs.readJsonSync(envJsonPath, {throws: false});

    return _.merge({}, config);
}();

module.exports = configure;
global.config = configure;