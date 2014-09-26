var tokenize = require('./tokenize')
var fs       = require('fs')
var path     = require('path')

var protos_root_dir = null

var onfieldoptions = function(tokens) {
  var opts = {}

  while (tokens.length) {
    switch(tokens[0]) {
      case '[':
      case ',':
      tokens.shift()
      var name = tokens.shift()
      if (tokens[0] !== '=') throw new Error('Unexpected token in field options: '+tokens[0])
      tokens.shift()
      if (tokens[0] === ']') throw new Error('Unexpected ] in field option')
      opts[name] = tokens.shift()
      break

      case ']':
      tokens.shift()
      return opts

      default:
      throw new Error('Unexpected token in field options: '+tokens[0])
    }
  }

  throw new Error('No closing tag for field options')
}

var onfield = function(tokens) {
  var param = []
  var field = {
    name: null,
    type: null,
    tag: 0,
    required: false,
    repeated: false,
    options: {}
  }

  while (tokens.length) {
    switch (tokens[0]) {
      case '=':
      tokens.shift()
      field.tag = parseInt(tokens.shift(), 10)
      break

      case 'repeated':
      case 'required':
      case 'optional':
      var t = tokens.shift()
      field.required = t === 'required'
      field.repeated = t === 'repeated'
      field.type = tokens.shift()
      field.name = tokens.shift()
      break

      case '[':
      field.options = onfieldoptions(tokens)
      break

      case ';':
      tokens.shift()
      return field

      default:
      throw new Error('Unexpected token in message field: '+tokens[0])
    }
  }

  throw new Error('No ; found for message field')
}

var onmessagebody = function(tokens) {
  var body = {
    enums: [],
    messages: [],
    fields: []
  }

  while (tokens.length) {
    switch (tokens[0]) {
      case 'repeated':
      case 'optional':
      case 'required':
      body.fields.push(onfield(tokens))
      break

      case 'enum':
      body.enums.push(onenum(tokens))
      break

      case 'message':
      body.messages.push(onmessage(tokens))
      break

      default:
      throw new Error('Unexpected token in message: '+tokens[0])
    }
  }

  return body
}

var onmessage = function(tokens) {
  tokens.shift()

  var lvl = 1
  var body = []
  var msg = {
    name: tokens.shift(),
    enums: [],
    messages: [],
    fields: []
  }

  if (tokens[0] !== '{') throw new Error('Expected { but found '+tokens[0])
  tokens.shift()

  while (tokens.length) {
    if (tokens[0] === '{') lvl++
    else if (tokens[0] === '}') lvl--

    if (!lvl) {
      tokens.shift()
      var body = onmessagebody(body)
      msg.enums = body.enums
      msg.messages = body.messages
      msg.fields = body.fields
      return msg
    }

    body.push(tokens.shift())
  }

  if (lvl) throw new Error('No closing tag for message')
}

var onpackagename = function(tokens) {
  tokens.shift()
  var name = tokens.shift()
  if (tokens[0] !== ';') throw new Error('Expected ; but found '+tokens[0])
  tokens.shift()
  return name
}

var onenumvalue = function(tokens) {
  if (tokens.length < 4) throw new Error('Invalid enum value: '+tokens.slice(0, 3).join(' '))
  if (tokens[1] !== '=') throw new Error('Expected = but found '+tokens[1])
  if (tokens[3] !== ';') throw new Error('Expected ; but found '+tokens[1])

  var name = tokens.shift()
  tokens.shift()

  var value = parseInt(tokens.shift(), 10)
  tokens.shift()

  return {
    name: name,
    value: value
  }
}

var onenum = function(tokens) {
  tokens.shift()

  var e = {
    name: tokens.shift(),
    values: {}
  }

  if (tokens[0] !== '{') throw new Error('Expected { but found '+tokens[0])
  tokens.shift()

  while (tokens.length) {
    if (tokens[0] === '}') {
      tokens.shift()
      return e
    }
    var val = onenumvalue(tokens)
    e.values[val.name] = val.value
  }

  throw new Error('No closing tag for enum')
}

var onoption = function(tokens) {
  var name = null
  var value = null

  var parse = function(value) {
    if (value === 'true') return true
    if (value === 'false') return false
    return value.replace(/^"+|"+$/gm,'')
  }

  while (tokens.length) {
    if (tokens[0] === ';') {
      tokens.shift()
      return {name:name, value:value}
    }
    switch (tokens[0]) {
      case 'option':
      tokens.shift()
      name = tokens.shift()
      break
 
      case '=':
      tokens.shift()
      if (name === null) throw new Error('Expected key for option with value: '+tokens[0])
      value = parse(tokens.shift())
      if (name === 'optimize_for' && !/^(SPEED|CODE_SIZE|LITE_RUNTIME)$/.test(value)) {
        throw new Error('Unexpected value for option optimize_for: '+value)
      }
      break
      
      default:
      throw new Error('Unexpected token in option: '+tokens[0])
    }
  }
}

var onimport = function(tokens) {
  tokens.shift()
  var file = tokens.shift().replace(/^"+|"+$/gm,'')
  if (protos_root_dir) file = protos_root_dir+file

  if (tokens[0] !== ';') {
    throw new Error('Unexpected token: '+tokens[0]+'. Expected ";"')
  }
  tokens.shift()
  if (!fs.existsSync(file)) {
    throw new Error('Imported file '+file+' not found')
  }
  return loadProtoFile(file)
}

var loadProtoFile = function(file, opt) {
  if (!opt) {
    opt = {
      root_dir: path.dirname(file)
    } 
  }
  return parse(fs.readFileSync(file,opt))
}

var parse = function(buf,options) {
  if (!options) options = {}

  if (options.root_dir) protos_root_dir = options.root_dir

  var tokens = tokenize(buf.toString())
  var schema = {
    package: null,
    enums: [],
    messages: [],
    options: {}
  }

  while (tokens.length) {
    switch (tokens[0]) {
      case 'package':
      schema.package = onpackagename(tokens)
      break

      case 'message':
      schema.messages.push(onmessage(tokens))
      break

      case 'enum':
      schema.enums.push(onenum(tokens))
      break

      case 'option':
      var opt = onoption(tokens)
      if (schema.options[opt.name]) throw new Error('Duplicate option '+opt.name)
      schema.options[opt.name] = opt.value
      break

      case 'import':
      var imported = onimport(tokens)
      imported.enums.forEach(function(e){
        schema.enums.push(e)
      })
      imported.messages.forEach(function(e){
        schema.messages.push(e)
      })
      break

      default:
      throw new Error('Unexpected token: '+tokens[0])
    }
  }
  return schema
}
module.exports = parse
module.exports.loadProtoFile = loadProtoFile
/* vim: set ts=2 sw=2 sts=2 et: */
