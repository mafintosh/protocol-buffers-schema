//@ts-nocheck
import { parse } from "./parse";
import {promises as fs} from 'fs';
import { join, basename } from 'path';
import { Schema } from "./schema";
import {deepStrictEqual as deep_strict_equal} from 'assert'
console.log(fs)


const fixture = (p: string) => join(__dirname, '../test/fixtures', basename(p))
const rjson = (p: string) => fs.readFile(p, 'utf-8').then(JSON.parse)
const rpbuf = (p: string) => fs.readFile(p, 'utf-8').then(parse)
//@ts-ignore
const fixtures = (p: string) => {
	const pf = fixture(p)
	return Promise.all([rjson(pf + '.json'), rpbuf(pf + '.proto')])
}
const will_error = new Set([
	'no-tags',
	'pheromon-trajectories'
])
async function tests() {
	let dir = await fs.readdir(join(__dirname, '../test/fixtures'))

	for (const file of new Set(dir.map(v => basename(basename(v, '.json'), '.proto')))) {
		console.group(file)
		if (will_error.has(file)) {
			let err: Error | null = null, rp: Schema | null = null;
			try { rp = await rpbuf(fixture(file + '.proto')) }
			catch (e) {err = e}
			if (err) console.error(err)
			else {
				console.error(rp)
				throw new ReferenceError('Expected error, got schema instead.')
			}
		} else {
			const [j, p] = await fixtures(file)
			let pj = p.toJSON()
			console.dir(p, {depth: null})
			console.dir(j, {depth: null})
			deep_strict_equal(j, pj, `${file} must be equal to its JSON value.`)
			console.log(p.toString())
		}
		console.groupEnd()
	}
}

tests().catch(console.error).finally(console.groupEnd)
