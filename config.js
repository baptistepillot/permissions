"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configTree = configTree;
exports.createDirectories = createDirectories;
exports.dispatchHomes = dispatchHomes;
exports.dispatchMultiple = dispatchMultiple;
exports.default = loadConfig;
const node_fs_1 = require("node:fs");
const node_fs_2 = require("node:fs");
const promises_1 = require("node:fs/promises");
function configTree(config) {
    const tree = {};
    for (const entry of config) {
        let node = tree;
        for (const dir of entry.path.slice(1).split('/')) {
            if (!node.children)
                node.children = {};
            if (!node.children[dir])
                node.children[dir] = {};
            node = node.children[dir];
        }
        if (!node.entry) {
            node.entry = entry;
            continue;
        }
        if (entry.recurse === node.entry.recurse) {
            console.error('Config: two entries with same path and recurse', entry.path, entry.recurse);
            continue;
        }
        if (!node.children) {
            node.children = {};
        }
        if (node.children['*']) {
            console.error('Config: too many configurations for', entry.path);
            continue;
        }
        if (entry.recurse) {
            node.children['*'] = { entry };
        }
        else {
            node.children['*'] = { entry: node.entry };
            node.entry = entry;
        }
    }
    return tree;
}
function createDirectories(config) {
    for (const entry of config) {
        if (entry.path.startsWith('+')) {
            entry.path = entry.path.slice(1);
            if (!(0, node_fs_1.existsSync)(entry.path)) {
                (0, node_fs_2.mkdirSync)(entry.path);
            }
        }
    }
}
function dispatchHomes(config, userHomes) {
    let index = -1;
    let remove = [];
    for (const entry of config) {
        index++;
        if (!entry.path.includes('$home'))
            continue;
        remove.push(index);
        for (const user of Object.keys(userHomes).sort()) {
            const home = userHomes[user];
            config.push(Object.assign({}, entry, {
                chown: entry.chown.replace(/\$user/g, user),
                path: entry.path.replace(/\$home/g, home)
            }));
        }
    }
    for (const index of remove.reverse()) {
        config.splice(index, 1);
    }
}
function dispatchMultiple(config) {
    let index = -1;
    let remove = [];
    for (const entry of config) {
        index++;
        const path = entry.path;
        const start = path.indexOf('{');
        if (start < 0)
            continue;
        remove.push(index);
        const stop = path.indexOf('}', start);
        for (const subDir of path.slice(start + 1, stop).split(',')) {
            config.push(Object.assign({}, entry, {
                path: path.slice(0, start) + subDir + path.slice(stop + 1)
            }));
        }
    }
    for (const index of remove.reverse()) {
        config.splice(index, 1);
    }
}
async function loadConfig(filePath) {
    const config = [];
    const data = (await (0, promises_1.readFile)(filePath)).toString();
    for (const textRow of data.replace(/\r/g, '').split("\n")) {
        const [path, chown, chmod, recurse] = textRow.split(';');
        if ((path === '') || path.startsWith('#'))
            continue;
        if (path.endsWith('/*') && !recurse) {
            console.error('Config: path ending with /* will always recurse, even if not configured for', path);
        }
        config.push({ path, chown, chmod, recurse: recurse === '1' });
    }
    return config;
}
