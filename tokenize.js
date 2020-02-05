module.exports = function (sch) {
  var noComments = function (line) {
    var i = line.indexOf('//')
    if (i === -1) return line
    // check // in value, like [default= "http://127.0.0.1"]
    var start = 0
    var end = 0
    var len = line.length
    for (var j = 0; j < len; j++) {
      if (line[j] === '"') {
        if (end !== 0) {
          start = j
          end = 0
        } else if (start !== 0) {
          end = j
        } else {
          start = j
        }
      }
    }
    var inValue = start !== end && start < i && end > i
    return inValue ? line : line.slice(0, i)
  }

  var noMultilineComments = function () {
    var inside = false
    return function (token) {
      if (token === '/*') {
        inside = true
        return false
      }
      if (token === '*/') {
        inside = false
        return false
      }
      return !inside
    }
  }

  var trim = function (line) {
    return line.trim()
  }

  return sch
    .replace(/([;,{}()=:[\]<>]|\/\*|\*\/)/g, ' $1 ')
    .split(/\n/)
    .map(trim)
    .filter(Boolean)
    .map(noComments)
    .map(trim)
    .filter(Boolean)
    .join('\n')
    .split(/\s+|\n+/gm)
    .filter(noMultilineComments())
}
