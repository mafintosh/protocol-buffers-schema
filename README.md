# protocol-buffers-schema

No nonsense [protocol buffers](https://developers.google.com/protocol-buffers) schema parser written in Typescript

``` js
npm install protocol-buffers-schema-ts
```

[![build status](http://img.shields.io/travis/ZaneHannanAU/protocol-buffers-schema.svg?style=flat)](http://travis-ci.org/ZaneHannanAU/protocol-buffers-schema)

## Usage

First save the following file as `example.proto`

```proto
syntax = "proto3";
package example;
option java_package = "com.example";
option optimize_for = SPEED;
import "other.proto";
// example file
enum Hello {
  Hello = 0;
  Welcome = 1;
  GDay = 2;
  Yo = 3;
}

message Test {
  map<string, string> data = 1;
  required string hello = 2;
  oneof test {
    uint32 age = 3;
    uint32 year = 4;
  }
  message Nested {
    optional bytes thing = 1;
  }
  Nested item = 5;
  required Hello welcoming = 6;
  /** A block comment
    * Longer
    * Longer
    */
  repeated uint32 timings = 7[deprecated=true];
  repeated uint32 timings_info = 8 [packed=true];
}
service ServiceName {
  rpc MethodName (Hello) returns (Test);
}
```

The run the following example

```typescript
import { readFileSync } from 'fs';
import { parse } from 'protocol-buffers-schema-ts';

// pass a buffer or string (implements Object.toString()) to schema.parse.
var sch = parse(readFileSync('example.proto'))

// will print out the schema as a javascript object
console.log(sch)
```

Running the above example will print something similar to

``` js
Schema {
  syntax: 3,
  package: 'example',
  imports: [ 'other.proto' ],
  enums:
   [ Enum { name: 'Hello', enums: [], values: [Array], allow_alias: false } ],
  messages:
   [ Message {
       name: 'Test',
       enums: [],
       extends: [],
       messages: [Array],
       fields: [Array],
       extensions: null } ],
  extends: [],
  services: [ Service { name: 'ServiceName', methods: [Array] } ],
  optimize_for: 'SPEED' }
```

Note that this example is included as `lib/example`.

## API

### `parse<T extends {toString(): string}>(from: T): Schema`

Parses a .proto schema into a javascript object

### `Schema.toString()`

Stringifies a parsed schema back into .proto format

### `Schema.toJSON()`

Converts a parsed schema into its JSON equivalent.

## License

MIT
