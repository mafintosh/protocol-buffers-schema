const trim: ((s: string) => string) = Function.prototype.call.bind(''.trim)
const no_comments = (ln: string): string => {
	let idx = ln.indexOf('//');
	if (idx === -1) return ln
	let start = 0, end = 0, len = ln.length, char = '';
	for (let j = 0; j < len; ++j) {
		if (char) {
			if (ln[j] === char) {
				if (end !== 0) { start = j; end = 0 }
				else if (start !== 0) { end = j }
				else { start = j }
				char = ''
			}
		}
		else if (ln[j] === '"') {char = ln[j]}
		else if (ln[j] === "'") {char = ln[j]}
	}
	const in_value = start !== end && start < idx && end > idx
	return in_value ? ln : ln.slice(0, idx)
}
const no_multi_line_comments = (): ((tk: string) => boolean) => {
	let inside = false;
	return tk => {
		switch (tk) {
			case '/*': inside = true; return false;
			case '*/': inside = false; return false;
			default: return !inside;
		}
	}
}
const join_internal_strings = () => {
	let str = '',
		init = /^("([^"]|\\")*|'([^']|\\')*)$/,
		end = /^(([^"]|\\")*"|([^']|\\')*')$/;
	return (tokens: string[], val: string): string[] => {
		if (str.length) {
			str += val
			if (end.test(val)) {
				tokens.push(str)
				str = ''
			}
		} else if (init.test(val)) str = val
		else tokens.push(val)
		return tokens
	}
}
const token_retriever = /([;,{}()=:[\]<>]|\/\*|\*\/)/g;
export const tokenise = (s: string): string[] => s
	.replace(token_retriever, ' $1 ')
	.split(/[\r\n]+/g)
	.map(no_comments)
	.map(trim)
	.filter(Boolean)
	.join('\n')
	.split(/\s+|\n+/gm)
	.filter(no_multi_line_comments())
	.reduce(join_internal_strings(), []);
export default tokenise;
