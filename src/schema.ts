import { Options, Enum, Message, Extends, Service, Enums, EnumValue, Messages, RPC, MessageField, OptionsJSON } from "./parser-internals";
const indent: ((s: string) => string) = s => s.replace(/^/gm, '  ')
export class Schema extends Options {
	syntax: 2 | 3 = 3;
	package: string = '';
	imports: string[] = [];
	enums: Enum[] = [];
	messages: Message[] = [];
	extends: Extends[] = [];
	services: Service[] = [];
	optimize_for: "SPEED" | "CODE_SIZE" | "LITE_RUNTIME" | "AUTO" = "AUTO";
	toString() {
		return '' +
`syntax = "proto${this.syntax}";
${this.package && `package ${this.package};`
}${this.imports.reduce((a, i) => a + `\nimport "${i}";`, '')
}${onOptions(this)
}${onEnums(this)
}${this.extends.reduce((a, v) => a + `\nextend ${v.name} {${indent(onFields(v.msg.fields))}\n}`, '')
}${onMessages(this)
}${onServices(this)}`
	}
}
function traverse(val: OptionsJSON) {
	let keys = Object.keys(val)
	if (keys.length === 0) return {path: '', val: ''}
	if (keys.length > 1) return {path: '', val}
	let path = keys[0]
	keys = Object.keys(val = val[path] as OptionsJSON)
	while (keys.length === 1) {
		path += '.' + keys[0]
		if (typeof val[keys[0]] === 'object') {
			val = val[keys[0]] as OptionsJSON
			keys = Object.keys(val)
		} else return {path, val: val[keys[0]]}
	}

	return { path, val }
}
function onOptionsChild(opts: OptionsJSON): string {
	let s = ''
	for (const v in opts) s += `\n${v}${
		typeof opts[v] === 'object' ? ` {${
			indent(onOptionsChild(opts[v] as OptionsJSON))}\n}` : `: ${opts[v]}`
	};`
	return s
}
function onOptionsJSON(opts: OptionsJSON): string {
	let s = ''
	const {path, val} = traverse(opts)
	if (path !== '') return `\noption ${path.includes('.') ? `(${path})` : path} = ${typeof val === 'string' ? val : `{${indent(onOptionsChild(val))}\n};`}`
	else if (typeof val === 'object') for (const v in val) s += `\noption ${v} = ${typeof val[v] === 'string' ? val[v] : `{${indent(onOptionsChild(val[v] as OptionsJSON))}\n}`};`
	return s;
}
function onOptions<T extends Options>({options}: T): string {
	if (options.size === 0) return ''
	return onOptionsJSON(Options.intoJSON(options))
}
function onOptionsInline<T extends Options>({options}: T) {
	if (options.size === 0) return ''
	let a: string[] = []
	for (const [k, v] of options)
		a.push(`${k.includes('.') ? `(${k})` : k} = ${v}`)
	return ` [${a.join(', ')}]`
}
function onEnums<T extends Enums>({enums}: T): string {
	let s = ''
	for (const en of enums)
		s += `\nenum ${en.name} {${
			indent(
				onOptions(en) +
				onEnumValues(en.values)
				)}\n}`
	return s
}
function onEnumValues(a: EnumValue[]) {
	let s = ''
	for (const e of a)
		s += `\n${e.name} = ${e.value}${onOptionsInline(e)};`
	return s
}
function onMessages<T extends Messages>({messages}: T) {
	let s = ''
	for (const msg of messages)
		s += `\nmessage ${msg.name} {${
			indent(
				onOptions(msg) +
				onEnums(msg) +
				onMessages(msg) +
				onFields(msg.fields)
				)
			}\n}`
	return s
}
function onFieldValues(fields: MessageField[]) {
	let s = ''
	for (const f of fields)
		s += `\n${
			f.required ?
			'required ' :
			f.repeated ?
			'repeated ' :
			(f.optional && !f.oneof) ?
			'optional ' :
			''
		}${
			f.type === 'map' ?
			`map<${f.map!.from}, ${f.map!.to}>` :
			f.type
		} ${
			f.name
		} = ${
			f.tag
		}${onOptionsInline(f)};`
	return s;
}
function onFields(fields: MessageField[]) {
	let s = ''
	s += onFieldValues(fields.filter(v => !v.oneof))
	const oneofs = fields.filter(v => Boolean(v.oneof)).reduce((a, v) => {
		(a[v.oneof] || (a[v.oneof] = [])).push(v);
		return a
	}, {} as {[s: string]: MessageField[]})
	for (const oneof in oneofs)
		s += `\noneof ${oneof} {${indent(onFieldValues(oneofs[oneof]))}\n}`
	return s
}
function onRPCs(rpcs: RPC[]) {
	let s = ''
	for (const rpc of rpcs)
		s += `\nrpc ${rpc.name} (${
			rpc.client_streaming ? 'stream ' : ''
		}${rpc.input_type}) returns (${
			rpc.server_streaming ? 'stream ' : ''
		}${rpc.output_type})${
			rpc.options.size > 0 ? ` {${indent(onOptions(rpc))}\n}` : ''
		};`

	return s;
}
function onServices({services}: Schema) {
	let s = ''
	for (const srv of services)
	s += `\nservice ${srv.name} {${indent(
		onOptions(srv) +
		onRPCs(srv.methods)
	)}\n}`
	return s
}
