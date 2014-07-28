# protobuf-schema

No nonsense [protobuf](https://code.google.com/p/protobuf/) schema parser written in Javascript

``` js
npm install protobuf-schema
```

## Usage

``` js
var schema = require('protobuf-schema')

schema.parse('                   \
  message Point {                \
    required int32 x = 1;        \
    required int32 y=2;          \
    optional string label = 3;   \
  }                              \
                                 \
  message Line {                 \
    required Point start = 1;    \
    required Point end = 2;      \
    optional string label = 3;   \
  }                              \
')
```

## License

MIT