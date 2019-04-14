export declare const PACKABLE_TYPES: readonly string[];
export declare type NameMappedValueMap = Map<string, string>;
export declare class Options {
    readonly options: NameMappedValueMap;
}
export declare class MessageField extends Options {
    name: string;
    type: string;
    tag: number;
    map: null | {
        from: string;
        to: string;
    };
    oneof: string;
    required: boolean;
    repeated: boolean;
    deprecated: boolean;
    packed: boolean;
    optional: boolean;
}
export declare function onPackageName(schema: Schema, t: TokenCount): void;
export declare function onSyntaxVersion(schema: Schema, n: TokenCount): void;
export declare function onOption<T extends Options>({ options }: T, n: TokenCount): void;
declare class EnumValue extends Options {
    name: string;
    value: number;
    constructor(name: string, value: number);
}
declare class Enum extends Options {
    name: string;
    values: EnumValue[];
    constructor(name: string);
}
declare type Enums = {
    enums: Enum[];
};
export declare function onEnum<T extends Enums>({ enums }: T, n: TokenCount): void;
export declare class Message extends Options {
    name: string;
    enums: Enum[];
    extends: Extends[];
    messages: Message[];
    fields: MessageField[];
    extensions: null | {
        from: number;
        to: number;
    };
    constructor(name: string);
}
export interface Messages {
    messages: Message[];
}
export declare function onMessage<T extends Messages>({ messages }: T, c: TokenCount): Message;
declare class Extends {
    name: string;
    messages: Message[];
    constructor(name: string);
}
interface Extendss {
    extends: Extends[];
}
export declare function onExtend<T extends Extendss>({ extends: extendss }: T, c: TokenCount): void;
export declare function onImport({ imports }: Schema, c: TokenCount): void;
declare class RPC extends Options {
    name: string;
    constructor(name: string);
    input_type: string;
    output_type: string;
    client_streaming: boolean;
    server_streaming: boolean;
}
declare class Service extends Options {
    name: string;
    constructor(name: string);
    methods: RPC[];
}
export declare function onService({ services }: Schema, c: TokenCount): void;
export declare class Schema extends Options {
    syntax: 2 | 3;
    package: string;
    imports: string[];
    enums: Enum[];
    messages: Message[];
    extends: Extends[];
    services: Service[];
}
export declare class TokenCount {
    private tokens;
    t: number;
    done: boolean;
    constructor(tokens: readonly string[]);
    peek(n?: number): string;
    next(n?: number): string;
}
export {};
//# sourceMappingURL=parser-internals.d.ts.map