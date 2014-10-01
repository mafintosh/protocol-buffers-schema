var parse = require('./parse')
var stringify = require('./stringify')

module.exports = parse.parse
module.exports.parse = parse.parse
module.exports.read = parse.read
module.exports.stringify = stringify
