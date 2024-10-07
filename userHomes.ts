import { readFile } from 'node:fs/promises'

export default async function userHomes(inclRoot: boolean)
{
	const data      = (await readFile('/etc/passwd')).toString()
	const userHomes = {} as { [user: string]: string }
	for (const row of data.replace(/\r/g, '').split("\n")) {
		const [user,,,,, home] = row.split(':')
		if (home && ((inclRoot && (user === 'root')) || home.startsWith('/home/'))) {
			userHomes[user] = home
		}
	}
	return userHomes
}
