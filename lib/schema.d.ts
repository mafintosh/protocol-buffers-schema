import { Options, Enum, Message, Extends, Service } from "./parser-internals";
export declare class Schema extends Options {
    syntax: 2 | 3;
    package: string;
    imports: string[];
    enums: Enum[];
    messages: Message[];
    extends: Extends[];
    services: Service[];
    optimize_for: "SPEED" | "CODE_SIZE" | "LITE_RUNTIME" | "AUTO";
    toString(): string;
}
//# sourceMappingURL=schema.d.ts.map