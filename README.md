# protobuf-schema

No nonsense [protobuf](https://code.google.com/p/protobuf/) schema parser written in Javascript

``` js
npm install protobuf-schema
```

## Usage

First save the following file as `example.proto`

```
message Point {
  required int32 x = 1;
  required int32 y=2;
  optional string label = 3;
}

message Line {
  required Point start = 1;
  required Point end = 2;
  optional string label = 3;
}
```

``` js
var fs = require('fs')
var schema = require('protobuf-schema')

// pass a buffer or string to schema.parse
var sch = schema.parse(fs.readFileSync('example.proto'))

// will print out the schema as a javascript object
console.log(sch)
```

Running the above example will print something like

``` js
{
  "package": null,
  "enums": [],
  "messages": [
    {
      "name": "Point",
      "enums": [],
      "messages": [],
      "fields": [
        {
          "name": "x",
          "type": "int32",
          "tag": 1,
          "required": true,
          "repeated": false,
          "options": {}
        },
        {
          "name": "y",
          "type": "int32",
          "tag": 2,
          "required": true,
          "repeated": false,
          "options": {}
        },
        {
          "name": "label",
          "type": "string",
          "tag": 3,
          "required": false,
          "repeated": false,
          "options": {}
        }
      ]
    },
    {
      "name": "Line",
      "enums": [],
      "messages": [],
      "fields": [
        {
          "name": "start",
          "type": "Point",
          "tag": 1,
          "required": true,
          "repeated": false,
          "options": {}
        },
        {
          "name": "end",
          "type": "Point",
          "tag": 2,
          "required": true,
          "repeated": false,
          "options": {}
        },
        {
          "name": "label",
          "type": "string",
          "tag": 3,
          "required": false,
          "repeated": false,
          "options": {}
        }
      ]
    }
  ]
}
```

## License

MIT