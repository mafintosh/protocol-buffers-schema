const trim: ((s: string) => string) = Function.prototype.call.bind(''.trim)
const no_comments = (ln: string): string => {
	let idx = ln.indexOf('//');
	if (idx === -1) return ln
	if (idx === 0) return ''
	let start = 0, end = 0, len = ln.length, char = '';
	for (let i = 0; i < len; ++i) {
		if (char) {
			if (ln[i] === char) {
				if (end !== 0) { start = i; end = 0 }
				else if (start !== 0) {
					end = i
					if (idx < end && idx > start) {
						idx = ln.indexOf('//', end)
						if (idx === -1) return ln
					}
				} else {
					start = i
					if (idx < start) return ln.slice(0, idx)
				}
				char = ''
			}
		}
		else if (ln[i] === '"') {char = ln[i]; start = i;}
		else if (ln[i] === "'") {char = ln[i]; start = i;}
		else if (ln[i] === '/' && ln[i+1] === '/') return ln.slice(0, idx)
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
/*
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
*/
const token_retriever = /([;,{}()=:[\]<>]|\/\*|\*\/|"[^"\r\n]*"|'[^'\r\n]*')/g;
export const tokenise = (s: string): string[] => s
	.replace(token_retriever, ' $1 ')
	.split(/[\r\n]+/g)
	.map(no_comments)
	.map(trim)
	.join('\n')
	.split(/("[^"\r\n]*"|'[^'\r\n]*'|\s+|\n+)/gm)
	.map(trim)
	.filter(Boolean)
	.filter(no_multi_line_comments());
	//.reduce(join_internal_strings(), []);
export default tokenise;
