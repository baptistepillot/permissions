"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = userHomes;
const promises_1 = require("node:fs/promises");
async function userHomes(inclRoot) {
    const data = (await (0, promises_1.readFile)('/etc/passwd')).toString();
    const userHomes = {};
    for (const row of data.replace(/\r/g, '').split("\n")) {
        const [user, , , , , home] = row.split(':');
        if (home && ((inclRoot && (user === 'root')) || home.startsWith('/home/'))) {
            userHomes[user] = home;
        }
    }
    return userHomes;
}
