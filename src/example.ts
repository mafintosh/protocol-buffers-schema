import { parse } from './parse'

let parsed = parse(`syntax = "proto3";
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
`)

console.log('Parsed:')
console.debug(parsed)
console.log(JSON.stringify(parsed, null, 2))
console.log('Stringified:')
console.log(parsed.toString())
