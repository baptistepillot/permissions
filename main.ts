import { exec }              from 'node:child_process'
import { readdir }           from 'node:fs/promises'
import loadConfig            from './config'
import { ConfigEntry }       from './config'
import { ConfigNode }        from './config'
import { configTree }        from './config'
import { createDirectories } from './config'
import { dispatchHomes }     from './config'
import { dispatchMultiple }  from './config'
import fileInfo              from './fileInfo'
import userHomes             from './userHomes'

const DEBUG = false
const SIMUL = false

async function main()
{
	const config = await loadConfig(__dirname + '/permissions.txt')
	const users  = await userHomes(true)
	dispatchMultiple(config)
	dispatchHomes(config, users)
	createDirectories(config)
	if (DEBUG) console.dir(configTree(config), { depth: null })
	await mainScan('', configTree(config))
}

async function mainScan(path: string, node: ConfigNode)
{
	if (!node.children) return
	for (const file of Object.keys(node.children)) {
		const child = node.children[file]
		if (child.entry) {
			console.info(path + '/' + file, '...')
			await scan(path + '/' + file, child, child.entry)
		}
		else {
			await mainScan(path + '/' + file, child)
		}
	}
}

function modeMatch(chmod: string, mode: string, octal: string)
{
	if (/^\d+$/.test(chmod)) {
		if (DEBUG) console.debug(' ', 'octal comparison')
		return chmod === octal
	}
	const sign = chmod.includes('+') ? '+' : '-'
	let who: string
	[who, chmod]  = chmod.split(sign)
	const changes = [] as [string, string][]
	if (who.includes('u')) changes.push(['u', mode.slice(1, 4)])
	if (who.includes('g')) changes.push(['g', mode.slice(4, 7)])
	if (who.includes('o')) changes.push(['o', mode.slice(7, 10)])

	for (const [who, mode] of changes) {
		if (DEBUG) console.debug(' ', who + ':', 'mode', mode + ',', 'chmod', sign + chmod)
		if ((sign === '+') && (
			(chmod.includes('r') && !mode.includes('r'))
			|| (chmod.includes('w') && !mode.includes('w'))
			|| (chmod.includes('x') && !mode.includes('x') && !mode.includes('s') && !mode.includes('t'))
			|| ((who !== 'o') && chmod.includes('s') && !mode.includes('s') && !mode.includes('S'))
			|| ((who === 'o') && chmod.includes('t') && !mode.includes('t') && !mode.includes('T'))
		)) {
			return false
		}
		if ((sign === '-') && (
			(chmod.includes('r') && mode.includes('r'))
			|| (chmod.includes('w') && mode.includes('w'))
			|| (chmod.includes('x') && (mode.includes('x') || mode.includes('s') || mode.includes('t')))
			|| (chmod.includes('s') && (mode.includes('s') || mode.includes('S')))
			|| (chmod.includes('t') && (mode.includes('t') || mode.includes('T')))
		)) {
			return false
		}
	}
	return true
}

async function scan(path: string, node: ConfigNode, parentConf: ConfigEntry)
{
	const real = await fileInfo(path)
	if (!real) {
		console.warn('Warning: file not found', path)
		return
	}
	const conf = node.entry ?? parentConf
	if (DEBUG) console.debug(
		'- control', path,
		':', { owner: real.owner, perms: real.perms, octal: real.octal },
		'>', { chown: conf.chown, chmod: conf.chmod }
	)

	if (conf.chown !== real.owner) {
		const command = `chown -h ${conf.chown} "${path}"`
		console.info(' ', '$', command)
		if (!SIMUL) {
			exec(command, (error, _stdout, stderr) => { if (error) console.error(`Error during ${command}:\n${stderr}`) })
		}
	}
	if (real.perms[0] !== 'l') {
		for (const chmod of conf.chmod.split(',')) {
			if (!modeMatch(chmod, real.perms, real.octal)) {
				const command = `chmod ${chmod} "${path}"`
				console.info(' ', '$', command)
				if (!SIMUL) {
					exec(command, (error, _stdout, stderr) =>
					{
						if (error) console.error(`Error during ${command}:\n${stderr}`)
					})
				}
			}
		}
	}

	if (real.perms[0] === 'd') {
		const nextConf = node.children?.['*']?.entry ?? (conf.recurse ? conf : (parentConf.recurse ? parentConf : null))
		if (nextConf) for (const file of await readdir(path)) if ((file !== '.') && (file !== '..')) {
			await scan(path + '/' + file, node.children?.[file] ?? {}, nextConf)
		}
	}
}

main().then()
