const MAX_RANGE = 0x1FFFFFFF ;

// "Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared "packed"."
export const PACKABLE_TYPES = Object.freeze([
	// varint wire types
	'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'bool',
	// + ENUMS
	// 64-bit wire types
	'fixed64', 'sfixed64', 'double',
	// 32-bit wire types
	'fixed32', 'sfixed32', 'float'
])
export type NameMappedValueMap = Map<string, string>;
const parseBool = <T extends Options>(m: T, s: string) => {
	if (m.options.has(s)) switch (m.options.get(s)) {
		case "true": return true;
		case "false": return false;
		default: throw new SyntaxError(`Cannot convert value of ${s} (${m.options.get(s)}) to boolean`)
	}
	return false;
}
const optionsWeakMap = new WeakMap<Options, NameMappedValueMap>();
export class Options {
	get options(): NameMappedValueMap {
		let m = optionsWeakMap.get(this);
		if (!m) {
			m = new Map<string, string>();
			optionsWeakMap.set(this, m);
		}
		return m
	}
}
export class MessageField extends Options {
	name = '';
	type = '';
	tag = -1;
	map: null | {from: string; to: string} = null;
	oneof = '';
	required = false;
	repeated = false;
	deprecated = false;
	packed = false;
	optional = false;
}
interface MessageFields {fields: MessageField[]}
function onField<T extends MessageFields>({fields}: T, c: TokenCount) {
	const field: MessageField = new MessageField;
	while (!c.done) switch (c.next()) {
		case '=':
			field.tag = Number(c.next(2));
			break

		case 'map':
			if (c.peek(1) !== '<')
				throw new SyntaxError(`Unexpected token in map type: ${c.peek(1)}`)
			if (c.peek(3) !== ',')
				throw new SyntaxError(`Unexpected token in map type: ${c.peek(3)}`)
			if (c.peek(5) !== '>')
				throw new SyntaxError(`Unexpected token in map type: ${c.peek(5)}`)

			field.type = 'map';
			field.map = {
				from: c.next(3),
				to: c.next(2)
			};
			field.name = c.next(2);
			break;

		case 'repeated':
		case 'required':
		case 'optional':
			{
				let t = c.peek(-1);
				field.required = t === 'required'
				field.repeated = t === 'repeated'
				field.type = c.next()
				field.name = c.next()
			}
			break

		case '[':
			onFieldOptions(field, c);
			field.packed = parseBool(field, "packed")
			field.deprecated = parseBool(field, "deprecated")
			break;

		case ';':
			if (field.name === '')
				throw new SyntaxError('Missing field name');
			if (field.type === '')
				throw new SyntaxError(`Missing type in message field: ${field.name}`)
			if (field.tag === -1)
				throw new SyntaxError(`Missing tag number in message field: ${field.name}`)
			c.t++
			fields.push(field)
			return field;

		default:
			throw new Error(`Unexpected token in message field: ${c.peek()}`)
	}

	throw new Error('No ; found for message field')
}
function onFieldOptions<T extends Options>({options}: T, c: TokenCount) {
	while (!c.done) switch (c.peek()) {
		case '[':
		//@ts-ignore
		case ',': {
			let name = c.next(2);
			if (name === ')') {
				name = c.next();
				c.t++
			}
			if (c.next() !== '=')
				throw new SyntaxError(`Unexpected token in field options in ${name}`);
			if (c.peek() === ']')
				throw new SyntaxError(`Unexpected ] in field option in ${name}`);
			let value = c.next();
			options.set(name, value);
		}
		case ']':
			c.t++
			return;
		default:
			throw new SyntaxError(`Unexpected token in field options: ${c.peek()}`);
	}

	throw new SyntaxError('No closing tag for field options');
}


export function onPackageName(schema: Schema, t: TokenCount) {
	schema.package = t.next(2);
	if (t.next() !== ';')
		throw new SyntaxError(`No ; found after package name ${schema.package}`);
}

