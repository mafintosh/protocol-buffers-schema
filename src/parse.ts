import { tokenise } from "./tokenise";
import { PACKABLE_TYPES, TokenCount, on_syntax_version, on_package_name, on_enum, on_message, on_option, on_import, on_extend, on_service, Lookup, LookupIn } from "./parser-internals";
import { Schema } from "./schema";

interface ToString {toString(): string;}
export function parse<T extends ToString>(from: T) {
	const schema = new Schema
	const lu: Lookup = []
	schema_parse: {
		const tc = new TokenCount(Object.freeze(tokenise(from.toString())))
		while (!tc.done) switch (tc.peek()) {
			case 'syntax':
				if (tc.t !== 0)
					tc.syntax_err('Protobuf syntax version must be first token in file');
				on_syntax_version(schema, tc);
				break;
			case 'package': on_package_name(schema, tc); break;
			case 'enum': on_enum(schema, tc, lu); break;
			case 'message': on_message(schema, tc, lu); break;
			case 'option':
				on_option(schema, tc);
				if (schema.options.has("optimize_for")) {
					let optimize_for = schema.options.get("optimize_for")
					switch (optimize_for) {
						case 'SPEED': case 'CODE_SIZE': case 'LITE_RUNTIME':
							schema.optimize_for = optimize_for;
					}
				}
				break;
			case 'import': on_import(schema, tc); break;
			case 'extend': on_extend(schema, tc, lu); break;
			case 'service': on_service(schema, tc); break;
			default: throw new SyntaxError(`Unexpected token: ${tc.next()}`)
		}
	}

	schema_extend: for (const ext of schema.extends) for (const msg of schema.messages) if (msg.name === ext.name) for (const field of ext.msg.fields) {
		if (!msg.extensions || field.tag < msg.extensions.from || field.tag > msg.extensions.to)
			throw new ReferenceError(`${msg.name} does not declare ${field.tag} as an extension number`)

		msg.fields.push(field)
	}
	schema_pack: for (const msg of schema.messages) for (const field of msg.fields) if (field.packed && !PACKABLE_TYPES.includes(field.type)) {
		// check enum type
		type LUE = LookupIn<'enum'> | undefined;
		let type = lu.find(f => f.name === field.type && f.is === 'enum') as LUE
		if (type) continue
		else if (field.type.includes('.')) {
			const types = field.type.split('.')
			let last = types.pop()
			const mfind = (f: typeof lu[0]) => f.name === last && f.is === 'enum'
			let curr = lu.find(mfind) as LUE
			if (curr) while (types.length && curr) {
				last = `${types.pop()!}.${last}`
				let c = lu.find(mfind) as LUE
				if (c && curr.value === c.value) curr = c
			}

			if (!curr)
				throw new ReferenceError(`Cannot find field type ${field.type}`)

			if (curr) continue
		}
		else if (msg.enums.some(en => en.name === field.type)) continue;
		else if (schema.enums.some(en => en.name === field.type)) continue;

		throw new SyntaxError(`Fields of type ${field.type} cannot be declared [packed=true]. Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared as "packed". See https://developers.google.com/protocol-buffers/docs/encoding#optional`)
	}
	return schema
}
