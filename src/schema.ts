import { Options, Enum, Message, Extends, Service, Enums, EnumValue, Messages, RPC, MessageField } from "./parser-internals";

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
}${this.options.size === 0 ? '' : onOptions(this)
}${onEnums(this)
}${this.extends.reduce((a, v) => a + `\nextend ${v.name} {${indent(v.messages.map(e => onFields(e.fields)).join('\n'))}}`, '')
}${onMessages(this)
}${onServices(this)}`
	}
}
function onOptions<T extends Options>({options}: T): string {
	let s = ''
	for (const [k, v] of options)
		s += `\noption ${k.includes('.') ? `(${k})` : k} = ${v};`

	return s;
}
function onOptionsInline<T extends Options>({options}: T) {
	if (options.size === 0) return ''
	let a: string[] = []
	for (const [k, v] of options)
		a.push(`${k} = ${v}`)
	return ` [${a.join(', ')}]`
}
function onEnums<T extends Enums>({enums}: T): string {
	let s = ''
	for (const {name, values} of enums) {
		s += `\nenum ${name} {${indent(onEnumValues(values))}\n}`
	}
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
	for (const msg of messages) {
		s += `\nmessage ${msg.name} {${
			indent(
				onOptions(msg) +
				onEnums(msg) +
				onMessages(msg) +
				onFields(msg.fields)
				)
			}\n}`
	}
	return s
}
function onFieldValues(fields: MessageField[]) {
	let s = ''
	for (const f of fields)
		s += `\n${f.required ? 'required ' : f.repeated ? 'repeated ' : (f.optional && !f.oneof) ? 'optional ' : ''}${f.type === 'map' && f.map ? `map<${f.map.from}, ${f.map.to}>` : f.type} ${f.name} = ${f.tag}${onOptionsInline(f)};`
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
		s += `\nrpc (${
			rpc.client_streaming ? 'stream ' : ''
		}${rpc.input_type}) returns (${
			rpc.server_streaming ? 'stream ' : ''
		}${rpc.output_type})${
			rpc.options.size ? ` {${indent(onOptions(rpc))}\n}` : ''
		};`

	return s;
}
function onServices({services}: Schema) {
	let s = ''
	for (const {name, methods} of services)
		s += `\nservice ${name} {${indent(onRPCs(methods))}\n}`
	return s
}