export function onSyntaxVersion(schema: Schema, n: TokenCount) {
	if (n.peek(1) !== '=')
		throw new SyntaxError(`Syntax version missing assignment`);
	switch (n.next(2)) {
		case '"proto2"': schema.syntax = 2; return;
		case '"proto3"': schema.syntax = 3; return;
	}
	throw new SyntaxError(`${n.peek(-2)} is not a valid protobuf syntax version`)
}

export function onOption<T extends Options>({options}: T, n: TokenCount) {
	let name = '', value = '', paren = false;
	while (!n.done) switch (n.next()) {
		case ';':
			if (options.has(name))
				throw new SyntaxError(`Duplicate option named ${name} on same options value`)
			options.set(name, value)
			return;

		case 'option':
			paren = n.peek() === '('
			name = n.next(+paren + 1);
			if (paren && n.next() !== ')') throw new SyntaxError('Parenthesised options must be closed.')
			if (n.peek()[0] === '.') name += n.next()
			break;

		case '=':
			if (name === '') throw new SyntaxError(`Name must be provided for option with value ${n.peek()}`)
			value = n.next()
			if (name === 'optimize_for') switch (value) {
				default: throw new SyntaxError(`Unexpected value for option optimize_for: ${value}`)
				case 'SPEED': case 'CODE_SIZE': case 'LITE_RUNTIME':
			} else if (value === '{') throw new Error('Unimplemented')
			break
	}
}
class EnumValue extends Options {
	value: number
	constructor(public name: string, value: number) {
		super()
		this.value = +value
	}
}
class Enum extends Options {
	values: EnumValue[] = []
	constructor(public name: string) {super()}
}
function onEnumValue(e: Enum, n: TokenCount) {
	while (!n.done) switch (n.peek()) {
		case 'reserved': break;
		default: {
			let name = n.next()
			if (n.next() !== '=')
				throw new SyntaxError(`enum value missing setter value`)
			let value = +n.next();
			let ret = new EnumValue(name, value);
			if (n.peek() === '[') onFieldOptions(ret, n);
			if (n.next() !== ';')
				throw new SyntaxError(`enum value missing semicolon`);

			e.values.push(ret)
			return ret
		}
	}
	throw new SyntaxError(`enum value was not closed before token completion`)
}
type Enums = {enums: Enum[]};
export function onEnum<T extends Enums>({enums}: T, n: TokenCount) {
	const tenum: Enum = new Enum(n.next(2))
	while (!n.done) switch (n.peek()) {
		case 'option':
			onOption(tenum, n);
			break;
		case '}':
			n.next(n.peek(0) === ';' ? 2 : 1)
			enums.push(tenum)
			return;
		default:
			onEnumValue(tenum, n)
	}
}

