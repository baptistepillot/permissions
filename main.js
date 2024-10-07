"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const config_1 = __importDefault(require("./config"));
const config_2 = require("./config");
const config_3 = require("./config");
const config_4 = require("./config");
const config_5 = require("./config");
const fileInfo_1 = __importDefault(require("./fileInfo"));
const userHomes_1 = __importDefault(require("./userHomes"));
const DEBUG = false;
const SIMUL = false;
async function main() {
    const config = await (0, config_1.default)(__dirname + '/permissions.txt');
    const users = await (0, userHomes_1.default)(true);
    (0, config_5.dispatchMultiple)(config);
    (0, config_4.dispatchHomes)(config, users);
    (0, config_3.createDirectories)(config);
    if (DEBUG)
        console.dir((0, config_2.configTree)(config), { depth: null });
    await mainScan('', (0, config_2.configTree)(config));
}
async function mainScan(path, node) {
    if (!node.children)
        return;
    for (const file of Object.keys(node.children)) {
        const child = node.children[file];
        if (child.entry) {
            console.info(path + '/' + file, '...');
            await scan(path + '/' + file, child, child.entry);
        }
        else {
            await mainScan(path + '/' + file, child);
        }
    }
}
function modeMatch(chmod, mode, octal) {
    if (/^\d+$/.test(chmod)) {
        if (DEBUG)
            console.debug(' ', 'octal comparison');
        return chmod === octal;
    }
    const sign = chmod.includes('+') ? '+' : '-';
    let who;
    [who, chmod] = chmod.split(sign);
    const changes = [];
    if (who.includes('u'))
        changes.push(['u', mode.slice(1, 4)]);
    if (who.includes('g'))
        changes.push(['g', mode.slice(4, 7)]);
    if (who.includes('o'))
        changes.push(['o', mode.slice(7, 10)]);
    for (const [who, mode] of changes) {
        if (DEBUG)
            console.debug(' ', who + ':', 'mode', mode + ',', 'chmod', sign + chmod);
        if ((sign === '+') && ((chmod.includes('r') && !mode.includes('r'))
            || (chmod.includes('w') && !mode.includes('w'))
            || (chmod.includes('x') && !mode.includes('x') && !mode.includes('s') && !mode.includes('t'))
            || ((who !== 'o') && chmod.includes('s') && !mode.includes('s') && !mode.includes('S'))
            || ((who === 'o') && chmod.includes('t') && !mode.includes('t') && !mode.includes('T')))) {
            return false;
        }
        if ((sign === '-') && ((chmod.includes('r') && mode.includes('r'))
            || (chmod.includes('w') && mode.includes('w'))
            || (chmod.includes('x') && (mode.includes('x') || mode.includes('s') || mode.includes('t')))
            || (chmod.includes('s') && (mode.includes('s') || mode.includes('S')))
            || (chmod.includes('t') && (mode.includes('t') || mode.includes('T'))))) {
            return false;
        }
    }
    return true;
}
async function scan(path, node, parentConf) {
    const real = await (0, fileInfo_1.default)(path);
    if (!real) {
        console.warn('Warning: file not found', path);
        return;
    }
    const conf = node.entry ?? parentConf;
    if (DEBUG)
        console.debug('- control', path, ':', { owner: real.owner, perms: real.perms, octal: real.octal }, '>', { chown: conf.chown, chmod: conf.chmod });
    if (conf.chown !== real.owner) {
        const command = `chown -h ${conf.chown} "${path}"`;
        console.info(' ', '$', command);
        if (!SIMUL) {
            (0, node_child_process_1.exec)(command, (error, _stdout, stderr) => { if (error)
                console.error(`Error during ${command}:\n${stderr}`); });
        }
    }
    if (real.perms[0] !== 'l') {
        for (const chmod of conf.chmod.split(',')) {
            if (!modeMatch(chmod, real.perms, real.octal)) {
                const command = `chmod ${chmod} "${path}"`;
                console.info(' ', '$', command);
                if (!SIMUL) {
                    (0, node_child_process_1.exec)(command, (error, _stdout, stderr) => {
                        if (error)
                            console.error(`Error during ${command}:\n${stderr}`);
                    });
                }
            }
        }
    }
    if (real.perms[0] === 'd') {
        const nextConf = node.children?.['*']?.entry ?? (conf.recurse ? conf : (parentConf.recurse ? parentConf : null));
        if (nextConf)
            for (const file of await (0, promises_1.readdir)(path))
                if ((file !== '.') && (file !== '..')) {
                    await scan(path + '/' + file, node.children?.[file] ?? {}, nextConf);
                }
    }
}
main().then();
