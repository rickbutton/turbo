// from https://github.com/microsoft/vscode-chrome-debug-core/blob/master/src/utils.ts

// TODO: turbo.env.caseInsensitive() ???
const CASE_INSENSITIVE_PATHS = false;

/**
 * Modify a url/path either from the client or the target to a common format for comparing.
 * The client can handle urls in this format too.
 * file:///D:\\scripts\\code.js => d:/scripts/code.js
 * file:///Users/me/project/code.js => /Users/me/project/code.js
 * c:/scripts/code.js => c:\\scripts\\code.js
 * http://site.com/scripts/code.js => (no change)
 * http://site.com/ => http://site.com
 */
export function canonicalizeUrl(urlOrPath: string): string {
    if (urlOrPath == null) {
        return urlOrPath;
    }
    urlOrPath = fileUrlToPath(urlOrPath);

    // Remove query params
    if (urlOrPath.indexOf("?") >= 0) {
        urlOrPath = urlOrPath.split("?")[0];
    }

    urlOrPath = stripTrailingSlash(urlOrPath);
    urlOrPath = fixDriveLetterAndSlashes(urlOrPath);
    if (!CASE_INSENSITIVE_PATHS) {
        urlOrPath = normalizeIfFSIsCaseInsensitive(urlOrPath);
    }

    return urlOrPath;
}

function normalizeIfFSIsCaseInsensitive(urlOrPath: string): string {
    return isWindowsFilePath(urlOrPath) ? urlOrPath.toLowerCase() : urlOrPath;
}

function isWindowsFilePath(candidate: string): boolean {
    return !!candidate.match(/[A-z]:[\\\/][^\\\/]/);
}

export function isFileUrl(candidate: string): boolean {
    return candidate.startsWith("file:///");
}

/**
 * If urlOrPath is a file URL, removes the 'file:///', adjusting for platform differences
 */
export function fileUrlToPath(urlOrPath: string): string {
    if (isFileUrl(urlOrPath)) {
        urlOrPath = urlOrPath.replace("file:///", "");
        urlOrPath = decodeURIComponent(urlOrPath);
        if (urlOrPath[0] !== "/" && !urlOrPath.match(/^[A-Za-z]:/)) {
            // If it has a : before the first /, assume it's a windows path or url.
            // Ensure unix-style path starts with /, it can be removed when file:/// was stripped.
            // Don't add if the url still has a protocol
            urlOrPath = "/" + urlOrPath;
        }

        urlOrPath = fixDriveLetterAndSlashes(urlOrPath);
    }

    return urlOrPath;
}

export function fileUrlToNetworkPath(urlOrPath: string): string {
    if (isFileUrl(urlOrPath)) {
        urlOrPath = urlOrPath.replace("file:///", "\\\\");
        urlOrPath = urlOrPath.replace(/\//g, "\\");
        urlOrPath = urlOrPath = decodeURIComponent(urlOrPath);
    }

    return urlOrPath;
}

/**
 * Replace any backslashes with forward slashes
 * blah\something => blah/something
 */
export function forceForwardSlashes(aUrl: string): string {
    return aUrl
        .replace(/\\\//g, "/") // Replace \/ (unnecessarily escaped forward slash)
        .replace(/\\/g, "/");
}

/**
 * Ensure lower case drive letter and \ on Windows
 */
export function fixDriveLetterAndSlashes(
    aPath: string,
    uppercaseDriveLetter = false,
): string {
    if (!aPath) return aPath;

    aPath = fixDriveLetter(aPath, uppercaseDriveLetter);
    if (aPath.match(/file:\/\/\/[A-Za-z]:/)) {
        const prefixLen = "file:///".length;
        aPath =
            aPath.substr(0, prefixLen + 1) +
            aPath.substr(prefixLen + 1).replace(/\//g, "\\");
    } else if (aPath.match(/^[A-Za-z]:/)) {
        aPath = aPath.replace(/\//g, "\\");
    }

    return aPath;
}

export function fixDriveLetter(
    aPath: string,
    uppercaseDriveLetter = false,
): string {
    if (!aPath) return aPath;

    if (aPath.match(/file:\/\/\/[A-Za-z]:/)) {
        const prefixLen = "file:///".length;
        aPath =
            "file:///" +
            aPath[prefixLen].toLowerCase() +
            aPath.substr(prefixLen + 1);
    } else if (aPath.match(/^[A-Za-z]:/)) {
        // If the path starts with a drive letter, ensure lowercase. VS Code uses a lowercase drive letter
        const driveLetter = uppercaseDriveLetter
            ? aPath[0].toUpperCase()
            : aPath[0].toLowerCase();
        aPath = driveLetter + aPath.substr(1);
    }

    return aPath;
}

/**
 * Remove a slash of any flavor from the end of the path
 */
export function stripTrailingSlash(aPath: string): string {
    return aPath.replace(/\/$/, "").replace(/\\$/, "");
}
