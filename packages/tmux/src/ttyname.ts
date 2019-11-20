import * as ffi from "ffi";
import * as os from "os";
import * as constants from "constants";

const errors = (os.constants && os.constants.errno) || constants;

const lib = ffi.Library("", {
    ttyname_r: ["int", ["int", "pointer", "size_t"]], //eslint-disable-line @typescript-eslint/camelcase
});

export function ttyname(fd?: number): string {
    if (fd === undefined) {
        fd = 0;
    }

    let buf = Buffer.alloc(256);

    while (true) {
        const ret = lib.ttyname_r(fd, buf, buf.length);
        if (ret === 0) {
            let end = buf.indexOf
                ? buf.indexOf(0)
                : Array.prototype.slice.call(buf).indexOf(0);

            if (end === -1) {
                end = buf.length;
            }

            return buf.toString("utf8", 0, end);
        } else {
            const errno = ffi.errno();
            if (errno === errors.ERANGE) {
                buf = Buffer.alloc(buf.length * 2);
                continue;
            }

            let error: Error;
            if (errno === errors.ENOTTY) {
                error = new Error("ttyname_r: Not a TTY");
            } else if (errno === errors.EBADF) {
                error = new Error("ttyname_r: Not a valid file descriptor");
            } else {
                error = new Error("ttyname_r: Unknown error: " + errno);
            }

            throw error;
        }
    }
}
