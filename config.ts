import { existsSync } from 'node:fs'
import { mkdirSync }  from 'node:fs'
import { readFile }   from 'node:fs/promises'

export type ConfigChildren = { [name: string]: ConfigNode }

export interface ConfigEntry
{
	path:    string
	chown:   string
	chmod:   string
	recurse: boolean
}

export interface ConfigNode
{
	children?: ConfigChildren
	entry?:    ConfigEntry
}

export function configTree(config: ConfigEntry[])
{
	const tree = {} as ConfigNode
	for (const entry of config) {
		let node = tree
		for (const dir of entry.path.slice(1).split('/')) {
			if (!node.children) node.children = {}
			if (!node.children[dir]) node.children[dir] = {}
			node = node.children[dir]
		}
		if (!node.entry) {
			node.entry = entry
			continue
		}
		if (entry.recurse === node.entry.recurse) {
			console.error('Config: two entries with same path and recurse', entry.path, entry.recurse)
			continue
		}
		if (!node.children) {
			node.children = {}
		}
		if (node.children['*']) {
			console.error('Config: too many configurations for', entry.path)
			continue
		}
		if (entry.recurse) {
			node.children['*'] = { entry }
		}
		else {
			node.children['*'] = { entry: node.entry }
			node.entry = entry
		}
	}
	return tree
}

export function createDirectories(config: ConfigEntry[])
{
	for (const entry of config) {
		if (entry.path.startsWith('+')) {
			entry.path = entry.path.slice(1)
			if (!existsSync(entry.path)) {
				mkdirSync(entry.path)
			}
		}
	}
}

export function dispatchHomes(config: ConfigEntry[], userHomes: { [user: string]: string })
{
	let index  = -1
	let remove = [] as number[]
	for (const entry of config) {
		index ++
		if (!entry.path.includes('$home')) continue
		remove.push(index)
		for (const user of Object.keys(userHomes).sort()) {
			const home = userHomes[user]
			config.push(Object.assign({}, entry, {
				chown: entry.chown.replace(/\$user/g, user),
				path:  entry.path.replace(/\$home/g, home)
			}))
		}
	}
	for (const index of remove.reverse()) {
		config.splice(index, 1)
	}
}

export function dispatchMultiple(config: ConfigEntry[])
{
	let index  = -1
	let remove = [] as number[]
	for (const entry of config) {
		index ++
		const path  = entry.path
		const start = path.indexOf('{')
		if (start < 0) continue
		remove.push(index)
		const stop = path.indexOf('}', start)
		for (const subDir of path.slice(start + 1, stop).split(',')) {
			config.push(Object.assign({}, entry, {
				path: path.slice(0, start) + subDir + path.slice(stop + 1)
			}))
		}
	}
	for (const index of remove.reverse()) {
		config.splice(index, 1)
	}
}

export default async function loadConfig(filePath: string)
{
	const config = [] as ConfigEntry[]
	const data   = (await readFile(filePath)).toString()
	for (const textRow of data.replace(/\r/g, '').split("\n")) {
		const [path, chown, chmod, recurse] = textRow.split(';')
		if ((path === '') || path.startsWith('#')) continue
		if (path.endsWith('/*') && !recurse) {
			console.error('Config: path ending with /* will always recurse, even if not configured for', path)
		}
		config.push({ path, chown, chmod, recurse: recurse === '1' })
	}
	return config
}