export class Message extends Options {
	enums: Enum[] = [];
	extends: Extends[] = [];
	messages: Message[] = [];
	fields: MessageField[] = [];
	extensions: null | {from: number; to: number;} = null;
	constructor(public name: string) {super()}
}
export interface Messages {messages: Message[]}
export function onMessage<T extends Messages>({messages}: T, c: TokenCount) {
	const m = new Message(c.next(2))
	let lvl = 0
	while (!c.done) switch (c.peek()) {
		case '{': ++lvl; c.next(); break;
		case '}':
			c.next();
			if (!--lvl) {
				messages.push(m);
				return m
			}
			break;
		case 'map': case 'required': case 'optional': case 'repeated':
			onField(m, c); break;
		case 'enum': onEnum(m,c); break;
		case 'message': onMessage(m, c); break;
		case 'extensions': onExtensions(m, c); break;
		case 'oneof': {
			let name = c.next(2);
			if (c.next() !== '{')
				throw new SyntaxError(`Unexpected oneof token: ${c.peek(-1)}; should be {`);

			while (c.peek() !== '}') {
				const field = onField(m, c);
				field.oneof = name;
				field.optional = true;
			}
			c.next();
		}
		break
		case 'extend': onExtend(m, c); break;
		case ';': c.next(); break;
		case 'reserved': case 'option':
			do c.next();
			while (c.peek() !== ';');
			break;

		default: onField(m, c).optional = true; break;
	}
	throw new SyntaxError(`message was not closed before token completion`)
}
function onExtensions(m: Message, c: TokenCount) {
	const from = +c.next(2)
	if (isNaN(from))
		throw new SyntaxError(`Invalid "from" value in extensions definition`)

	if (c.next() !== 'to') throw new Error("Expected keyword 'to' in extensions definition")
	let sto = c.next()
	const to = sto === 'max' ? MAX_RANGE : +sto
	if (isNaN(to))
		throw new SyntaxError(`Invalid "to" value in extensions definition`)


	if (c.next() !== ';')
		throw new SyntaxError('Missing ; in extensions definition')
	m.extensions = {from, to}
}
class Extends {
	messages: Message[] = []
	constructor(public name: string) {}
}
interface Extendss {extends: Extends[]}
export function onExtend<T extends Extendss>({extends: extendss}: T, c: TokenCount) {
	let e = new Extends(c.peek(2))
	onMessage(e, c)
	extendss.push(e)
}
export function onImport({imports}: Schema, c: TokenCount) {
	let file = c.next(2).replace(/^(?:"([^"]+)"|'([^']+)')$/, '$1$2')
	if (c.next() !== ';')
		throw new SyntaxError(`Expected ";" after import filename.`)

	imports.push(file)
}
class RPC extends Options {
	constructor(public name: string) {super()}
	input_type = ''
	output_type = ''
	client_streaming = false
	server_streaming = false
}
class Service extends Options {
	constructor(public name: string) {super()}
	methods: RPC[] = []
}
export function onService({services}: Schema, c: TokenCount) {
	const serv = new Service(c.next(2))
	if (c.next() !== '{')
		throw new SyntaxError(`Unexpected service token: ${c.peek(-1)}`)

	while (!c.done) switch (c.peek()) {
		case '}':
			c.next();
			if (c.peek() === ';') c.t++;
			services.push(serv);
			return;

		case 'option':
			onOption(serv, c);
			break;

		case 'rpc':
			onRPC(serv, c);
			break;
	}
}
function onRPC({methods}: Service, c: TokenCount) {
	const e = (...chars: string[]) => {
		for (const char of chars) if (char !== c.next()) throw new SyntaxError(`Unexpected RPC token: ${c.peek(-1)}; expected "${char}"`)
	}
	const rpc = new RPC(c.next(2))
	e('(')

	if (c.peek() === 'stream') {
		rpc.client_streaming = true
		c.t++
	}
	rpc.input_type = c.next()
	e(')', 'returns', '(')

	if (c.peek() === 'stream') {
		rpc.server_streaming = true
		c.t++
	}
	rpc.output_type = c.next()
	e(')')
	if (c.peek() === ';') c.t++
	e('{')
	while (!c.done) switch (c.next()) {
		case '}':
			if (c.peek() === ';') c.t++
			methods.push(rpc)
			return rpc

		case 'option':
			onOption(rpc, c);
			break;
	}
	throw new Error('No closing tag for rpc')
}

export class Schema extends Options {
	syntax: 2 | 3 = 3;
	package: string = '';
	imports: string[] = [];
	enums: Enum[] = [];
	messages: Message[] = [];
	extends: Extends[] = [];
	services: Service[] = []
}


export class TokenCount {
	t = 0
	done: boolean
	constructor(private tokens: readonly string[]) {
		this.done = tokens.length === 0
	}
	peek(n = 0) {
		return this.tokens[this.t + n]
	}
	next(n = 1) {
		if (n < 1) throw new RangeError()
		this.done = this.tokens.length === (this.t += n);
		return this.tokens[this.t - 1];
	}
}
