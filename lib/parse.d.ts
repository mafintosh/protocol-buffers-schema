import { Schema } from "./parser-internals";
interface ToString {
    toString(): string;
}
export declare function parse<T extends ToString>(from: T): Schema;
export {};
//# sourceMappingURL=parse.d.ts.map