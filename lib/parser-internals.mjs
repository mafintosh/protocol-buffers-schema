const MAX_RANGE = 0x1FFFFFFF;
// "Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared "packed"."
export const PACKABLE_TYPES = Object.freeze([
    // varint wire types
    'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'bool',
    // + ENUMS
    // 64-bit wire types
    'fixed64', 'sfixed64', 'double',
    // 32-bit wire types
    'fixed32', 'sfixed32', 'float'
]);
const parseBool = (m, s) => {
    if (m.options.has(s))
        switch (m.options.get(s)) {
            case "true": return true;
            case "false": return false;
            default: throw new SyntaxError(`Cannot convert value of ${s} (${m.options.get(s)}) to boolean`);
        }
    return false;
};
const optionsWeakMap = new WeakMap();
export class Options {
    get options() {
        let m = optionsWeakMap.get(this);
        if (!m) {
            m = new Map();
            optionsWeakMap.set(this, m);
        }
        return m;
    }
}
export class MessageField extends Options {
    constructor() {
        super(...arguments);
        this.name = '';
        this.type = '';
        this.tag = -1;
        this.map = null;
        this.oneof = '';
        this.required = false;
        this.repeated = false;
        this.deprecated = false;
        this.packed = false;
        this.optional = false;
    }
}
function onField({ fields }, c) {
    const field = new MessageField;
    while (!c.done)
        switch (c.peek()) {
            case '=':
                field.tag = Number(c.next(2));
                break;
            case 'map':
                if (c.peek(1) !== '<')
                    throw new SyntaxError(`Unexpected token in map type: ${c.peek(1)}`);
                if (c.peek(3) !== ',')
                    throw new SyntaxError(`Unexpected token in map type: ${c.peek(3)}`);
                if (c.peek(5) !== '>')
                    throw new SyntaxError(`Unexpected token in map type: ${c.peek(5)}`);
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
                    let t = c.next();
                    field.required = t === 'required';
                    field.repeated = t === 'repeated';
                    field.type = c.next();
                    field.name = c.next();
                }
                break;
            case '[':
                onFieldOptions(field, c);
                field.packed = parseBool(field, "packed");
                field.deprecated = parseBool(field, "deprecated");
                break;
            case ';':
                if (field.name === '')
                    throw new SyntaxError('Missing field name');
                if (field.type === '')
                    throw new SyntaxError(`Missing type in message field: ${field.name}`);
                if (field.tag === -1)
                    throw new SyntaxError(`Missing tag number in message field: ${field.name}`);
                fields.push(field);
                c.t++;
                return field;
            default:
                field.type = c.next();
                field.name = c.next();
                break;
        }
    throw new Error('No ; found for message field');
}
function onFieldOptions({ options }, c) {
    while (!c.done)
        switch (c.peek()) {
            case '[':
            case ',':
                {
                    let name = c.next(2);
                    if (name === ')') {
                        name = c.next();
                        c.t++;
                    }
                    if (c.next() !== '=')
                        throw new SyntaxError(`Unexpected token in field options in ${name}`);
                    if (c.peek() === ']')
                        throw new SyntaxError(`Unexpected ] in field option in ${name}`);
                    let value = c.next();
                    options.set(name, value);
                }
                break;
            case ']':
                c.t++;
                return;
            default:
                throw new SyntaxError(`Unexpected token in field options: ${c.peek()}`);
        }
    throw new SyntaxError('No closing tag for field options');
}
export function onPackageName(schema, t) {
    schema.package = t.next(2);
    if (t.next() !== ';')
        throw new SyntaxError(`No ; found after package name ${schema.package}`);
}
export function onSyntaxVersion(schema, n) {
    if (n.peek(1) !== '=')
        throw new SyntaxError(`Syntax version missing assignment`);
    switch (n.next(3)) {
        case '"proto2"':
            n.t++;
            schema.syntax = 2;
            return 2;
        case '"proto3"':
            n.t++;
            schema.syntax = 3;
            return 3;
    }
    throw new SyntaxError(`${n.peek(-2)} is not a valid protobuf syntax version`);
}
export function onOption({ options }, n) {
    let name = '', value = '', paren = false;
    while (!n.done)
        switch (n.next()) {
            case ';':
                if (options.has(name))
                    throw new SyntaxError(`Duplicate option named ${name} on same options value`);
                options.set(name, value);
                return;
            case 'option':
                paren = n.peek() === '(';
                name = n.next(+paren + 1);
                if (paren && n.next() !== ')')
                    throw new SyntaxError(`Parenthesised options must be closed (name: ${name})`);
                if (n.peek()[0] === '.')
                    name += n.next();
                break;
            case '=':
                if (name === '')
                    throw new SyntaxError(`Name must be provided for option with value ${n.peek()}`);
                value = n.next();
                if (name === 'optimize_for')
                    switch (value) {
                        default: throw new SyntaxError(`Unexpected value for option optimize_for: ${value}`);
                        case 'SPEED':
                        case 'CODE_SIZE':
                        case 'LITE_RUNTIME':
                    }
                else if (value === '{')
                    throw new Error('Map options are currently unimplemented.');
                break;
        }
}
export class EnumValue extends Options {
    constructor(name, value) {
        super();
        this.name = name;
        this.value = value;
    }
}
export class Enum extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.values = [];
    }
}
function onEnumValue(e, n) {
    while (!n.done)
        switch (n.peek()) {
            case 'reserved': break;
            default: {
                let name = n.next();
                if (n.next() !== '=')
                    throw new SyntaxError(`enum value missing setter value`);
                let value = +n.next();
                let ret = new EnumValue(name, value);
                if (n.peek() === '[')
                    onFieldOptions(ret, n);
                if (n.next() !== ';')
                    throw new SyntaxError(`enum value missing semicolon`);
                e.values.push(ret);
                return ret;
            }
        }
    throw new SyntaxError(`enum value was not closed before token completion`);
}
;
export function onEnum({ enums }, n) {
    const tenum = new Enum(n.next(2));
    n.next();
    while (!n.done)
        switch (n.peek()) {
            case 'option':
                onOption(tenum, n);
                break;
            case '}':
                n.next(n.peek(0) === ';' ? 2 : 1);
                enums.push(tenum);
                return;
            default:
                onEnumValue(tenum, n);
        }
}
export class Message extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.enums = [];
        this.extends = [];
        this.messages = [];
        this.fields = [];
        this.extensions = null;
    }
}
export function onMessage({ messages }, c) {
    const m = new Message(c.next(2));
    let lvl = 0;
    while (!c.done)
        switch (c.peek()) {
            case '{':
                ++lvl;
                ++c.t;
                break;
            case '}':
                ++c.t;
                if (!--lvl) {
                    messages.push(m);
                    return m;
                }
                break;
            case 'map':
            case 'required':
            case 'optional':
            case 'repeated':
                onField(m, c);
                break;
            case 'enum':
                onEnum(m, c);
                break;
            case 'message':
                onMessage(m, c);
                break;
            case 'extensions':
                onExtensions(m, c);
                break;
            case 'oneof':
                {
                    let name = c.next(2);
                    if (c.next() !== '{')
                        throw new SyntaxError(`Unexpected oneof token: ${c.peek(-1)}; should be {`);
                    while (c.peek() !== '}') {
                        const field = onField(m, c);
                        field.oneof = name;
                        field.optional = true;
                    }
                    c.t++;
                }
                break;
            case 'extend':
                onExtend(m, c);
                break;
            case ';':
                c.t++;
                break;
            case 'reserved':
            case 'option':
                do
                    ++c.t;
                while (c.peek() !== ';');
                break;
            default:
                onField(m, c).optional = true;
                break;
        }
    throw new SyntaxError(`message was not closed before token completion`);
}
function onExtensions(m, c) {
    const from = +c.next(2);
    if (isNaN(from))
        throw new SyntaxError(`Invalid "from" value in extensions definition`);
    if (c.next() !== 'to')
        throw new Error("Expected keyword 'to' in extensions definition");
    let sto = c.next();
    const to = sto === 'max' ? MAX_RANGE : +sto;
    if (isNaN(to))
        throw new SyntaxError(`Invalid "to" value in extensions definition`);
    if (c.next() !== ';')
        throw new SyntaxError('Missing ; in extensions definition');
    m.extensions = { from, to };
}
export class Extends {
    constructor(name) {
        this.name = name;
        this.messages = [];
    }
}
export function onExtend({ extends: extendss }, c) {
    let e = new Extends(c.peek(2));
    onMessage(e, c);
    extendss.push(e);
}
export function onImport({ imports }, c) {
    let file = c.next(2).replace(/^(?:"([^"]+)"|'([^']+)')$/, '$1$2');
    if (c.next() !== ';')
        throw new SyntaxError(`Expected ";" after import filename.`);
    imports.push(file);
}
export class RPC extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.input_type = '';
        this.output_type = '';
        this.client_streaming = false;
        this.server_streaming = false;
    }
}
export class Service extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.methods = [];
    }
}
export function onService({ services }, c) {
    const serv = new Service(c.next(2));
    if (c.next() !== '{')
        throw new SyntaxError(`Unexpected service token: ${c.peek(-1)}`);
    while (!c.done)
        switch (c.peek()) {
            case '}':
                c.next();
                if (c.peek() === ';')
                    c.t++;
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
function onRPC({ methods }, c) {
    const e = (...chars) => {
        for (const char of chars)
            if (char !== c.next())
                throw new SyntaxError(`Unexpected RPC token: ${c.peek(-1)}; expected "${char}"`);
    };
    const rpc = new RPC(c.next(2));
    e('(');
    if (c.peek() === 'stream') {
        rpc.client_streaming = true;
        c.t++;
    }
    rpc.input_type = c.next();
    e(')', 'returns', '(');
    if (c.peek() === 'stream') {
        rpc.server_streaming = true;
        c.t++;
    }
    rpc.output_type = c.next();
    e(')');
    if (c.peek() === '{')
        while (!c.done)
            switch (c.next()) {
                case '}':
                    if (c.peek() === ';')
                        c.t++;
                    methods.push(rpc);
                    return rpc;
                case 'option':
                    onOption(rpc, c);
                    break;
            }
    else if (c.peek() === ';') {
        c.t++;
        methods.push(rpc);
        return rpc;
    }
    throw new Error('No closing tag for rpc');
}
export class TokenCount {
    constructor(tokens) {
        this.tokens = tokens;
        this.t = 0;
        this.l = tokens.length;
        this.done = this.l === 0;
    }
    peek(n = 0) {
        return this.tokens[this.t + n];
    }
    next(n = 1) {
        if (n < 1)
            throw new RangeError();
        this.done = this.l === (this.t += n);
        return this.tokens[this.t - 1];
    }
}
//# sourceMappingURL=parser-internals.js.map