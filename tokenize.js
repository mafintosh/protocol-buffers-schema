module.exports = function (sch) {
  const noComments = function (line) {
    const i = line.indexOf('//')
    return i > -1 ? line.slice(0, i) : line
  }

  const noMultilineComments = function () {
    let inside = false
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

  const trim = function (line) {
    return line.trim()
  }

  const removeQuotedLines = function (list) {
    return function (str) {
      const s = '$' + list.length + '$'
      list.push(str)
      return s
    }
  }

  const restoreQuotedLines = function (list) {
    const re = /^\$(\d+)\$$/
    return function (line) {
      const m = line.match(re)
      return m ? list[+m[1]] : line
    }
  }

  const replacements = []
  return sch
    .replace(/"(\\"|[^"\n])*?"|'(\\'|[^'\n])*?'/gm, removeQuotedLines(replacements))
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
    .map(restoreQuotedLines(replacements))
}
