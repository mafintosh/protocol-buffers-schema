var tape = require('tape')
var path = require('path')
var fs = require('fs')
var schema = require('../')

var fixture = function (name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8')
}

tape('basic parse', function (t) {
  t.same(schema.parse(fixture('basic.proto')), require('./fixtures/basic.json'))
  t.end()
})

tape('basic parse + stringify', function (t) {
  t.same(schema.stringify(schema.parse(fixture('basic.proto'))), fixture('basic.proto'))
  t.end()
})

tape('complex parse', function (t) {
  t.same(schema.parse(fixture('complex.proto')), require('./fixtures/complex.json'))
  t.end()
})

tape('complex parse + stringify', function (t) {
  t.same(schema.stringify(schema.parse(fixture('complex.proto'))), fixture('complex.proto'))
  t.end()
})

tape('throws on invalid', function (t) {
  t.plan(2)
  try {
    schema.parse('hello world')
  } catch (err) {
    t.ok(true, 'should fail')
  }
  try {
    schema.parse('message Foo { lol }')
  } catch (err) {
    t.ok(true, 'should fail')
  }
})

tape('comments parse', function (t) {
  t.same(schema.parse(fixture('comments.proto')), require('./fixtures/comments.json'))
  t.end()
})

tape('schema with imports', function (t) {
  t.same(schema.parse(fixture('search.proto')), require('./fixtures/search.json'))
  t.end()
})

tape('schema with imports loaded by path', function (t) {
  t.same(schema.parse(fixture('search.proto')), require('./fixtures/search.json'))
  t.end()
})

tape('schema with extends', function (t) {
  t.same(schema.parse(fixture('extend.proto')), require('./fixtures/extend.json'))
  t.end()
})

tape('comparing extended and not extended schema', function (t) {
  var sch = schema.parse(fixture('extend.proto'))
  t.same(sch.messages.MsgNormal, sch.messages.MsgExtend)
  t.end()
})

tape('schema with oneof', function (t) {
  t.same(schema.parse(fixture('oneof.proto')), require('./fixtures/oneof.json'))
  t.end()
})
