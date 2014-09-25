var onfield = function(f, result) {
  var prefix = f.repeated ? 'repeated' : f.required ? 'required' : 'optional'

  var opts = Object.keys(f.options || {}).map(function(key) {
    return key+' = '+f.options[key]
  }).join(',')

  if (opts) opts = ' ['+opts+']'

  result.push(prefix+' '+f.type+' '+f.name+' = '+f.tag+opts+';')
  return result
}

var onmessage = function(m, result) {
  result.push('message '+m.name+' {')

  if (!m.enums) m.enums = []
  m.enums.forEach(function(e) {
    result.push(onenum(e, []))
  })

  if (!m.messages) m.messages = []
  m.messages.forEach(function(m) {
    result.push(onmessage(m, []))
  })

  if (!m.fields) m.fields = []
  m.fields.forEach(function(f) {
    result.push(onfield(f, []))
  })

  result.push('}', '')
  return result
}

var onenum = function(e, result) {
  result.push('enum '+e.name+' {')

  var vals = Object.keys(e.values).map(function(key) {
    return key+' = '+e.values[key]+';'
  })

  result.push(vals)
  result.push('}', '')
  return result
}

var onoption = function(o, result) {
  option = Object.keys(o)[0]
  value = o[option]
  if (typeof value === 'string' && option !== "optimize_for") value = '"'+value+'"'
  return result.push('option '+option+' = '+value+';')
}

var indent = function(lvl) {
  return function(line) {
    if (Array.isArray(line)) return line.map(indent(lvl+'  ')).join('\n')
    return lvl+line
  }
}

module.exports = function(schema) {
  var result = []
  if (schema.package) result.push('package '+schema.package+';', '')

  if (!schema.options) schema.options = []
  schema.options.forEach(function(o){
    onoption(o,result)
  })
  if(schema.options.length !== 0) {
    result.push('')
  }

  if (!schema.enums) schema.enums = []
  schema.enums.forEach(function(e) {
    onenum(e, result)
  })

  if (!schema.messages) schema.messages = []
  schema.messages.forEach(function(m) {
    onmessage(m, result)
  })

  return result.map(indent('')).join('\n')
}
/* vim: set ts=2 sw=2 sts=2 et: */
