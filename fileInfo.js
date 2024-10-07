"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fileInfo;
exports.groupName = groupName;
exports.userName = userName;
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const node_util_1 = require("node:util");
const exec = (0, node_util_1.promisify)(node_child_process_1.exec);
const groupNames = {};
const userNames = {};
async function fileInfo(path) {
    try {
        const stat = await (0, promises_1.lstat)(path);
        const mode = stat.mode;
        const octal = (mode & 0o777).toString(8);
        const owner = (await userName(stat.uid)) + ':' + (await groupName(stat.gid));
        let perms;
        switch (mode & 0o170000) {
            // type
            case 0o100000:
                perms = '-';
                break; // regular file
            case 0o040000:
                perms = 'd';
                break; // directory
            case 0o120000:
                perms = 'l';
                break; // symbolic link
            case 0o010000:
                perms = 'p';
                break; // fifo named pipe
            case 0o140000:
                perms = 's';
                break; // socket
            case 0o060000:
                perms = 'b';
                break; // block device
            case 0o020000:
                perms = 'c';
                break; // character device
            default: perms = '?'; // unknown
        }
        perms += ''
            // user
            + ((mode & 0o400) ? 'r' : '-')
            + ((mode & 0o200) ? 'w' : '-')
            + ((mode & 0o100) ? ((mode & 0o4000) ? 's' : 'x') : ((mode & 0o4000) ? 'S' : '-'))
            // group
            + ((mode & 0o040) ? 'r' : '-')
            + ((mode & 0o020) ? 'w' : '-')
            + ((mode & 0o010) ? ((mode & 0o2000) ? 's' : 'x') : ((mode & 0o2000) ? 'S' : '-'))
            // other
            + ((mode & 0o004) ? 'r' : '-')
            + ((mode & 0o002) ? 'w' : '-')
            + ((mode & 0o001) ? ((mode & 0o1000) ? 't' : 'x') : ((mode & 0o1000) ? 'T' : '-'));
        return { path, owner, perms, octal };
    }
    catch {
    }
}
async function groupName(uid) {
    try {
        return groupNames[uid] ?? (groupNames[uid] = (await exec(`getent group ${uid} | cut -d: -f1`)).stdout.trim());
    }
    catch {
        return String(uid);
    }
}
async function userName(uid) {
    try {
        return userNames[uid] ?? (userNames[uid] = (await exec(`id -nu ${uid}`)).stdout.trim());
    }
    catch {
        return String(uid);
    }
}
