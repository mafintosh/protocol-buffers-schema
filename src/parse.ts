import { tokenise } from "./tokenise";
import { PACKABLE_TYPES, TokenCount, onSyntaxVersion, onPackageName, onEnum, onMessage, onOption, onImport, onExtend, onService, Message } from "./parser-internals";
import { Schema } from "./schema";

type parserInternal = (schema: Schema, n: TokenCount) => void;
interface ToString {toString(): string;}
export function parse<T extends ToString>(from: T) {
	const tc = new TokenCount(Object.freeze(tokenise(from.toString())))
	const schema = new Schema
	const call: ((v: parserInternal)=>void) = v => v(schema, tc);
	while (!tc.done) switch (tc.peek()) {
		case 'syntax':
			if (tc.t !== 0)
				throw new SyntaxError('Protobuf syntax version must be first token in file');
			call(onSyntaxVersion);
			break;
		case 'package': call(onPackageName); break;
		case 'enum': call(onEnum); break;
		case 'message': call(onMessage); break;
		case 'option':
			call(onOption);
			if (schema.options.has("optimize_for")) {
				let optimize_for = schema.options.get("optimize_for")
				switch (optimize_for) {
					case 'SPEED': case 'CODE_SIZE': case 'LITE_RUNTIME':
						schema.optimize_for = optimize_for;
				}
			}
			break;
		case 'import': call(onImport); break;
		case 'extend': call(onExtend); break;
		case 'service': call(onService); break;
		default: throw new SyntaxError(`Unexpected token: ${tc.next()}`)
	}

	for (const ext of schema.extends) for (const msg of schema.messages) {
		if (msg.name === ext.name) for (const {fields} of ext.messages) for (const field of fields) {
			if (!msg.extensions || field.tag < msg.extensions.from || field.tag > msg.extensions.to)
				throw new ReferenceError(`${msg.name} does not declare ${field.tag} as an extension number`)

			msg.fields.push(field)
		}
	}
	for (const msg of schema.messages) for (const field of msg.fields) {
		if (field.packed && !PACKABLE_TYPES.includes(field.type)) {
			// check enum type
			if (field.type.includes('.')) {
				const types = field.type.split('.')
				let last = types.shift(), curr: Message | undefined = schema.messages.find(v => v.name === last)
				for (const type of types) {
					if (curr) curr = curr.messages.find(v => v.name === type)
					if (curr) last = type
				}

				if (!curr)
					throw new ReferenceError(`Cannot find field type ${field.type}`)

				if (curr) continue
			} else if (msg.enums.some(en => en.name === field.type)) continue;

			throw new SyntaxError(`Fields of type ${field.type} cannot be declared [packed=true]. Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared as "packed". See https://developers.google.com/protocol-buffers/docs/encoding#optional`)
		}
	}
	return schema
}
