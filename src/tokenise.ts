const trim: ((s: string) => string) = Function.prototype.call.bind(''.trim)
const noComments = (ln: string): string => {
	let i = ln.indexOf('//');
	return i === -1 ? ln : ln.slice(0, i);
}
const noMultiLineComments = (): ((tk: string) => boolean) => {
	let inside = false;
	return tk => {
		switch (tk) {
			case '/*': inside = true; return false;
			case '*/': inside = false; return false;
			default: return !inside;
		}
	}
}
const joinInternalStrings = () => {
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
const tokenRetriever = /([;,{}()=:[\]<>]|\/\*|\*\/)/g;
export const tokenise = (s: string): string[] => s
	.replace(tokenRetriever, ' $1 ')
	.split(/[\r\n]+/g)
	.map(noComments)
	.map(trim)
	.filter(Boolean)
	.join('\n')
	.split(/\s+|\n+/gm)
	.filter(noMultiLineComments())
	.reduce(joinInternalStrings(), []);
export default tokenise;
