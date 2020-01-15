export interface Span {
    value: string;

    color: string | number | undefined;
    bgColor: string | number | undefined;

    bold: boolean;
    dim: boolean;
    italic: boolean;
    underline: boolean;
    blink: boolean;
    inverse: boolean;
    strike: boolean;
}

function createSpan(last?: Span): Span {
    return {
        value: "",
        color: last ? last.color : undefined,
        bgColor: last ? last.bgColor : undefined,
        bold: last ? last.bold : false,
        dim: last ? last.dim : false,
        italic: last ? last.italic : false,
        underline: last ? last.underline : false,
        blink: last ? last.blink : false,
        inverse: last ? last.inverse : false,
        strike: last ? last.strike : false,
    };
}

function isWhiteSpace(c: string): boolean {
    if (c === "\r") return false;
    if (c === "\n") return false;
    return /^\s$/.test(c);
}

function getColorName(code: number): string {
    const colors = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
    ];

    if ((code >= 30 && code <= 37) || (code >= 40 && code <= 47)) {
        return colors[code % 10];
    } else if ((code >= 90 && code <= 97) || (code >= 100 && code <= 107)) {
        const color = colors[code % 10];
        return "bright" + color[1].toUpperCase() + color.substring(1);
    }
    throw new Error(`invalid color code: ${code}`);
}

type CodeState = "sgr" | "fgprefix" | "fg" | "bgprefix" | "bg";
type EscapeState = "text" | "bracket" | "code";
const ESCAPE = "\u001b";
export function parseAnsi(str: string, splitOnWord: boolean): Span[] {
    let span = createSpan();
    const spans: Span[] = [span];
    let escapeState: EscapeState = "text";

    let codeState: CodeState = "sgr";
    let code = "";

    function nextSpan(): void {
        span = createSpan(span);
        spans.push(span);
    }

    function applyCode(): void {
        const n = Number(code);

        switch (codeState) {
            case "sgr":
                if (n === 0) {
                    span.color = undefined;
                    span.bgColor = undefined;
                    span.bold = span.dim = span.italic = span.underline = false;
                    span.blink = span.inverse = span.strike = false;
                } else if (n === 1) {
                    span.bold = true;
                } else if (n === 2) {
                    span.dim = true;
                } else if (n === 3) {
                    span.italic = true;
                } else if (n === 4) {
                    span.underline = true;
                } else if (n === 5 || n === 6) {
                    span.blink = true;
                } else if (n === 7) {
                    span.inverse = true;
                } else if (n === 9) {
                    span.strike = true;
                } else if (n === 22) {
                    span.bold = false;
                    span.dim = false;
                } else if (n === 23) {
                    span.italic = false;
                } else if (n === 24) {
                    span.underline = false;
                } else if (n === 25) {
                    span.blink = false;
                } else if (n === 27) {
                    span.inverse = false;
                } else if (n === 29) {
                    span.strike = false;
                } else if ((n >= 30 && n <= 37) || (n >= 90 && n <= 97)) {
                    span.color = getColorName(n);
                } else if (n === 38) {
                    codeState = "fgprefix";
                } else if (n === 39) {
                    span.color = undefined;
                } else if ((n >= 40 && n <= 47) || (n >= 100 && n <= 107)) {
                    span.bgColor = getColorName(n);
                } else if (n === 48) {
                    codeState = "bgprefix";
                } else if (n === 49) {
                    span.bgColor = undefined;
                }
                break;
            case "fgprefix":
                if (n === 5) {
                    codeState = "fg";
                } else {
                    codeState = "sgr";
                }
                break;
            case "fg":
                span.color = n;
                break;
            case "bgprefix":
                if (n === 5) {
                    codeState = "bg";
                } else {
                    codeState = "sgr";
                }
                break;
            case "bg":
                span.bgColor = n;
                break;
        }
        code = "";
    }

    let whitespace = false;
    for (const c of str) {
        switch (escapeState) {
            case "text":
                if (c === ESCAPE) {
                    escapeState = "bracket";
                } else if (splitOnWord && isWhiteSpace(c)) {
                    span.value += c;
                    whitespace = true;
                } else if (splitOnWord && !isWhiteSpace(c) && whitespace) {
                    whitespace = false;
                    nextSpan();
                    span.value += c;
                } else {
                    span.value += c;
                }
                break;
            case "bracket":
                if (c === "[") {
                    escapeState = "code";
                    nextSpan();
                } else {
                    escapeState = "text";
                }
                break;
            case "code":
                if (c >= "0" && c <= "9") {
                    code += c;
                } else if (c === ";") {
                    applyCode();
                } else if (c === "m" && code.length > 0) {
                    applyCode();
                    escapeState = "text";
                }
        }
    }
    return spans;
}
