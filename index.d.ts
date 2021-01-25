
import { Schema } from "./types";
declare namespace parse {
    function parse(buffer: string | Uint8Array): Schema;
    function stringify(schema: Schema): string;
}

declare function parse(buffer: string | Uint8Array): Schema;

export = parse;
